package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.util.UUID;

/** Anexo da tarefa — TAXONOMIA §2.2 (RF20.CA12 antivírus/OCR; RF41). Binário em S3 via MediaObject. */
@DomainEntity(context = "2 Acervo de Tarefas", table = "task_attachments", rfs = {"RF20", "RF41", "RF34"}, migration = 11, store = Store.MYSQL_S3,
        doc = "Anexos da tarefa (filho → CASCADE). media_objects RESTRICT: o binário é apagado explicitamente (GC, Q-31).",
        indexes = {"task_id, sort_order"})
public record TaskAttachment(
        @Attr("identificador") UUID id,
        @Attr(value = "tarefa", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr(value = "objeto de mídia", ref = "media_objects", onDelete = OnDelete.RESTRICT) UUID mediaObjectId,
        @Attr(value = "nome do arquivo", len = 255) String fileName,
        @Attr(value = "tipo detectado (não só extensão)", len = 127) String mimeType,
        @Attr("tamanho") long sizeBytes,
        @Attr(value = "SHA-256", sql = "CHAR(64)") String sha256,
        @Attr(value = "antivírus", def = "'PENDENTE'") AntivirusStatus antivirusStatus,
        @Attr(value = "OCR", def = "'PENDENTE'") OcrStatus ocrStatus,
        @Attr(value = "referência do texto OCR no OpenSearch", opt = true, len = 200) String ocrTextRef,
        @Attr("anexo principal") boolean isPrimary,
        @Attr("ordem") int sortOrder) {
}
