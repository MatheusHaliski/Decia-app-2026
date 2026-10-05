package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.SummaryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code analytical_summaries} (AnalyticalSummary — 5 DECIA sessão; RF11, RF12, RF29, RF31, RF32, RF33). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "analytical_summaries")
public class AnalyticalSummaryEntity extends AuditableEntity {

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "arguments_json", columnDefinition = "JSON")
    private String argumentsJson;

    @Column(name = "consensus_json", columnDefinition = "JSON")
    private String consensusJson;

    @Column(name = "divergences_json", columnDefinition = "JSON")
    private String divergencesJson;

    @Column(name = "risks_json", columnDefinition = "JSON")
    private String risksJson;

    @Column(name = "attention_points_json", columnDefinition = "JSON")
    private String attentionPointsJson;

    @Column(name = "recommendations_json", columnDefinition = "JSON")
    private String recommendationsJson;

    @Column(name = "evaluation_criteria_json", columnDefinition = "JSON")
    private String evaluationCriteriaJson;

    @Column(name = "compliance_result_id", columnDefinition = "BINARY(16)")
    private UUID complianceResultId;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SummaryStatus status;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getArgumentsJson() {
        return argumentsJson;
    }

    public void setArgumentsJson(String argumentsJson) {
        this.argumentsJson = argumentsJson;
    }

    public String getConsensusJson() {
        return consensusJson;
    }

    public void setConsensusJson(String consensusJson) {
        this.consensusJson = consensusJson;
    }

    public String getDivergencesJson() {
        return divergencesJson;
    }

    public void setDivergencesJson(String divergencesJson) {
        this.divergencesJson = divergencesJson;
    }

    public String getRisksJson() {
        return risksJson;
    }

    public void setRisksJson(String risksJson) {
        this.risksJson = risksJson;
    }

    public String getAttentionPointsJson() {
        return attentionPointsJson;
    }

    public void setAttentionPointsJson(String attentionPointsJson) {
        this.attentionPointsJson = attentionPointsJson;
    }

    public String getRecommendationsJson() {
        return recommendationsJson;
    }

    public void setRecommendationsJson(String recommendationsJson) {
        this.recommendationsJson = recommendationsJson;
    }

    public String getEvaluationCriteriaJson() {
        return evaluationCriteriaJson;
    }

    public void setEvaluationCriteriaJson(String evaluationCriteriaJson) {
        this.evaluationCriteriaJson = evaluationCriteriaJson;
    }

    public UUID getComplianceResultId() {
        return complianceResultId;
    }

    public void setComplianceResultId(UUID complianceResultId) {
        this.complianceResultId = complianceResultId;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public SummaryStatus getStatus() {
        return status;
    }

    public void setStatus(SummaryStatus status) {
        this.status = status;
    }
}
