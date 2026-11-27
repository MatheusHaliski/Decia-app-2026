package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;
import br.gov.pr.secid.workstation.domain.acervo.AntivirusStatus;
import br.gov.pr.secid.workstation.domain.acervo.OcrStatus;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.acervo.UploadChannel;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import jakarta.persistence.Convert;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code task_attachments} (TaskAttachment — 2 Acervo de Tarefas; RF20, RF41, RF34). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "task_attachments")
public class TaskAttachmentEntity extends AuditableEntity {

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "media_object_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID mediaObjectId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "sha256", nullable = false)
    private String sha256;

    @Enumerated(EnumType.STRING)
    @Column(name = "antivirus_status", nullable = false)
    private AntivirusStatus antivirusStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "ocr_status", nullable = false)
    private OcrStatus ocrStatus;

    @Column(name = "ocr_text_ref")
    private String ocrTextRef;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;


    @Enumerated(EnumType.STRING)
    @Column(name = "format_family")
    private FormatFamily formatFamily;

    @Column(name = "format_variant")
    private String formatVariant;

    @Column(name = "format_details_json", columnDefinition = "JSON")
    private String formatDetailsJson;

    @Column(name = "original_sha256", columnDefinition = "CHAR(64)")
    private String originalSha256;

    @Column(name = "uploaded_by", columnDefinition = "BINARY(16)")
    private UUID uploadedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "uploaded_via")
    private UploadChannel uploadedVia;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "capture_metadata_enc", columnDefinition = "TEXT")
    private String captureMetadataEnc;

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public UUID getMediaObjectId() {
        return mediaObjectId;
    }

    public void setMediaObjectId(UUID mediaObjectId) {
        this.mediaObjectId = mediaObjectId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public void setSha256(String sha256) {
        this.sha256 = sha256;
    }

    public AntivirusStatus getAntivirusStatus() {
        return antivirusStatus;
    }

    public void setAntivirusStatus(AntivirusStatus antivirusStatus) {
        this.antivirusStatus = antivirusStatus;
    }

    public OcrStatus getOcrStatus() {
        return ocrStatus;
    }

    public void setOcrStatus(OcrStatus ocrStatus) {
        this.ocrStatus = ocrStatus;
    }

    public String getOcrTextRef() {
        return ocrTextRef;
    }

    public void setOcrTextRef(String ocrTextRef) {
        this.ocrTextRef = ocrTextRef;
    }

    public boolean isIsPrimary() {
        return isPrimary;
    }

    public void setIsPrimary(boolean isPrimary) {
        this.isPrimary = isPrimary;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public FormatFamily getFormatFamily() {
        return formatFamily;
    }

    public void setFormatFamily(FormatFamily formatFamily) {
        this.formatFamily = formatFamily;
    }

    public String getFormatVariant() {
        return formatVariant;
    }

    public void setFormatVariant(String formatVariant) {
        this.formatVariant = formatVariant;
    }

    public String getFormatDetailsJson() {
        return formatDetailsJson;
    }

    public void setFormatDetailsJson(String formatDetailsJson) {
        this.formatDetailsJson = formatDetailsJson;
    }

    public String getOriginalSha256() {
        return originalSha256;
    }

    public void setOriginalSha256(String originalSha256) {
        this.originalSha256 = originalSha256;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(UUID uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public UploadChannel getUploadedVia() {
        return uploadedVia;
    }

    public void setUploadedVia(UploadChannel uploadedVia) {
        this.uploadedVia = uploadedVia;
    }

    public String getCaptureMetadataEnc() {
        return captureMetadataEnc;
    }

    public void setCaptureMetadataEnc(String captureMetadataEnc) {
        this.captureMetadataEnc = captureMetadataEnc;
    }
}
