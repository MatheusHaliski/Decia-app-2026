package br.gov.pr.secid.workstation.domain.lgpd;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.common.UiLanguage;

import java.time.Instant;
import java.util.UUID;

/** Exportação dos dados pessoais (LGPD art. 18 II e V; RF3, D-20) — TAXONOMIA §12.6. 3 por dia; link de 7 dias; só o dono baixa. */
@DomainEntity(context = "12 Plataforma", table = "data_export_requests", rfs = {"RF3"}, migration = 10, audit = Audit.NONE,
        doc = "Exportação assíncrona (PipelineJob DATA_EXPORT). Arquivo em restricted/users/{userId}/exports/; expira em +7 d.",
        indexes = {"user_id, requested_at", "status, expires_at"})
public record DataExportRequest(
        @Attr("identificador") UUID id,
        @Attr(value = "titular", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr(value = "estado", def = "'REQUESTED'") ExportStatus status,
        @Attr(value = "job assíncrono", opt = true, ref = "pipeline_jobs", onDelete = OnDelete.SET_NULL) UUID jobId,
        @Attr(value = "chave do arquivo em restricted/", opt = true, len = 512) String fileKey,
        @Attr(value = "formato", def = "'JSON'") ExportFormat format,
        @Attr(value = "idioma do conteúdo", def = "'PT_BR'") UiLanguage language,
        @Attr(value = "tamanho", opt = true) Long sizeBytes,
        @Attr("pedido em") Instant requestedAt,
        @Attr(value = "concluído em", opt = true) Instant completedAt,
        @Attr(value = "expira em (+7 d)", opt = true) Instant expiresAt,
        @Attr(value = "primeiro download", opt = true) Instant downloadedAt,
        @Attr(value = "motivo da falha", opt = true, len = 500) String failureReason) {

    public static final int DAILY_LIMIT = 3;

    public DataExportRequest transition(ExportStatus to) {
        return new DataExportRequest(id, userId, status.transition(to), jobId, fileKey, format, language, sizeBytes, requestedAt, completedAt,
                expiresAt, downloadedAt, failureReason);
    }

    /** Download só do dono (403) e só em READY e não vencida (410 EXPORTACAO_EXPIRADA). */
    public boolean canDownload(UUID requester, Instant now) {
        return userId.equals(requester) && status.isDownloadable() && (expiresAt == null || now.isBefore(expiresAt));
    }
}
