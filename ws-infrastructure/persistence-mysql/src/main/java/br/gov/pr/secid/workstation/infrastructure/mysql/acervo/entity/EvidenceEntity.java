package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.FormatFamily;
import br.gov.pr.secid.workstation.domain.acervo.StudioStatus;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import br.gov.pr.secid.workstation.domain.acervo.UploadChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code evidences} (Evidence — 2 Acervo de Tarefas; RF41, RF20, RF29). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "evidences")
public class EvidenceEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Column(name = "media_object_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID mediaObjectId;

    @Column(name = "taken_at")
    private Instant takenAt;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "latitude_enc")
    private String latitudeEnc;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "longitude_enc")
    private String longitudeEnc;

    @Column(name = "caption")
    private String caption;

    @Column(name = "linked_task_id", columnDefinition = "BINARY(16)")
    private UUID linkedTaskId;

    @Column(name = "linked_project_id", columnDefinition = "BINARY(16)")
    private UUID linkedProjectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "studio_status", nullable = false)
    private StudioStatus studioStatus;

    @Column(name = "derived_task_id", columnDefinition = "BINARY(16)")
    private UUID derivedTaskId;


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

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public UUID getMediaObjectId() {
        return mediaObjectId;
    }

    public void setMediaObjectId(UUID mediaObjectId) {
        this.mediaObjectId = mediaObjectId;
    }

    public Instant getTakenAt() {
        return takenAt;
    }

    public void setTakenAt(Instant takenAt) {
        this.takenAt = takenAt;
    }

    public String getLatitudeEnc() {
        return latitudeEnc;
    }

    public void setLatitudeEnc(String latitudeEnc) {
        this.latitudeEnc = latitudeEnc;
    }

    public String getLongitudeEnc() {
        return longitudeEnc;
    }

    public void setLongitudeEnc(String longitudeEnc) {
        this.longitudeEnc = longitudeEnc;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public UUID getLinkedTaskId() {
        return linkedTaskId;
    }

    public void setLinkedTaskId(UUID linkedTaskId) {
        this.linkedTaskId = linkedTaskId;
    }

    public UUID getLinkedProjectId() {
        return linkedProjectId;
    }

    public void setLinkedProjectId(UUID linkedProjectId) {
        this.linkedProjectId = linkedProjectId;
    }

    public StudioStatus getStudioStatus() {
        return studioStatus;
    }

    public void setStudioStatus(StudioStatus studioStatus) {
        this.studioStatus = studioStatus;
    }

    public UUID getDerivedTaskId() {
        return derivedTaskId;
    }

    public void setDerivedTaskId(UUID derivedTaskId) {
        this.derivedTaskId = derivedTaskId;
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
