package br.gov.pr.secid.workstation.application.notifications;

import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort.StoredNotification;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.security.AccessPolicy;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Notificações reais (RF27; auditoria 17/10/2026, achado "sino com dados fixos"). Leitura e marcação só da própria pessoa (outra pessoa →
 * o mesmo 404 de um id inexistente). Produtores: tarefa com responsável definido por outra pessoa, mudança de estado da tarefa (dono e
 * responsável, menos quem fez) e eventos de segurança da própria conta (2FA). Uma notificação de recurso só nasce para quem pode VER o
 * recurso naquele momento (AccessPolicy), e nunca para conta não ativa. O texto final é montado no front pelo tipo e pelo payload, no
 * idioma da pessoa; o título em português fica gravado como reserva.
 */
@Service
public class NotificationService {
    static final int MAX_LIST = 50;
    static final int MAX_TITLE = 200;
    private static final ObjectMapper JSON = JsonMapper.builder().build();
    private static final String TASK = "task";
    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final NotificationRepositoryPort repo;
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final Clock clock;

    public NotificationService(NotificationRepositoryPort repo, UserRepositoryPort users, ResourceAuthorizer authorizer, Clock clock) {
        this.repo = repo;
        this.users = users;
        this.authorizer = authorizer;
        this.clock = clock;
    }

    /** Projeção para a API. {@code actorName} é o nome exibido de quem causou (nulo = sistema). */
    public record NotificationView(UUID id, NotificationType type, NotificationCategory category, String title, String body, String resourceType,
                                   UUID resourceId, UUID actorId, String actorName, Map<String, String> payload, boolean read, Instant readAt,
                                   Instant createdAt) {
    }

    public record UnreadCount(long count) {
    }

    public record ReadAll(int updated) {
    }

    // ------------------------------------------------------------------------------------------------ leitura

    public List<NotificationView> list(CurrentUser actor, int limit) {
        UUID me = authorizer.ownAccount(actor).getId();
        Map<UUID, String> names = new LinkedHashMap<>();
        return repo.findByRecipient(me, Math.max(1, Math.min(limit, MAX_LIST))).stream().map(s -> view(s, names)).toList();
    }

    public UnreadCount unreadCount(CurrentUser actor) {
        return new UnreadCount(repo.countUnread(authorizer.ownAccount(actor).getId()));
    }

    @Transactional
    public void markRead(CurrentUser actor, UUID id) {
        UUID recipient = id == null ? null : repo.findById(id).map(s -> s.notification().recipientId()).orElse(null);
        authorizer.requireOwnNotification(actor, recipient);
        repo.markRead(actor.id(), id, clock.instant());
    }

    @Transactional
    public ReadAll markAllRead(CurrentUser actor) {
        return new ReadAll(repo.markAllRead(authorizer.ownAccount(actor).getId(), clock.instant()));
    }

    // ------------------------------------------------------------------------------------------------ produtores

    /** Responsável definido por outra pessoa (criação ou edição); só quando muda e o responsável não é quem agiu. */
    public void taskResponsibleSet(UUID actorId, ScopedResource resource, TaskItem task, UUID previousResponsible) {
        UUID responsible = task.responsibleId();
        if (responsible == null || responsible.equals(actorId) || responsible.equals(previousResponsible)) {
            return;
        }
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("taskTitle", task.title());
        sendAboutTask(Set.of(responsible), actorId, resource, task, NotificationType.ATRIBUICAO_PROPOSTA,
                "Você é o responsável pela tarefa \"" + task.title() + "\"", payload);
    }

    /** Mudança de estado: avisa dono e responsável, menos quem fez. Bloqueio leva o motivo. */
    public void taskStateChanged(UUID actorId, ScopedResource resource, TaskState from, TaskItem task, String reason) {
        Set<UUID> to = new LinkedHashSet<>();
        to.add(task.ownerId());
        if (task.responsibleId() != null) {
            to.add(task.responsibleId());
        }
        to.remove(actorId);
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("taskTitle", task.title());
        payload.put("from", from.name());
        payload.put("to", task.state().name());
        if (task.state() == TaskState.BLOQUEADA && reason != null && !reason.isBlank()) {
            payload.put("reason", reason);
        }
        sendAboutTask(to, actorId, resource, task, NotificationType.TRANSICAO,
                "Tarefa \"" + task.title() + "\": " + from.name() + " → " + task.state().name(), payload);
    }

    /** Evento de segurança da própria conta (ex.: 2FA ligado ou desligado), para a pessoa notar se não foi ela. */
    public void accountSecurity(UUID userId, String event) {
        if (authorizer.viewerOf(userId).isEmpty()) {
            return;
        }
        String title = switch (event) {
            case "TWO_FACTOR_ENABLED" -> "Verificação em duas etapas ativada";
            case "TWO_FACTOR_DISABLED" -> "Verificação em duas etapas desativada";
            default -> "Alteração de segurança na sua conta";
        };
        Map<String, String> payload = Map.of("event", event);
        repo.insert(new Notification(UUID.randomUUID(), userId, null, NotificationType.SISTEMA, NotificationCategory.SISTEMA, "account", userId,
                title, null, json(payload), null, false, null, null), clock.instant());
    }

    /**
     * Produtor genérico para outros serviços (projetos, atribuições, mensagens…): avisa cada destinatário, menos quem agiu, que
     * pode VER o recurso agora ({@code resource}; nulo = sem recurso protegido, ex.: conversa já conferida pelo chamador) e tem conta
     * ativa. O texto final é montado no front por {@code type} + {@code payload}; {@code title} é a reserva em português.
     */
    public void notifyAbout(Set<UUID> recipients, UUID actorId, ScopedResource resource, NotificationType type, NotificationCategory category,
                            String resourceType, UUID resourceId, String title, Map<String, String> payload) {
        Instant now = clock.instant();
        String data = json(payload == null ? Map.of() : payload);
        for (UUID recipient : recipients) {
            if (recipient == null || recipient.equals(actorId)) {
                continue;
            }
            boolean canSee = authorizer.viewerOf(recipient).map(v -> resource == null || AccessPolicy.visible(v, resource)).orElse(false);
            if (!canSee) {
                continue;
            }
            repo.insert(new Notification(UUID.randomUUID(), recipient, actorId, type, category, resourceType, resourceId, clip(title), null, data,
                    resourceType == null || resourceId == null ? null : resourceType + ":" + resourceId, false, null, null), now);
        }
    }

    /**
     * Aviso diário de prazo (RF41.CA04; {@code DeadlineReminderJob}): PRAZO_PROXIMO ou PRAZO_VENCIDO para o dono ou o responsável da tarefa,
     * só se a pessoa tem conta ativa e pode VER a tarefa agora, e só uma vez por {@code groupKey} (tarefa + tipo + dia). Sem ator (é o
     * sistema). Payload só com título e datas: {@code taskTitle}, {@code dueAt} (AAAA-MM-DD), {@code days} (dias que faltam, ou há quantos
     * venceu) e {@code source} (TAREFA ou LEGAL). Devolve se gravou.
     */
    public boolean deadlineNotice(UUID recipient, ScopedResource resource, TaskItem task, NotificationType type, LocalDate dueAt, long days,
                                  boolean legal, String groupKey) {
        if (recipient == null || (type != NotificationType.PRAZO_PROXIMO && type != NotificationType.PRAZO_VENCIDO)) {
            return false;
        }
        boolean canSee = authorizer.viewerOf(recipient).map(v -> AccessPolicy.visible(v, resource)).orElse(false);
        if (!canSee || repo.existsByGroupKey(recipient, groupKey)) {
            return false;
        }
        long abs = Math.abs(days);
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("taskTitle", task.title());
        payload.put("dueAt", dueAt.toString());
        payload.put("days", Long.toString(abs));
        payload.put("source", legal ? "LEGAL" : "TAREFA");
        String date = dueAt.format(BR_DATE);
        String what = legal ? "Prazo legal" : "Prazo";
        String title;
        if (type == NotificationType.PRAZO_VENCIDO) {
            title = what + " vencido: \"" + task.title() + "\" venceu em " + date;
        } else if (abs == 0) {
            title = what + " vence hoje: \"" + task.title() + "\" (" + date + ")";
        } else {
            title = what + " próximo: \"" + task.title() + "\" vence em " + abs + (abs == 1 ? " dia" : " dias") + " (" + date + ")";
        }
        repo.insert(new Notification(UUID.randomUUID(), recipient, null, type, NotificationCategory.PRAZO, TASK, task.id(), clip(title), null,
                json(payload), groupKey, false, null, null), clock.instant());
        return true;
    }

    private void sendAboutTask(Set<UUID> recipients, UUID actorId, ScopedResource resource, TaskItem task, NotificationType type, String title,
                               Map<String, String> payload) {
        Instant now = clock.instant();
        for (UUID recipient : recipients) {
            boolean canSee = authorizer.viewerOf(recipient).map(v -> AccessPolicy.visible(v, resource)).orElse(false);
            if (!canSee) {
                continue;
            }
            repo.insert(new Notification(UUID.randomUUID(), recipient, actorId, type, NotificationCategory.SOCIAL, TASK, task.id(),
                    clip(title), null, json(payload), TASK + ":" + task.id(), false, null, null), now);
        }
    }

    // ------------------------------------------------------------------------------------------------ projeção

    private NotificationView view(StoredNotification s, Map<UUID, String> names) {
        Notification n = s.notification();
        String actorName = n.actorId() == null ? null : names.computeIfAbsent(n.actorId(), this::displayName);
        return new NotificationView(n.id(), n.type(), n.category(), n.title(), n.body(), n.resourceType(), n.resourceId(), n.actorId(), actorName,
                payload(n.payloadJson()), n.read(), n.readAt(), s.createdAt());
    }

    private String displayName(UUID userId) {
        return users.findById(userId).map(u -> blank(u.getDisplayName()) ? u.getFullName() : u.getDisplayName()).orElse(null);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String clip(String s) {
        return s.length() <= MAX_TITLE ? s : s.substring(0, MAX_TITLE - 1) + "…";
    }

    private static String json(Map<String, String> payload) {
        return JSON.writeValueAsString(payload);
    }

    private static Map<String, String> payload(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return JSON.readValue(json, new TypeReference<LinkedHashMap<String, String>>() { });
        } catch (RuntimeException e) {
            return Map.of();
        }
    }
}
