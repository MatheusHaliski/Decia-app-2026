package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.StudioStatus;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
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
}
