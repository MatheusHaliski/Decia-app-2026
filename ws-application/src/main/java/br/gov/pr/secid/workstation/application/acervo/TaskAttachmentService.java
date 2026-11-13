package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.EvidenceRepositoryPort.StoredEvidence;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort.StoredAttachment;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentRepositoryPort.TitledAttachment;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.ImageMetadata;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.InspectedUpload;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.UploadCandidate;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.Evidence;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.acervo.StudioStatus;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Anexos e evidências da tarefa (RF41.CA06). Toda rota com id de tarefa passa pela autorização do recurso ({@link TaskService#authorized}):
 * listar e abrir exigem {@code VIEW}; enviar, marcar e remover exigem {@code EDIT} (dono, responsável ou ADMIN fora de SIGILOSO) e tarefa
 * aberta (409 TAREFA_BLOQUEADA). Invisível responde o mesmo 404 de inexistente; anexo ou evidência de OUTRA tarefa também é 404.
 *
 * <p>O arquivo passa pelo pipeline de mídia (D-67): tipo real pelos magic bytes (nome e Content-Type do cliente só são conferidos, nunca
 * confiados), limite de tamanho, zip-bomb, teto de pixels, antivírus/quarentena e chave segura ({@code restricted/} para RESTRITO e
 * SIGILOSO). Imagens perdem os metadados embutidos ({@link ImageMetadata}: EXIF com GPS, XMP) antes de gravar — a geolocalização da
 * evidência só existe se a pessoa a enviar, e fica cifrada (AES-GCM) no banco. O binário pertence ao dono da tarefa (dedupe e
 * {@code OwnMedia}) e só é apagado quando nenhum anexo ou evidência aponta para ele. Evidência = anexo marcado como prova, com legenda,
 * data da captura e localização opcional; desmarcar não apaga o arquivo; remover o anexo leva a marca junto.
 */
@Service
public class TaskAttachmentService {
    static final int MAX_PER_TASK = 50;
    /** Igual ao {@code spring.servlet.multipart.max-file-size}: acima disso nem chega aqui (413). */
    static final long MAX_BYTES = 15L * 1024 * 1024;
    static final int MAX_CAPTION = 500;
    static final int MAX_MINE = 200;
    static final Set<DetectedType> ACCEPTED = EnumSet.allOf(DetectedType.class);
    static final Set<String> IMAGE_MIMES = Set.of("image/png", "image/jpeg", "image/gif", "image/webp");
    private static final Pattern COORDINATE = Pattern.compile("^-?\\d{1,3}(\\.\\d{1,12})?$");
    private static final Instant OLDEST_CAPTURE = Instant.parse("1990-01-01T00:00:00Z");

    private final TaskService taskService;
    private final TaskAttachmentRepositoryPort attachments;
    private final EvidenceRepositoryPort evidences;
    private final MediaUploadInspector inspector;
    private final MediaUploadService media;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;

    public TaskAttachmentService(TaskService taskService, TaskAttachmentRepositoryPort attachments, EvidenceRepositoryPort evidences,
                                 MediaUploadInspector inspector, MediaUploadService media, ResourceAuthorizer authorizer, AuditLogPort audit,
                                 Clock clock) {
        this.taskService = taskService;
        this.attachments = attachments;
        this.evidences = evidences;
        this.inspector = inspector;
        this.media = media;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
    }

    /**
     * Anexo como a API mostra.
     *
     * @param image       imagem que o navegador exibe (PNG, JPEG, GIF, WEBP)
     * @param scanStatus  varredura do antivírus (NAO_VERIFICADO = ambiente sem motor configurado)
     * @param available   pode ser aberto agora (fora da quarentena)
     * @param evidence    marca de evidência, quando o anexo é prova de execução
     */
    public record AttachmentView(UUID id, UUID taskId, String taskTitle, String fileName, String mimeType, long sizeBytes, boolean image,
                                 boolean primary, MediaScanStatus scanStatus, boolean available, Instant createdAt, EvidenceView evidence) {
    }

    /**
     * Evidência como a API mostra. {@code latitude}/{@code longitude} só vão para quem registrou a evidência ou pode editar a tarefa; os
     * demais veem apenas {@code hasLocation}.
     */
    public record EvidenceView(UUID id, UUID taskId, UUID attachmentId, String caption, Instant takenAt, boolean hasLocation, String latitude,
                               String longitude, UUID ownerId, Instant createdAt) {
    }

    /** Arquivo recebido: bytes e o nome/Content-Type DECLARADOS pelo cliente (só conferidos contra o tipo real). */
    public record FileInput(byte[] content, String fileName, String contentType) {
    }

    /** Dados da evidência como chegam (texto do formulário): validados aqui, todos opcionais; coordenadas só juntas. */
    public record EvidenceInput(String caption, String takenAt, String latitude, String longitude) {
    }

    /** Conteúdo autorizado para download: {@code inline} só para imagem (o resto sai como anexo). */
    public record FileContent(String fileName, String mimeType, byte[] content, boolean inline) {
    }

    private record Parsed(String caption, Instant takenAt, String latitude, String longitude) {
    }

    private record Attached(StoredAttachment stored, boolean existing) {
    }

    // ------------------------------------------------------------------------------------------------ anexos

    public List<AttachmentView> list(CurrentUser actor, UUID taskId) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.VIEW);
        boolean editor = taskService.allows(viewer, stored.task(), ResourceAction.EDIT);
        List<StoredEvidence> ev = evidences.findByTask(taskId);
        return attachments.listByTask(taskId).stream().map(a -> view(a, stored.task().title(), ev, viewer, editor)).toList();
    }

    @Transactional
    public AttachmentView upload(CurrentUser actor, UUID taskId, FileInput file, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskService.requireWritable(stored.task());
        Attached a = attach(stored.task(), file);
        if (a.existing()) {
            throw ApiException.conflict("ANEXO_DUPLICADO", "Este arquivo já está anexado a esta tarefa.");
        }
        TaskAttachment row = a.stored().attachment();
        record(actor, ctx, AuditActions.TASK_ATTACHMENT_ADDED, taskId, Map.of("attachment", row.id().toString(), "mime", row.mimeType(),
                "sizeBytes", row.sizeBytes()));
        return view(a.stored(), stored.task().title(), List.of(), viewer, true);
    }

    @Transactional
    public void remove(CurrentUser actor, UUID taskId, UUID attachmentId, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskService.requireWritable(stored.task());
        StoredAttachment a = ownAttachment(taskId, attachmentId);
        UUID mediaId = a.attachment().mediaObjectId();
        evidences.findByTask(taskId).stream().filter(e -> mediaId.equals(e.evidence().mediaObjectId()))
                .forEach(e -> evidences.delete(e.evidence().id()));
        attachments.delete(attachmentId);
        collect(mediaId);
        record(actor, ctx, AuditActions.TASK_ATTACHMENT_REMOVED, taskId, Map.of("attachment", attachmentId.toString()));
    }

    /** Bytes do anexo: VIEW na tarefa e, na mídia, a regra OwnMedia (RESTRITO/SIGILOSO só o dono e ADMIN) e a quarentena (423). */
    public FileContent content(CurrentUser actor, UUID taskId, UUID attachmentId) {
        Viewer viewer = authorizer.viewer(actor);
        taskService.authorized(viewer, taskId, ResourceAction.VIEW);
        StoredAttachment a = ownAttachment(taskId, attachmentId);
        MediaUploadService.ReadGrant grant = media.authorizeRead(viewer, a.attachment().mediaObjectId(), true);
        byte[] bytes = media.read(grant);
        String mime = grant.media().mimeType();
        return new FileContent(a.attachment().fileName(), mime, bytes, IMAGE_MIMES.contains(mime));
    }

    /** Anexos das MINHAS tarefas (página {@code /attachments}), mais recentes primeiro, com o título da tarefa e a marca de evidência. */
    public List<AttachmentView> mine(CurrentUser actor, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        List<TitledAttachment> rows = attachments.listByTaskOwner(actor.id(), Math.max(1, Math.min(limit, MAX_MINE)));
        if (rows.isEmpty()) {
            return List.of();
        }
        Set<UUID> taskIds = new LinkedHashSet<>();
        rows.forEach(r -> taskIds.add(r.stored().attachment().taskId()));
        List<StoredEvidence> ev = evidences.findByTasks(taskIds);
        return rows.stream().map(r -> view(r.stored(), r.taskTitle(), ev, viewer, true)).toList();
    }

    // ------------------------------------------------------------------------------------------------ evidências

    public List<EvidenceView> evidences(CurrentUser actor, UUID taskId) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.VIEW);
        boolean editor = taskService.allows(viewer, stored.task(), ResourceAction.EDIT);
        Map<UUID, UUID> attachmentByMedia = new HashMap<>();
        attachments.listByTask(taskId).forEach(a -> attachmentByMedia.putIfAbsent(a.attachment().mediaObjectId(), a.attachment().id()));
        return evidences.findByTask(taskId).stream()
                .map(e -> evidenceView(e, attachmentByMedia.get(e.evidence().mediaObjectId()), viewer, editor)).toList();
    }

    /** Envia uma foto/arquivo já como evidência (cria o anexo, ou reaproveita o mesmo arquivo já anexado, e a marca). */
    @Transactional
    public EvidenceView addEvidence(CurrentUser actor, UUID taskId, FileInput file, EvidenceInput meta, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskService.requireWritable(stored.task());
        Parsed p = parse(meta);
        Attached a = attach(stored.task(), file);
        return mark(actor, viewer, taskId, a.stored(), p, !a.existing(), ctx);
    }

    /** Marca um anexo existente da tarefa como evidência. */
    @Transactional
    public EvidenceView markEvidence(CurrentUser actor, UUID taskId, UUID attachmentId, EvidenceInput meta, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskService.requireWritable(stored.task());
        StoredAttachment a = ownAttachment(taskId, attachmentId);
        return mark(actor, viewer, taskId, a, parse(meta), false, ctx);
    }

    /** Desmarca a evidência (o anexo continua). */
    @Transactional
    public void removeEvidence(CurrentUser actor, UUID taskId, UUID evidenceId, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = taskService.authorized(viewer, taskId, ResourceAction.EDIT);
        TaskService.requireWritable(stored.task());
        StoredEvidence e = evidences.findById(evidenceId).filter(x -> taskId.equals(x.evidence().linkedTaskId()))
                .orElseThrow(() -> ApiException.notFound("Evidência"));
        evidences.delete(evidenceId);
        collect(e.evidence().mediaObjectId());
        record(actor, ctx, AuditActions.TASK_EVIDENCE_REMOVED, taskId, Map.of("evidence", evidenceId.toString()));
    }

    // ------------------------------------------------------------------------------------------------ internos

    private EvidenceView mark(CurrentUser actor, Viewer viewer, UUID taskId, StoredAttachment a, Parsed p, boolean newFile, RequestContext ctx) {
        UUID mediaId = a.attachment().mediaObjectId();
        boolean exists = evidences.findByTask(taskId).stream().anyMatch(e -> mediaId.equals(e.evidence().mediaObjectId()));
        if (exists) {
            throw ApiException.conflict("EVIDENCIA_EXISTENTE", "Este arquivo já está registrado como evidência desta tarefa.");
        }
        StoredEvidence saved = evidences.insert(new Evidence(null, viewer.userId(), mediaId, p.takenAt(), p.latitude(), p.longitude(), p.caption(),
                taskId, null, StudioStatus.ORIGINAL, null));
        record(actor, ctx, AuditActions.TASK_EVIDENCE_ADDED, taskId, Map.of("evidence", saved.evidence().id().toString(),
                "attachment", a.attachment().id().toString(), "newFile", newFile, "hasLocation", p.latitude() != null));
        return evidenceView(saved, a.attachment().id(), viewer, true);
    }

    /** Pipeline do arquivo: limite, tipo real, metadados fora, dedupe na tarefa, teto de anexos, mídia e o vínculo. */
    private Attached attach(TaskItem task, FileInput file) {
        byte[] content = file == null ? null : file.content();
        String name = file == null ? null : file.fileName();
        String type = file == null ? null : file.contentType();
        if (content != null && content.length > MAX_BYTES) {
            throw new ApiException(MediaUploadInspector.GRANDE, 413, "Arquivo acima de 15 MB.", Map.of("maxBytes", MAX_BYTES));
        }
        InspectedUpload ok = inspector.inspect(new UploadCandidate(content, name, type, ACCEPTED));
        byte[] clean = ImageMetadata.strip(ok.type(), content);
        String sha = MediaUploadInspector.sha256(clean);
        List<StoredAttachment> current = attachments.listByTask(task.id());
        Optional<StoredAttachment> same = current.stream().filter(x -> sha.equals(x.attachment().sha256())).findFirst();
        if (same.isPresent()) {
            return new Attached(same.get(), true);
        }
        if (current.size() >= MAX_PER_TASK) {
            throw new ApiException("LIMITE_ANEXOS", 409, "A tarefa já tem " + MAX_PER_TASK + " anexos. Remova algum para enviar outro.",
                    Map.of("max", MAX_PER_TASK));
        }
        MediaUploadService.Stored s = media.upload(Viewer.user(task.ownerId()), new UploadCandidate(clean, name, type, ACCEPTED),
                task.accessClass(), false);
        int order = current.stream().mapToInt(x -> x.attachment().sortOrder()).max().orElse(-1) + 1;
        TaskAttachment row = attachments.insert(new TaskAttachment(null, task.id(), s.media().id(), s.safeName(), s.media().mimeType(),
                s.media().sizeBytes(), s.media().sha256(), antivirus(s.scanStatus()), OcrStatus.PENDENTE, null, current.isEmpty(), order));
        return new Attached(new StoredAttachment(row, clock.instant()), false);
    }

    /** O binário só sai quando nenhum anexo nem evidência aponta mais para ele (o dedupe por dono pode reaproveitá-lo em outra tarefa). */
    private void collect(UUID mediaId) {
        if (attachments.countByMedia(mediaId) == 0 && evidences.countByMedia(mediaId) == 0) {
            media.find(mediaId).ifPresent(media::delete);
        }
    }

    private StoredAttachment ownAttachment(UUID taskId, UUID attachmentId) {
        return attachments.findById(attachmentId).filter(x -> taskId.equals(x.attachment().taskId()))
                .orElseThrow(() -> ApiException.notFound("Anexo"));
    }

    private AttachmentView view(StoredAttachment s, String taskTitle, List<StoredEvidence> ev, Viewer viewer, boolean editor) {
        TaskAttachment a = s.attachment();
        EvidenceView evidence = ev.stream()
                .filter(e -> a.taskId().equals(e.evidence().linkedTaskId()) && a.mediaObjectId().equals(e.evidence().mediaObjectId()))
                .findFirst().map(e -> evidenceView(e, a.id(), viewer, editor)).orElse(null);
        MediaScanStatus scan = a.antivirusStatus() == AntivirusStatus.LIMPO ? MediaScanStatus.LIMPO : media.scanStatus(a.mediaObjectId());
        return new AttachmentView(a.id(), a.taskId(), taskTitle, a.fileName(), a.mimeType(), a.sizeBytes(), IMAGE_MIMES.contains(a.mimeType()),
                a.isPrimary(), scan, media.servable(scan), s.createdAt(), evidence);
    }

    private static EvidenceView evidenceView(StoredEvidence s, UUID attachmentId, Viewer viewer, boolean editor) {
        Evidence e = s.evidence();
        boolean located = e.latitude() != null && e.longitude() != null;
        boolean showCoordinates = located && (editor || viewer.is(e.ownerId()));
        return new EvidenceView(e.id(), e.linkedTaskId(), attachmentId, e.caption(), e.takenAt(), located,
                showCoordinates ? e.latitude() : null, showCoordinates ? e.longitude() : null, e.ownerId(), s.createdAt());
    }

    /** Quarentena da mídia → situação do anexo: só LIMPO libera; sem motor (NAO_VERIFICADO) fica PENDENTE (D-67). */
    static AntivirusStatus antivirus(MediaScanStatus scan) {
        if (scan == MediaScanStatus.LIMPO) {
            return AntivirusStatus.LIMPO;
        }
        return scan == MediaScanStatus.INFECTADO ? AntivirusStatus.INFECTADO : AntivirusStatus.PENDENTE;
    }

    /** Legenda, data da captura e coordenadas (só as duas juntas); tudo validado antes de gravar qualquer arquivo. */
    private Parsed parse(EvidenceInput in) {
        Map<String, Object> errors = new LinkedHashMap<>();
        String caption = blankToNull(in == null ? null : in.caption());
        if (caption != null && caption.length() > MAX_CAPTION) {
            errors.put("caption", "Legenda com até " + MAX_CAPTION + " caracteres.");
        }
        Instant takenAt = null;
        String rawTaken = blankToNull(in == null ? null : in.takenAt());
        if (rawTaken != null) {
            try {
                takenAt = OffsetDateTime.parse(rawTaken).toInstant();
                if (takenAt.isAfter(clock.instant().plus(Duration.ofDays(1))) || takenAt.isBefore(OLDEST_CAPTURE)) {
                    errors.put("takenAt", "Data da captura fora do intervalo aceito.");
                }
            } catch (DateTimeParseException e) {
                errors.put("takenAt", "Data da captura inválida (data e hora ISO-8601 com fuso).");
            }
        }
        String lat = blankToNull(in == null ? null : in.latitude());
        String lon = blankToNull(in == null ? null : in.longitude());
        String latitude = null;
        String longitude = null;
        if ((lat == null) != (lon == null)) {
            errors.put(lat == null ? "latitude" : "longitude", "Informe latitude e longitude juntas, ou nenhuma.");
        } else if (lat != null) {
            latitude = coordinate(lat, 90, "latitude", errors);
            longitude = coordinate(lon, 180, "longitude", errors);
        }
        if (!errors.isEmpty()) {
            throw TaskBriefJson.invalid(errors);
        }
        return new Parsed(caption, takenAt, latitude, longitude);
    }

    /** Coordenada decimal com até 12 casas, dentro do limite; guardada com até 7 casas (≈ 1 cm). */
    private static String coordinate(String raw, int limit, String field, Map<String, Object> errors) {
        if (!COORDINATE.matcher(raw).matches()) {
            errors.put(field, "Coordenada inválida (graus decimais, ex.: -25.4284).");
            return null;
        }
        BigDecimal v = new BigDecimal(raw);
        if (v.abs().compareTo(BigDecimal.valueOf(limit)) > 0) {
            errors.put(field, "Coordenada fora do intervalo (±" + limit + ").");
            return null;
        }
        BigDecimal scaled = v.setScale(Math.min(7, Math.max(0, v.scale())), RoundingMode.HALF_UP).stripTrailingZeros();
        return scaled.signum() == 0 ? "0" : scaled.toPlainString();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private void record(CurrentUser actor, RequestContext ctx, String action, UUID taskId, Map<String, Object> meta) {
        audit.record(AuditEvent.of(actor.id(), action, "task", taskId.toString(), AuditEvent.OK, ctx == null ? null : ctx.ip(),
                ctx == null ? null : ctx.userAgent(), meta));
    }
}
