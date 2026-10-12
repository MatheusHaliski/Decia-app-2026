package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.AssumptionStatus;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_assumptions} (DecisionAssumption — 5b DECIA decisão estruturada; RF29, RF31). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_assumptions")
public class DecisionAssumptionEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "statement", nullable = false)
    private String statement;

    @Enumerated(EnumType.STRING)
    @Column(name = "importance", nullable = false)
    private DecisionLevel importance;

    @Column(name = "confidence_pct")
    private Integer confidencePct;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false)
    private AssumptionStatus validationStatus;

    @Column(name = "owner_user_id", columnDefinition = "BINARY(16)")
    private UUID ownerUserId;

    @Column(name = "alternative_id", columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Column(name = "validation_note")
    private String validationNote;

    @Column(name = "validated_at")
    private Instant validatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private ContentOrigin origin;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public String getStatement() {
        return statement;
    }

    public void setStatement(String statement) {
        this.statement = statement;
    }

    public DecisionLevel getImportance() {
        return importance;
    }

    public void setImportance(DecisionLevel importance) {
        this.importance = importance;
    }

    public Integer getConfidencePct() {
        return confidencePct;
    }

    public void setConfidencePct(Integer confidencePct) {
        this.confidencePct = confidencePct;
    }

    public AssumptionStatus getValidationStatus() {
        return validationStatus;
    }

    public void setValidationStatus(AssumptionStatus validationStatus) {
        this.validationStatus = validationStatus;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public void setAlternativeId(UUID alternativeId) {
        this.alternativeId = alternativeId;
    }

    public String getValidationNote() {
        return validationNote;
    }

    public void setValidationNote(String validationNote) {
        this.validationNote = validationNote;
    }

    public Instant getValidatedAt() {
        return validatedAt;
    }

    public void setValidatedAt(Instant validatedAt) {
        this.validatedAt = validatedAt;
    }

    public ContentOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(ContentOrigin origin) {
        this.origin = origin;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }
}
