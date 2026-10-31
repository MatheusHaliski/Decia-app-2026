package br.gov.pr.secid.workstation.application.messaging;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.StoredConversation;
import br.gov.pr.secid.workstation.application.messaging.ConversationRepositoryPort.UnreadTotals;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.Guard;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversation;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessageRecord;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Mensagens diretas reais (RF46; auditoria 17/10/2026, Onda 7). Conversas 1:1 ou em grupo pequeno entre pessoas ATIVAS da MESMA empresa;
 * a conversa 1:1 de um par é única (reaproveitada, nunca duplicada). Só participantes que não saíram leem e escrevem — quem não participa
 * recebe o mesmo 404 de uma conversa inexistente. Texto puro com limite (nunca HTML: o front mostra como texto, links inclusive); a
 * pessoa edita e apaga só as próprias mensagens, e apagar zera o texto e deixa a marca "mensagem removida". Leitura por participante
 * ({@code lastReadAt}), não lidas por conversa e no total, leitura incremental por {@code since} para o polling leve do front.
 *
 * <p><b>Notificação MENSAGEM_DIRETA agrupada:</b> cada destinatário tem no máximo UMA notificação não lida por (remetente, conversa). Uma
 * nova mensagem só gera notificação se a anterior do mesmo remetente naquela conversa já foi lida — no sino ou ao ler a conversa, que marca
 * como lidas as notificações dela. Nenhum texto de mensagem vai para notificação, log ou auditoria (só ids e contagens).
 *
 * <p>Anonimização ({@link #purge}): o texto de todas as mensagens da pessoa é zerado (fica "mensagem removida") e ela sai de todas as
 * conversas.
 */
@Service
public class ConversationService {
    public static final int MAX_BODY = 4000;
    public static final int MAX_TITLE = 160;
    /** Participantes de uma conversa, contando quem inicia (grupo pequeno). */
    public static final int MAX_PARTICIPANTS = 10;
    static final int MAX_LIST = 100;
    static final int MAX_PAGE = 100;
    static final int MAX_CHANGES = 200;
    static final int PREVIEW = 140;
    /** Janela de sobreposição da leitura incremental: cobre transações confirmadas fora de ordem (o front deduplica por id). */
    static final Duration SINCE_OVERLAP = Duration.ofSeconds(5);
    static final int SEND_LIMIT = 30;
    static final Duration SEND_WINDOW = Duration.ofMinutes(1);
    static final String RATE_BUCKET = "dm-send";

    public static final String PARTICIPANTE_INDISPONIVEL = "PARTICIPANTE_INDISPONIVEL";
    public static final String GRUPO_GRANDE = "GRUPO_GRANDE";
    public static final String MENSAGEM_VAZIA = "MENSAGEM_VAZIA";
    public static final String MENSAGEM_LONGA = "MENSAGEM_LONGA";
    public static final String MENSAGEM_APAGADA = "MENSAGEM_APAGADA";
    public static final String CONVERSA_SEM_DESTINATARIO = "CONVERSA_SEM_DESTINATARIO";
    public static final String SAIR_SO_DE_GRUPO = "SAIR_SO_DE_GRUPO";
    public static final String CURSOR_INVALIDO = "CURSOR_INVALIDO";

    /** Ações do audit_log desta área (só ids e contagens, nunca o texto). */
    public static final String AUDIT_STARTED = "CONVERSATION_STARTED";
    public static final String AUDIT_LEFT = "CONVERSATION_LEFT";
    public static final String AUDIT_MESSAGE_EDITED = "DIRECT_MESSAGE_EDITED";
    public static final String AUDIT_MESSAGE_DELETED = "DIRECT_MESSAGE_DELETED";

    static final String RESOURCE = "conversation";

    private final ConversationRepositoryPort repo;
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final NotificationService notifications;
    private final AuditLogPort audit;
    private final RateLimitPort rateLimit;
    private final Clock clock;

    public ConversationService(ConversationRepositoryPort repo, UserRepositoryPort users, ResourceAuthorizer authorizer,
                               NotificationService notifications, AuditLogPort audit, RateLimitPort rateLimit, Clock clock) {
        this.repo = repo;
        this.users = users;
        this.authorizer = authorizer;
        this.notifications = notifications;
        this.audit = audit;
        this.rateLimit = rateLimit;
        this.clock = clock;
    }

    // ------------------------------------------------------------------------------------------------ projeções

    /** Pessoa da conversa: identidade pública mínima; {@code active} = ainda está na conversa. */
    public record ParticipantView(UUID id, String username, String name, String avatarUrl, boolean self, boolean active) {
    }

    /** Última mensagem para a lista: trecho do texto (nulo se apagada). */
    public record LastMessageView(UUID id, UUID authorId, String preview, boolean deleted, Instant sentAt) {
    }

    public record ConversationView(UUID id, ConversationKind kind, String title, List<ParticipantView> participants, LastMessageView lastMessage,
                                   long unread, Instant lastActivityAt, boolean canSend) {
    }

    /** Mensagem: {@code body} nulo quando apagada. */
    public record MessageView(UUID id, UUID conversationId, UUID authorId, String body, boolean mine, boolean edited, boolean deleted,
                              Instant sentAt, Instant editedAt, Instant changedAt) {
    }

    /** Página por cursor (mais recentes primeiro); {@code nextCursor} nulo = não há mais antigas. */
    public record MessagePage(List<MessageView> items, String nextCursor, Instant serverTime) {
    }

    /** Mudanças desde {@code since}, em ordem; {@code truncated} = havia mais que o teto (o front relê a primeira página). */
    public record MessageChanges(List<MessageView> items, Instant serverTime, boolean truncated) {
    }

    public record UnreadSummary(long conversations, long messages) {
    }

    /** Resultado de iniciar: {@code created} = conversa nova (201); falso = 1:1 que já existia (200). */
    public record Started(ConversationView conversation, boolean created) {
    }

    /** Contagens da anonimização (vão ao log como números). */
    public record Purged(int messages, int conversations) {
    }

    // ------------------------------------------------------------------------------------------------ conversas

    /**
     * Inicia uma conversa com as pessoas escolhidas (fora quem pede). Uma pessoa → DIRETA (reaproveita a do par); duas ou mais → GRUPO
     * (título opcional). Pessoa inexistente, de outra empresa ou com conta não ativa → a MESMA recusa 422, sem dizer qual nem por quê.
     */
    @Transactional
    public Started start(CurrentUser actor, List<UUID> participantIds, String title, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        User me = account(actor);
        Guard.requireNotDeletionScheduled(me);
        Set<UUID> others = new LinkedHashSet<>();
        if (participantIds != null) {
            participantIds.stream().filter(Objects::nonNull).filter(id -> !id.equals(actor.id())).forEach(others::add);
        }
        if (others.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Escolha ao menos uma pessoa para conversar.",
                    Map.of("fields", Map.of("participantIds", "Escolha ao menos uma pessoa.")));
        }
        if (others.size() + 1 > MAX_PARTICIPANTS) {
            throw ApiException.unprocessable(GRUPO_GRANDE, "Um grupo tem no máximo " + MAX_PARTICIPANTS + " pessoas.",
                    Map.of("max", MAX_PARTICIPANTS));
        }
        UUID company = viewer.companyId();
        for (UUID id : others) {
            User u = users.findById(id).orElse(null);
            if (company == null || u == null || u.getStatus() != AccountStatus.ACTIVE || !company.equals(u.getCompanyId())) {
                throw ApiException.unprocessable(PARTICIPANTE_INDISPONIVEL, "Não é possível conversar com uma ou mais pessoas escolhidas.", Map.of());
            }
        }
        Instant now = now();
        List<UUID> everyone = new ArrayList<>();
        everyone.add(actor.id());
        everyone.addAll(others);
        if (others.size() == 1) {
            String key = pairKey(actor.id(), others.iterator().next());
            Optional<UUID> existing = repo.pairConversation(key, false);
            if (existing.isPresent()) {
                return new Started(viewOf(actor.id(), existing.get()), false);
            }
            StoredConversation created = repo.create(company, ConversationKind.DIRETA, null, actor.id(), everyone, now);
            UUID id = created.conversation().id();
            if (!repo.claimPair(key, id)) {
                // outra pessoa do par criou ao mesmo tempo: desfaz a nossa e devolve a dela
                repo.delete(id);
                UUID winner = repo.pairConversation(key, true)
                        .orElseThrow(() -> ApiException.conflict(ApiException.CONFLITO, "Tente iniciar a conversa de novo."));
                return new Started(viewOf(actor.id(), winner), false);
            }
            auditStarted(actor, id, ConversationKind.DIRETA, everyone.size(), ctx);
            return new Started(viewOf(actor.id(), id), true);
        }
        String clean = title == null ? null : stripControls(title).strip();
        if (clean != null && clean.length() > MAX_TITLE) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.",
                    Map.of("fields", Map.of("title", "Até " + MAX_TITLE + " caracteres.")));
        }
        StoredConversation created = repo.create(company, ConversationKind.GRUPO, clean == null || clean.isEmpty() ? null : clean, actor.id(),
                everyone, now);
        UUID id = created.conversation().id();
        auditStarted(actor, id, ConversationKind.GRUPO, everyone.size(), ctx);
        return new Started(viewOf(actor.id(), id), true);
    }

    /** Minhas conversas por atividade (última mensagem), com a última mensagem e as não lidas de cada uma. */
    @Transactional(readOnly = true)
    public List<ConversationView> list(CurrentUser actor, int limit) {
        authorizer.viewer(actor);
        List<StoredConversation> mine = repo.activeOf(actor.id(), Math.max(1, Math.min(limit, MAX_LIST)));
        return views(actor.id(), mine);
    }

    @Transactional(readOnly = true)
    public ConversationView get(CurrentUser actor, UUID conversationId) {
        Ctx c = participant(actor, conversationId);
        return views(actor.id(), List.of(c.conversation())).get(0);
    }

    @Transactional(readOnly = true)
    public UnreadSummary unread(CurrentUser actor) {
        authorizer.viewer(actor);
        UnreadTotals t = repo.unreadTotals(actor.id());
        return new UnreadSummary(t.conversations(), t.messages());
    }

    /** Marca a conversa como lida até a última mensagem (e as notificações dela); devolve os totais novos para o contador. */
    @Transactional
    public UnreadSummary markRead(CurrentUser actor, UUID conversationId) {
        Ctx c = participant(actor, conversationId);
        Instant last = c.conversation().conversation().lastMessageAt();
        DirectConversationParticipant p = c.me();
        if (last != null && (p.lastReadAt() == null || p.lastReadAt().isBefore(last))) {
            repo.saveParticipant(new DirectConversationParticipant(p.id(), p.conversationId(), p.userId(), p.joinedAt(), p.leftAt(), last));
        }
        repo.markMessageNotificationsRead(actor.id(), groupKey(conversationId), now());
        UnreadTotals t = repo.unreadTotals(actor.id());
        return new UnreadSummary(t.conversations(), t.messages());
    }

    /** Sai de um grupo (a conversa 1:1 não tem saída). Depois disso a conversa responde 404 para quem saiu. */
    @Transactional
    public void leave(CurrentUser actor, UUID conversationId, RequestContext ctx) {
        Ctx c = participant(actor, conversationId);
        if (c.conversation().conversation().kind() != ConversationKind.GRUPO) {
            throw ApiException.unprocessable(SAIR_SO_DE_GRUPO, "Só é possível sair de conversas em grupo.", Map.of());
        }
        Instant now = now();
        DirectConversationParticipant p = c.me();
        repo.saveParticipant(new DirectConversationParticipant(p.id(), p.conversationId(), p.userId(), p.joinedAt(), now, p.lastReadAt()));
        repo.markMessageNotificationsRead(actor.id(), groupKey(conversationId), now);
        audit.record(AuditEvent.of(actor.id(), AUDIT_LEFT, RESOURCE, conversationId.toString(), AuditEvent.OK, ip(ctx), ua(ctx), Map.of()));
    }

    // ------------------------------------------------------------------------------------------------ mensagens

    /** Página de mensagens por cursor ({@code before} = {@code nextCursor} da página anterior), mais recentes primeiro. */
    @Transactional(readOnly = true)
    public MessagePage messages(CurrentUser actor, UUID conversationId, String before, int limit) {
        participant(actor, conversationId);
        Instant cursor = parseInstant(before, "before");
        int size = Math.max(1, Math.min(limit, MAX_PAGE));
        Instant serverTime = now();
        List<DirectMessageRecord> rows = repo.page(conversationId, cursor, size + 1);
        boolean more = rows.size() > size;
        List<DirectMessageRecord> page = more ? rows.subList(0, size) : rows;
        String next = more ? page.get(page.size() - 1).sentAt().toString() : null;
        return new MessagePage(page.stream().map(m -> view(m, actor.id())).toList(), next, serverTime);
    }

    /** Leitura incremental do polling: novas, editadas e apagadas desde {@code since} (o {@code serverTime} da leitura anterior). */
    @Transactional(readOnly = true)
    public MessageChanges changes(CurrentUser actor, UUID conversationId, String since) {
        participant(actor, conversationId);
        Instant from = parseInstant(since, "since");
        if (from == null) {
            throw ApiException.unprocessable(CURSOR_INVALIDO, "Informe desde quando ler as mudanças.", Map.of("param", "since"));
        }
        Instant serverTime = now();
        List<DirectMessageRecord> rows = repo.changedSince(conversationId, from.minus(SINCE_OVERLAP), MAX_CHANGES + 1);
        boolean truncated = rows.size() > MAX_CHANGES;
        List<DirectMessageRecord> list = truncated ? rows.subList(0, MAX_CHANGES) : rows;
        return new MessageChanges(list.stream().map(m -> view(m, actor.id())).toList(), serverTime, truncated);
    }

    /** Envia texto puro (até {@value #MAX_BODY} caracteres) e avisa os outros participantes (notificação agrupada). */
    @Transactional
    public MessageView send(CurrentUser actor, UUID conversationId, String body) {
        Ctx c = participant(actor, conversationId);
        Guard.requireNotDeletionScheduled(account(actor));
        String text = cleanBody(body);
        List<DirectConversationParticipant> all = repo.participants(List.of(conversationId));
        Set<UUID> others = all.stream().filter(p -> p.leftAt() == null && !p.userId().equals(actor.id()))
                .map(DirectConversationParticipant::userId).collect(Collectors.toCollection(LinkedHashSet::new));
        if (others.isEmpty()) {
            throw ApiException.unprocessable(CONVERSA_SEM_DESTINATARIO, "Não há mais ninguém nesta conversa para receber a mensagem.", Map.of());
        }
        if (!rateLimit.tryAcquire(actor.id(), RATE_BUCKET, SEND_LIMIT, SEND_WINDOW)) {
            long retry = rateLimit.status(actor.id(), RATE_BUCKET, SEND_LIMIT, SEND_WINDOW).retryAfterSeconds(clock.instant());
            throw ApiException.tooMany("Muitas mensagens em pouco tempo. Aguarde um instante.", Map.of("retryAfterSeconds", retry));
        }
        Instant sentAt = repo.reserveSentAt(conversationId, now());
        DirectMessageRecord m = new DirectMessageRecord(UUID.randomUUID(), conversationId, actor.id(), text, sentAt, null, null, sentAt);
        repo.insertMessage(m);
        // quem escreve leu a conversa até aqui
        DirectConversationParticipant me = c.me();
        repo.saveParticipant(new DirectConversationParticipant(me.id(), me.conversationId(), me.userId(), me.joinedAt(), me.leftAt(), sentAt));
        notifyOthers(actor.id(), c.conversation().conversation(), others);
        return view(m, actor.id());
    }

    /** Edita a própria mensagem (marca "editada"); mensagem de outra pessoa → 403; apagada → 409. */
    @Transactional
    public MessageView edit(CurrentUser actor, UUID conversationId, UUID messageId, String body, RequestContext ctx) {
        participant(actor, conversationId);
        Guard.requireNotDeletionScheduled(account(actor));
        DirectMessageRecord m = ownMessage(actor, conversationId, messageId);
        if (m.deleted()) {
            throw ApiException.conflict(MENSAGEM_APAGADA, "Esta mensagem foi removida e não pode ser editada.");
        }
        String text = cleanBody(body);
        if (text.equals(m.body())) {
            return view(m, actor.id());
        }
        Instant now = now();
        DirectMessageRecord edited = new DirectMessageRecord(m.id(), m.conversationId(), m.authorId(), text, m.sentAt(), now, null, now);
        repo.updateMessage(edited);
        audit.record(AuditEvent.of(actor.id(), AUDIT_MESSAGE_EDITED, RESOURCE, conversationId.toString(), AuditEvent.OK, ip(ctx), ua(ctx),
                Map.of("messageId", messageId.toString())));
        return view(edited, actor.id());
    }

    /** Apaga a própria mensagem: o texto some, fica a marca "mensagem removida" (idempotente). */
    @Transactional
    public MessageView delete(CurrentUser actor, UUID conversationId, UUID messageId, RequestContext ctx) {
        participant(actor, conversationId);
        DirectMessageRecord m = ownMessage(actor, conversationId, messageId);
        if (m.deleted()) {
            return view(m, actor.id());
        }
        Instant now = now();
        DirectMessageRecord removed = new DirectMessageRecord(m.id(), m.conversationId(), m.authorId(), null, m.sentAt(), m.editedAt(), now, now);
        repo.updateMessage(removed);
        audit.record(AuditEvent.of(actor.id(), AUDIT_MESSAGE_DELETED, RESOURCE, conversationId.toString(), AuditEvent.OK, ip(ctx), ua(ctx),
                Map.of("messageId", messageId.toString())));
        return view(removed, actor.id());
    }

    // ------------------------------------------------------------------------------------------------ anonimização

    /** Conta anonimizada: zera o texto das mensagens da pessoa e a tira de todas as conversas. */
    public Purged purge(UUID userId) {
        Instant now = now();
        return new Purged(repo.eraseMessagesOf(userId, now), repo.leaveAll(userId, now));
    }

    // ------------------------------------------------------------------------------------------------ apoio

    private record Ctx(StoredConversation conversation, DirectConversationParticipant me) {
    }

    /** Participante ativo da conversa, na empresa dela; senão o mesmo 404 de uma conversa inexistente. */
    private Ctx participant(CurrentUser actor, UUID conversationId) {
        Viewer viewer = authorizer.viewer(actor);
        StoredConversation c = conversationId == null ? null : repo.findById(conversationId).orElse(null);
        DirectConversationParticipant me = c == null ? null
                : repo.participant(conversationId, actor.id()).filter(p -> p.leftAt() == null).orElse(null);
        boolean ok = me != null && viewer.companyId() != null && viewer.companyId().equals(c.conversation().companyId());
        authorizer.requireConversationParticipant(actor, ok);
        return new Ctx(c, me);
    }

    private User account(CurrentUser actor) {
        return users.findById(actor.id()).orElseThrow(() -> ApiException.unauthorized("Sessão inválida. Faça login novamente."));
    }

    private DirectMessageRecord ownMessage(CurrentUser actor, UUID conversationId, UUID messageId) {
        DirectMessageRecord m = messageId == null ? null
                : repo.findMessage(messageId).filter(x -> x.conversationId().equals(conversationId)).orElse(null);
        if (m == null) {
            throw ApiException.notFound("Mensagem");
        }
        if (!m.authorId().equals(actor.id())) {
            throw ApiException.forbidden("Só quem escreveu pode editar ou apagar a mensagem.");
        }
        return m;
    }

    private void notifyOthers(UUID actorId, DirectConversation c, Set<UUID> others) {
        String key = groupKey(c.id());
        Set<UUID> to = new LinkedHashSet<>();
        for (UUID r : others) {
            if (!repo.hasUnreadMessageNotification(r, actorId, key)) {
                to.add(r);
            }
        }
        if (to.isEmpty()) {
            return;
        }
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("conversationKind", c.kind().name());
        if (c.kind() == ConversationKind.GRUPO && c.title() != null) {
            payload.put("conversationTitle", c.title());
        }
        String title = c.kind() == ConversationKind.GRUPO
                ? (c.title() == null ? "Nova mensagem no grupo" : "Nova mensagem no grupo \"" + c.title() + "\"")
                : "Nova mensagem direta";
        notifications.notifyAbout(to, actorId, null, NotificationType.MENSAGEM_DIRETA, NotificationCategory.SOCIAL, RESOURCE, c.id(), title,
                payload);
    }

    private ConversationView viewOf(UUID viewerId, UUID conversationId) {
        StoredConversation c = repo.findById(conversationId).orElseThrow(() -> ApiException.notFound("Conversa"));
        return views(viewerId, List.of(c)).get(0);
    }

    private List<ConversationView> views(UUID viewerId, List<StoredConversation> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = list.stream().map(s -> s.conversation().id()).toList();
        Map<UUID, List<DirectConversationParticipant>> byConv = new HashMap<>();
        for (DirectConversationParticipant p : repo.participants(ids)) {
            byConv.computeIfAbsent(p.conversationId(), k -> new ArrayList<>()).add(p);
        }
        Map<UUID, DirectMessageRecord> last = repo.lastMessages(ids);
        Map<UUID, Long> unread = repo.unreadCounts(viewerId, ids);
        Map<UUID, Optional<User>> people = new HashMap<>();
        Function<UUID, Optional<User>> person = id -> people.computeIfAbsent(id, users::findById);
        List<ConversationView> out = new ArrayList<>();
        for (StoredConversation s : list) {
            DirectConversation c = s.conversation();
            List<DirectConversationParticipant> parts = new ArrayList<>(byConv.getOrDefault(c.id(), List.of()));
            parts.sort(Comparator.comparing(DirectConversationParticipant::joinedAt).thenComparing(p -> p.userId().toString()));
            List<ParticipantView> pv = parts.stream().map(p -> participantView(p, viewerId, person)).toList();
            boolean canSend = parts.stream().anyMatch(p -> p.leftAt() == null && !p.userId().equals(viewerId));
            DirectMessageRecord lm = last.get(c.id());
            LastMessageView lv = lm == null ? null : new LastMessageView(lm.id(), lm.authorId(), lm.deleted() ? null : preview(lm.body()),
                    lm.deleted(), lm.sentAt());
            out.add(new ConversationView(c.id(), c.kind(), c.title(), pv, lv, unread.getOrDefault(c.id(), 0L), s.lastActivityAt(), canSend));
        }
        return out;
    }

    private static ParticipantView participantView(DirectConversationParticipant p, UUID viewerId, Function<UUID, Optional<User>> person) {
        User u = person.apply(p.userId()).orElse(null);
        String name = u == null ? null : (u.getDisplayName() == null || u.getDisplayName().isBlank() ? u.getFullName() : u.getDisplayName());
        return new ParticipantView(p.userId(), u == null ? null : u.getUsername(), name, u == null ? null : u.getAvatarUrl(),
                p.userId().equals(viewerId), p.leftAt() == null);
    }

    static MessageView view(DirectMessageRecord m, UUID viewerId) {
        return new MessageView(m.id(), m.conversationId(), m.authorId(), m.deleted() ? null : m.body(), m.authorId().equals(viewerId),
                m.editedAt() != null && !m.deleted(), m.deleted(), m.sentAt(), m.deleted() ? null : m.editedAt(), m.changedAt());
    }

    /** Texto puro: tira caracteres de controle (menos quebra de linha e tab), normaliza CRLF, corta espaços nas pontas. */
    static String cleanBody(String body) {
        String text = body == null ? "" : stripControls(body.replace("\r\n", "\n").replace('\r', '\n')).strip();
        if (text.isEmpty()) {
            throw ApiException.unprocessable(MENSAGEM_VAZIA, "Escreva a mensagem antes de enviar.", Map.of("fields", Map.of("body", "Obrigatório.")));
        }
        if (text.codePointCount(0, text.length()) > MAX_BODY) {
            throw ApiException.unprocessable(MENSAGEM_LONGA, "A mensagem passa de " + MAX_BODY + " caracteres.", Map.of("max", MAX_BODY));
        }
        return text;
    }

    static String stripControls(String s) {
        StringBuilder b = new StringBuilder(s.length());
        s.codePoints().filter(cp -> cp == '\n' || cp == '\t' || !Character.isISOControl(cp)).forEach(b::appendCodePoint);
        return b.toString();
    }

    static String preview(String body) {
        if (body == null) {
            return null;
        }
        String flat = body.replaceAll("\\s+", " ").strip();
        if (flat.codePointCount(0, flat.length()) <= PREVIEW) {
            return flat;
        }
        return flat.substring(0, flat.offsetByCodePoints(0, PREVIEW - 1)) + "…";
    }

    /** Chave do par 1:1, independente da ordem: menorId:maiorId. */
    static String pairKey(UUID a, UUID b) {
        String x = a.toString();
        String y = b.toString();
        return x.compareTo(y) <= 0 ? x + ":" + y : y + ":" + x;
    }

    static String groupKey(UUID conversationId) {
        return RESOURCE + ":" + conversationId;
    }

    private static Instant parseInstant(String raw, String param) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw.strip());
        } catch (RuntimeException e) {
            throw ApiException.unprocessable(CURSOR_INVALIDO, "Cursor inválido.", Map.of("param", param));
        }
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }

    private void auditStarted(CurrentUser actor, UUID id, ConversationKind kind, int participants, RequestContext ctx) {
        audit.record(AuditEvent.of(actor.id(), AUDIT_STARTED, RESOURCE, id.toString(), AuditEvent.OK, ip(ctx), ua(ctx),
                Map.of("kind", kind.name(), "participants", participants)));
    }

    private static String ip(RequestContext ctx) {
        return ctx == null ? null : ctx.ip();
    }

    private static String ua(RequestContext ctx) {
        return ctx == null ? null : ctx.userAgent();
    }
}
