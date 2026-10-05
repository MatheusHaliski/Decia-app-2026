package br.gov.pr.secid.workstation.domain.plataforma;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;

import java.time.Instant;
import java.util.UUID;

/** Job assíncrono (= FAI) — TAXONOMIA §12.3 (thumbnails RF3/RF38, OCR RF20, exportação RF3, recálculos RF43–RF45). */
@DomainEntity(context = "12 Plataforma", table = "pipeline_jobs", rfs = {"RF3", "RF20", "RF33", "RF37", "RF38", "RF43", "RF44", "RF45"}, migration = 21,
        doc = "Fila de jobs em MySQL (MysqlJobQueue). Alvo polimórfico sem FK.",
        indexes = {"status, scheduled_at", "target_type, target_id"})
public record PipelineJob(
        @Attr("identificador") UUID id,
        @Attr("tipo") PipelineJobType type,
        @Attr(value = "tipo do alvo", len = 40) String targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "estado", def = "'PENDENTE'") PipelineJobStatus status,
        @Attr("tentativas") int attempts,
        @Attr(value = "último erro", opt = true, len = 1000) String lastError,
        @Attr("agendado para") Instant scheduledAt,
        @Attr(value = "terminado em", opt = true) Instant finishedAt) {

    public static final int MAX_ATTEMPTS = 3;

    public PipelineJob transition(PipelineJobStatus to, Instant at, String error) {
        PipelineJobStatus next = status.transition(to);
        return new PipelineJob(id, type, targetType, targetId, next, next == PipelineJobStatus.RODANDO ? attempts + 1 : attempts,
                next == PipelineJobStatus.FALHA ? error : lastError, scheduledAt,
                next == PipelineJobStatus.OK || next == PipelineJobStatus.FALHA ? at : finishedAt);
    }

    public boolean canRetry() {
        return attempts < MAX_ATTEMPTS;
    }
}
