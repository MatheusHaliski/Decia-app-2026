package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.DecisionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code final_decisions} (FinalDecision — 5 DECIA sessão; RF12, RF14, RF15, RF29, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "final_decisions")
public class FinalDecisionEntity extends AuditableEntity {

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "summary_id", columnDefinition = "BINARY(16)")
    private UUID summaryId;

    @Column(name = "decision_text", nullable = false, columnDefinition = "TEXT")
    private String decisionText;

    @Column(name = "rationale", columnDefinition = "TEXT")
    private String rationale;

    @Column(name = "chosen_scenario_id", columnDefinition = "BINARY(16)")
    private UUID chosenScenarioId;

    @Column(name = "proposed_by_ai", nullable = false)
    private boolean proposedByAi;

    @Column(name = "proposed_at", nullable = false)
    private Instant proposedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DecisionStatus status;

    @Column(name = "review_id", columnDefinition = "BINARY(16)")
    private UUID reviewId;

    @Column(name = "resulting_task_id", columnDefinition = "BINARY(16)")
    private UUID resultingTaskId;

    @Column(name = "stamp_json", columnDefinition = "JSON")
    private String stampJson;

    @Column(name = "citations_json", columnDefinition = "JSON")
    private String citationsJson;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getSummaryId() {
        return summaryId;
    }

    public void setSummaryId(UUID summaryId) {
        this.summaryId = summaryId;
    }

    public String getDecisionText() {
        return decisionText;
    }

    public void setDecisionText(String decisionText) {
        this.decisionText = decisionText;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public UUID getChosenScenarioId() {
        return chosenScenarioId;
    }

    public void setChosenScenarioId(UUID chosenScenarioId) {
        this.chosenScenarioId = chosenScenarioId;
    }

    public boolean isProposedByAi() {
        return proposedByAi;
    }

    public void setProposedByAi(boolean proposedByAi) {
        this.proposedByAi = proposedByAi;
    }

    public Instant getProposedAt() {
        return proposedAt;
    }

    public void setProposedAt(Instant proposedAt) {
        this.proposedAt = proposedAt;
    }

    public DecisionStatus getStatus() {
        return status;
    }

    public void setStatus(DecisionStatus status) {
        this.status = status;
    }

    public UUID getReviewId() {
        return reviewId;
    }

    public void setReviewId(UUID reviewId) {
        this.reviewId = reviewId;
    }

    public UUID getResultingTaskId() {
        return resultingTaskId;
    }

    public void setResultingTaskId(UUID resultingTaskId) {
        this.resultingTaskId = resultingTaskId;
    }

    public String getStampJson() {
        return stampJson;
    }

    public void setStampJson(String stampJson) {
        this.stampJson = stampJson;
    }

    public String getCitationsJson() {
        return citationsJson;
    }

    public void setCitationsJson(String citationsJson) {
        this.citationsJson = citationsJson;
    }

    public long getVersion() {
        return version;
    }
}
