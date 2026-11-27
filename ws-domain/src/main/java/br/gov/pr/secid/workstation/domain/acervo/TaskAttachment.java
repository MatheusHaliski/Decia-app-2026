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
        @Attr("ordem") int sortOrder,
        @Attr(value = "família do formato, pelo tipo REAL detectado (V71)", opt = true) FormatFamily formatFamily,
        @Attr(value = "variante do formato, pelo tipo REAL detectado", opt = true, len = 10) String formatVariant,
        @Attr(value = "detalhes extraídos pelo servidor (páginas, dimensões, abas…)", opt = true) String formatDetailsJson,
        @Attr(value = "SHA-256 do arquivo COMO RECEBIDO, antes de remover metadados (V73)", opt = true, sql = "CHAR(64)") String originalSha256,
        @Attr(value = "quem enviou (V73)", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID uploadedBy,
        @Attr(value = "canal de entrada: DIRETO ou provedor conectado (V73)", opt = true) UploadChannel uploadedVia,
        @Attr(value = "metadados de captura do EXIF (data, GPS, câmera), JSON cifrado (V73)", opt = true, sql = "TEXT", encrypted = true)
        String captureMetadata) {

    /** Anexo sem proveniência (linhas anteriores à V73 e testes): hashes/autor/canal/captura nulos. */
    public TaskAttachment(UUID id, UUID taskId, UUID mediaObjectId, String fileName, String mimeType, long sizeBytes, String sha256,
                          AntivirusStatus antivirusStatus, OcrStatus ocrStatus, String ocrTextRef, boolean isPrimary, int sortOrder,
                          FormatFamily formatFamily, String formatVariant, String formatDetailsJson) {
        this(id, taskId, mediaObjectId, fileName, mimeType, sizeBytes, sha256, antivirusStatus, ocrStatus, ocrTextRef, isPrimary, sortOrder,
                formatFamily, formatVariant, formatDetailsJson, null, null, null, null);
    }
}
