package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationSource;
import br.gov.pr.secid.workstation.domain.decisao.RecommendationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_recommendations} (DecisionRecommendation — 5b DECIA decisão estruturada; RF29, RF43).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_recommendations")
public class DecisionRecommendationEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "alternative_id", columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private RecommendationSource source;

    @Column(name = "reasoning_md", nullable = false, columnDefinition = "TEXT")
    private String reasoningMd;

    @Column(name = "supporting_json", nullable = false, columnDefinition = "JSON")
    private String supportingJson;

    @Column(name = "contradicting_json", nullable = false, columnDefinition = "JSON")
    private String contradictingJson;

    @Column(name = "critical_assumption_ids_json", nullable = false, columnDefinition = "JSON")
    private String criticalAssumptionIdsJson;

    @Column(name = "limitations_md", nullable = false, columnDefinition = "TEXT")
    private String limitationsMd;

    @Column(name = "what_would_change_md", nullable = false, columnDefinition = "TEXT")
    private String whatWouldChangeMd;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecommendationStatus status;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public void setAlternativeId(UUID alternativeId) {
        this.alternativeId = alternativeId;
    }

    public RecommendationSource getSource() {
        return source;
    }

    public void setSource(RecommendationSource source) {
        this.source = source;
    }

    public String getReasoningMd() {
        return reasoningMd;
    }

    public void setReasoningMd(String reasoningMd) {
        this.reasoningMd = reasoningMd;
    }

    public String getSupportingJson() {
        return supportingJson;
    }

    public void setSupportingJson(String supportingJson) {
        this.supportingJson = supportingJson;
    }

    public String getContradictingJson() {
        return contradictingJson;
    }

    public void setContradictingJson(String contradictingJson) {
        this.contradictingJson = contradictingJson;
    }

    public String getCriticalAssumptionIdsJson() {
        return criticalAssumptionIdsJson;
    }

    public void setCriticalAssumptionIdsJson(String criticalAssumptionIdsJson) {
        this.criticalAssumptionIdsJson = criticalAssumptionIdsJson;
    }

    public String getLimitationsMd() {
        return limitationsMd;
    }

    public void setLimitationsMd(String limitationsMd) {
        this.limitationsMd = limitationsMd;
    }

    public String getWhatWouldChangeMd() {
        return whatWouldChangeMd;
    }

    public void setWhatWouldChangeMd(String whatWouldChangeMd) {
        this.whatWouldChangeMd = whatWouldChangeMd;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public RecommendationStatus getStatus() {
        return status;
    }

    public void setStatus(RecommendationStatus status) {
        this.status = status;
    }
}
