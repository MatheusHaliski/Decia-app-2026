package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorAccount;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorOAuthState;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Portas falsas dos conectores (memória) e do provedor (comportamento programável) para os testes de serviço. */
final class ConnectorFakes {

    private ConnectorFakes() {
    }

    static byte[] pdf() {
        return "%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);
    }

    static byte[] docx() {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bos)) {
            for (String name : List.of("[Content_Types].xml", "_rels/.rels", "word/document.xml")) {
                z.putNextEntry(new ZipEntry(name));
                z.write("<x/>".getBytes(StandardCharsets.UTF_8));
                z.closeEntry();
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return bos.toByteArray();
    }

    /** Cifra falsa e reversível que, como a real, amarra o valor ao contexto (abrir em outro contexto falha). */
    static final class Cipher implements TokenCipherPort {
        boolean available = true;

        @Override
        public String seal(String plaintext, String context) {
            return "sealed:" + b64(context) + ":" + b64(new StringBuilder(plaintext).reverse().toString());
        }

        @Override
        public String open(String sealed, String context) {
            String[] p = sealed == null ? new String[0] : sealed.split(":");
            if (p.length != 3 || !p[0].equals("sealed") || !p[1].equals(b64(context))) {
                throw new IllegalStateException("não abre");
            }
            return new StringBuilder(new String(Base64.getDecoder().decode(p[2]), StandardCharsets.UTF_8)).reverse().toString();
        }

        @Override
        public boolean available() {
            return available;
        }

        private static String b64(String s) {
            return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
        }
    }

    /** Lado OAuth programável: cada chamada registrada; respostas trocáveis por teste. */
    static final class OAuth implements OAuthClientPort {
        final ConnectorProvider provider;
        final List<String> calls = new ArrayList<>();
        final List<String> revoked = new ArrayList<>();
        Function<String, TokenGrant> onExchange;
        Function<String, TokenGrant> onRefresh;
        Function<String, ExternalProfile> onProfile;
        int refreshes;

        OAuth(ConnectorProvider provider, String subject, java.util.Set<String> scopes) {
            this.provider = provider;
            onExchange = code -> new TokenGrant("access-" + code, "refresh-" + code, 3600, scopes);
            onRefresh = rt -> new TokenGrant("access-renovado-" + (++refreshes), provider == ConnectorProvider.MICROSOFT ? "refresh-girado" : null,
                    3600, scopes);
            onProfile = token -> new ExternalProfile(subject, "pessoa@exemplo.gov.br");
        }

        @Override
        public ConnectorProvider provider() {
            return provider;
        }

        @Override
        public String authorizationUrl(String state, String codeChallenge) {
            return "https://idp.example/" + provider + "/authorize?state=" + state + "&code_challenge=" + codeChallenge;
        }

        @Override
        public TokenGrant exchange(String code, String codeVerifier) {
            calls.add("exchange:" + code + ":" + codeVerifier);
            return onExchange.apply(code);
        }

        @Override
        public TokenGrant refresh(String refreshToken) {
            calls.add("refresh:" + refreshToken);
            return onRefresh.apply(refreshToken);
        }

        @Override
        public ExternalProfile profile(String accessToken) {
            calls.add("profile:" + accessToken);
            return onProfile.apply(accessToken);
        }

        @Override
        public boolean revoke(String token) {
            revoked.add(token);
            return provider == ConnectorProvider.GOOGLE;
        }
    }

    /** Documentos programáveis: itens por id; quem chamou com qual token; falha injetável por chamada. */
    static final class Docs implements ExternalDocPort {
        final ConnectorProvider provider;
        final Map<String, RemoteItem> items = new LinkedHashMap<>();
        final Map<String, byte[]> originals = new LinkedHashMap<>();
        final List<String> tokens = new ArrayList<>();
        final List<String> downloads = new ArrayList<>();
        Function<String, RuntimeException> failure = token -> null;
        byte[] pdf = pdf();
        boolean pdfRejected;

        Docs(ConnectorProvider provider) {
            this.provider = provider;
        }

        @Override
        public ConnectorProvider provider() {
            return provider;
        }

        private void check(String token) {
            tokens.add(token);
            RuntimeException e = failure.apply(token);
            if (e != null) {
                throw e;
            }
        }

        @Override
        public RemotePage list(String accessToken, String query, String pageToken, int pageSize) {
            check(accessToken);
            List<RemoteItem> found = items.values().stream()
                    .filter(i -> query.isEmpty() || (i.name() != null && i.name().toLowerCase().contains(query.toLowerCase())))
                    .limit(pageSize).toList();
            return new RemotePage(found, found.size() == pageSize ? "pagina-2" : null);
        }

        @Override
        public RemoteItem get(String accessToken, String externalId) {
            check(accessToken);
            RemoteItem i = items.get(externalId);
            if (i == null) {
                throw new ProviderException(ProviderException.Kind.NOT_FOUND, 404, "item não encontrado");
            }
            return i;
        }

        @Override
        public RemoteContent download(String accessToken, RemoteItem item, boolean asPdf, long maxBytes) {
            check(accessToken);
            downloads.add((asPdf ? "pdf:" : "original:") + item.externalId());
            if (asPdf && pdfRejected) {
                throw new ProviderException(ProviderException.Kind.REJECTED, 406, "conversão recusada");
            }
            byte[] b = asPdf ? pdf : originals.getOrDefault(item.externalId(), pdf());
            if (b.length > maxBytes) {
                throw new ProviderException(ProviderException.Kind.TOO_LARGE, 200, "grande");
            }
            return new RemoteContent(b, asPdf ? "application/pdf" : item.mimeType());
        }
    }

    static final class Accounts implements ConnectorAccountRepositoryPort {
        final Map<UUID, ConnectorAccount> rows = new LinkedHashMap<>();
        final List<ConnectorAccount> history = new ArrayList<>();

        @Override
        public Optional<ConnectorAccount> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public List<ConnectorAccount> findByOwner(UUID ownerId) {
            return rows.values().stream().filter(a -> a.ownerId().equals(ownerId))
                    .sorted(Comparator.comparing(ConnectorAccount::connectedAt).reversed()).toList();
        }

        @Override
        public Optional<ConnectorAccount> findByOwnerAndSubject(UUID ownerId, ConnectorProvider provider, String externalSubject) {
            return rows.values().stream().filter(a -> a.ownerId().equals(ownerId) && a.provider() == provider
                    && a.externalSubject().equals(externalSubject)).findFirst();
        }

        @Override
        public ConnectorAccount save(ConnectorAccount a) {
            ConnectorAccount saved = a.id() != null ? a : new ConnectorAccount(UUID.randomUUID(), a.ownerId(), a.provider(), a.externalSubject(),
                    a.accountEmail(), a.scopes(), a.status(), a.accessTokenSealed(), a.refreshTokenSealed(), a.accessExpiresAt(), a.connectedAt(),
                    a.lastUsedAt(), a.lastError());
            rows.put(saved.id(), saved);
            history.add(saved);
            return saved;
        }

        @Override
        public void delete(UUID id) {
            rows.remove(id);
        }
    }

    static final class States implements ConnectorOAuthStateRepositoryPort {
        final Map<String, ConnectorOAuthState> rows = new LinkedHashMap<>();

        @Override
        public void insert(ConnectorOAuthState state) {
            rows.put(state.stateHash(), state);
        }

        @Override
        public Optional<ConnectorOAuthState> consume(String stateHash) {
            return Optional.ofNullable(rows.remove(stateHash));
        }

        @Override
        public int purgeExpired(Instant now) {
            int before = rows.size();
            rows.values().removeIf(s -> s.expired(now));
            return before - rows.size();
        }
    }

    static final class Links implements TaskExternalLinkRepositoryPort {
        final Map<UUID, TaskExternalLink> rows = new LinkedHashMap<>();

        @Override
        public TaskExternalLink insert(TaskExternalLink link) {
            rows.put(link.taskId(), link);
            return link;
        }

        @Override
        public Optional<TaskExternalLink> findByTask(UUID taskId) {
            return Optional.ofNullable(rows.get(taskId));
        }
    }

    static final class Attachments implements TaskAttachmentRepositoryPort {
        final List<TaskAttachment> rows = new ArrayList<>();

        @Override
        public TaskAttachment insert(TaskAttachment a) {
            TaskAttachment saved = new TaskAttachment(UUID.randomUUID(), a.taskId(), a.mediaObjectId(), a.fileName(), a.mimeType(), a.sizeBytes(),
                    a.sha256(), a.antivirusStatus(), a.ocrStatus(), a.ocrTextRef(), a.isPrimary(), a.sortOrder());
            rows.add(saved);
            return saved;
        }

        @Override
        public List<TaskAttachment> findByTask(UUID taskId) {
            return rows.stream().filter(a -> a.taskId().equals(taskId)).toList();
        }

        @Override
        public List<TaskAttachmentRepositoryPort.StoredAttachment> listByTask(UUID taskId) {
            return findByTask(taskId).stream().map(a -> new TaskAttachmentRepositoryPort.StoredAttachment(a, Instant.EPOCH)).toList();
        }

        @Override
        public Optional<TaskAttachmentRepositoryPort.StoredAttachment> findById(UUID id) {
            return rows.stream().filter(a -> a.id().equals(id)).findFirst().map(a -> new TaskAttachmentRepositoryPort.StoredAttachment(a, Instant.EPOCH));
        }

        @Override
        public List<TaskAttachmentRepositoryPort.TitledAttachment> listByTaskOwner(UUID ownerId, int limit) {
            return List.of();
        }

        @Override
        public long countByMedia(UUID mediaObjectId) {
            return rows.stream().filter(a -> a.mediaObjectId().equals(mediaObjectId)).count();
        }

        @Override
        public void delete(UUID id) {
            rows.removeIf(a -> a.id().equals(id));
        }
    }

    /** Tarefas em memória preservando TODOS os campos (inclusive a origem), com id e versão. */
    static final class Tasks implements TaskRepositoryPort {
        final Map<UUID, StoredTask> rows = new LinkedHashMap<>();
        final List<TaskStateLog> logs = new ArrayList<>();
        long tick;

        @Override
        public Optional<StoredTask> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public List<StoredTask> findByOwner(UUID ownerId, int limit) {
            return rows.values().stream().filter(s -> s.task().ownerId().equals(ownerId)).limit(limit).toList();
        }

        @Override
        public List<TaskRepositoryPort.TaskIndexRow> indexByOwner(UUID ownerId, int cap) {
            return findByOwner(ownerId, cap).stream().map(s -> new TaskRepositoryPort.TaskIndexRow(s.task().id(), s.task().title(), s.task().type(),
                    s.task().category(), s.task().priority(), s.task().state(), s.task().dueAt(), s.task().legalDueAt(), s.createdAt(),
                    s.updatedAt())).toList();
        }

        @Override
        public List<StoredTask> findAllById(java.util.Collection<UUID> ids) {
            return ids.stream().map(rows::get).filter(java.util.Objects::nonNull).toList();
        }

        @Override
        public StoredTask insert(TaskItem task, TaskBrief brief) {
            UUID id = UUID.randomUUID();
            Instant at = Instant.parse("2026-11-09T12:00:00Z").plusSeconds(tick++);
            StoredTask s = new StoredTask(withId(task, id), rebind(brief, id), 0, at, at);
            rows.put(id, s);
            return s;
        }

        @Override
        public StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion) {
            StoredTask current = rows.get(task.id());
            StoredTask s = new StoredTask(task, rebind(brief, task.id()), current.version() + 1, current.createdAt(),
                    current.createdAt().plusSeconds(tick++));
            rows.put(task.id(), s);
            return s;
        }

        @Override
        public void appendStateLog(TaskStateLog log) {
            logs.add(log);
        }

        private static TaskBrief rebind(TaskBrief b, UUID id) {
            return b == null ? TaskBrief.empty(id) : new TaskBrief(id, b.objective(), b.area(), b.deliverablesJson(), b.acceptanceCriteriaJson(),
                    b.referencesJson(), b.extensionsJson());
        }

        static TaskItem withId(TaskItem t, UUID id) {
            return new TaskItem(id, t.ownerId(), t.departmentId(), t.title(), t.summary(), t.descriptionMd(), t.type(), t.category(), t.subcategory(),
                    t.processTags(), t.natureTags(), t.accessClass(), t.format(), t.effortSize(), t.estimatedHours(), t.amountInvolved(), t.origin(),
                    t.sourceKind(), t.sourceRef(), t.linkMode(), t.orgEntityId(), t.responsibleId(), t.dueAt(), t.legalDeadlineRuleId(),
                    t.legalDeadlineBaseDate(), t.legalDueAt(), t.legalOverrideReason(), t.priority(), t.state(), t.blockedByTaskId(),
                    t.blockedByUserId(), t.blockReason(), t.docSituation(), t.receivedAt(), t.senderOrigin(), t.protocolNumber(),
                    t.retentionPolicyJson(), t.visibility(), t.favorite(), t.offeredInCounter(), t.aiGenerated(), t.aiInferenceId(),
                    t.aiConfidenceJson(), t.thumbnailUrl(), t.coverUrl(), t.coverMode(), t.cardSkin(), t.tags(), t.notes(), t.originalTaskId(),
                    t.sourceProjectId(), t.checklistItemId(), t.reuseCount(), t.projectUsageCount(), t.likesCount(), t.commentsCount(),
                    t.savesCount(), t.sharesCount(), t.remixesCount(), t.viewsCount(), t.sealIdsJson());
        }
    }
}
