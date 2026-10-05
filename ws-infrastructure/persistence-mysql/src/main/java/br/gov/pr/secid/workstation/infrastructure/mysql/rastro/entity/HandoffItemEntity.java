package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity;

import br.gov.pr.secid.workstation.domain.rastro.HandoffTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code handoff_items} (HandoffItem — 6 Rastro de Decisão; RF36). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "handoff_items")
public class HandoffItemEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "dossier_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID dossierId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private HandoffTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "previous_responsible_id", columnDefinition = "BINARY(16)")
    private UUID previousResponsibleId;

    @Column(name = "new_responsible_id", columnDefinition = "BINARY(16)")
    private UUID newResponsibleId;

    @Column(name = "transferred_at")
    private Instant transferredAt;

    @Column(name = "note")
    private String note;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDossierId() {
        return dossierId;
    }

    public void setDossierId(UUID dossierId) {
        this.dossierId = dossierId;
    }

    public HandoffTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(HandoffTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public UUID getPreviousResponsibleId() {
        return previousResponsibleId;
    }

    public void setPreviousResponsibleId(UUID previousResponsibleId) {
        this.previousResponsibleId = previousResponsibleId;
    }

    public UUID getNewResponsibleId() {
        return newResponsibleId;
    }

    public void setNewResponsibleId(UUID newResponsibleId) {
        this.newResponsibleId = newResponsibleId;
    }

    public Instant getTransferredAt() {
        return transferredAt;
    }

    public void setTransferredAt(Instant transferredAt) {
        this.transferredAt = transferredAt;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
