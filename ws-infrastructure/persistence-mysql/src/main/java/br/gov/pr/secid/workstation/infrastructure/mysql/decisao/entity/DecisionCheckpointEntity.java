package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointAction;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointKind;
import br.gov.pr.secid.workstation.domain.decisao.CheckpointStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_checkpoints} (DecisionCheckpoint — 5b DECIA decisão estruturada; RF29). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_checkpoints")
public class DecisionCheckpointEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private CheckpointKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CheckpointStatus status;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "completed_by_user_id", columnDefinition = "BINARY(16)")
    private UUID completedByUserId;

    @Column(name = "still_valid")
    private Boolean stillValid;

    @Column(name = "assumptions_changed")
    private Boolean assumptionsChanged;

    @Column(name = "new_evidence")
    private Boolean newEvidence;

    @Column(name = "confidence_pct_after")
    private Integer confidencePctAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "action")
    private CheckpointAction action;

    @Column(name = "note")
    private String note;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public CheckpointKind getKind() {
        return kind;
    }

    public void setKind(CheckpointKind kind) {
        this.kind = kind;
    }

    public CheckpointStatus getStatus() {
        return status;
    }

    public void setStatus(CheckpointStatus status) {
        this.status = status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public UUID getCompletedByUserId() {
        return completedByUserId;
    }

    public void setCompletedByUserId(UUID completedByUserId) {
        this.completedByUserId = completedByUserId;
    }

    public Boolean getStillValid() {
        return stillValid;
    }

    public void setStillValid(Boolean stillValid) {
        this.stillValid = stillValid;
    }

    public Boolean getAssumptionsChanged() {
        return assumptionsChanged;
    }

    public void setAssumptionsChanged(Boolean assumptionsChanged) {
        this.assumptionsChanged = assumptionsChanged;
    }

    public Boolean getNewEvidence() {
        return newEvidence;
    }

    public void setNewEvidence(Boolean newEvidence) {
        this.newEvidence = newEvidence;
    }

    public Integer getConfidencePctAfter() {
        return confidencePctAfter;
    }

    public void setConfidencePctAfter(Integer confidencePctAfter) {
        this.confidencePctAfter = confidencePctAfter;
    }

    public CheckpointAction getAction() {
        return action;
    }

    public void setAction(CheckpointAction action) {
        this.action = action;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
