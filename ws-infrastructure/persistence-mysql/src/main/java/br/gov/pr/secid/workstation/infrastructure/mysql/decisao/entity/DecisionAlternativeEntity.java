package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.AlternativeStatus;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_alternatives} (DecisionAlternative — 5b DECIA decisão estruturada; RF29, RF11, RF31,
 * RF43). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo
 * do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_alternatives")
public class DecisionAlternativeEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "do_nothing", nullable = false)
    private boolean doNothing;

    @Column(name = "pros_json", columnDefinition = "JSON")
    private String prosJson;

    @Column(name = "cons_json", columnDefinition = "JSON")
    private String consJson;

    @Column(name = "estimated_cost")
    private BigDecimal estimatedCost;

    @Column(name = "estimated_duration_days")
    private Integer estimatedDurationDays;

    @Column(name = "dependencies_md", columnDefinition = "TEXT")
    private String dependenciesMd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AlternativeStatus status;

    @Column(name = "discard_reason")
    private String discardReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private ContentOrigin origin;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "summary_scenario_id", columnDefinition = "BINARY(16)")
    private UUID summaryScenarioId;

    @Column(name = "project_scenario_id", columnDefinition = "BINARY(16)")
    private UUID projectScenarioId;

    @Column(name = "position", nullable = false)
    private int position;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isDoNothing() {
        return doNothing;
    }

    public void setDoNothing(boolean doNothing) {
        this.doNothing = doNothing;
    }

    public String getProsJson() {
        return prosJson;
    }

    public void setProsJson(String prosJson) {
        this.prosJson = prosJson;
    }

    public String getConsJson() {
        return consJson;
    }

    public void setConsJson(String consJson) {
        this.consJson = consJson;
    }

    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public Integer getEstimatedDurationDays() {
        return estimatedDurationDays;
    }

    public void setEstimatedDurationDays(Integer estimatedDurationDays) {
        this.estimatedDurationDays = estimatedDurationDays;
    }

    public String getDependenciesMd() {
        return dependenciesMd;
    }

    public void setDependenciesMd(String dependenciesMd) {
        this.dependenciesMd = dependenciesMd;
    }

    public AlternativeStatus getStatus() {
        return status;
    }

    public void setStatus(AlternativeStatus status) {
        this.status = status;
    }

    public String getDiscardReason() {
        return discardReason;
    }

    public void setDiscardReason(String discardReason) {
        this.discardReason = discardReason;
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

    public UUID getSummaryScenarioId() {
        return summaryScenarioId;
    }

    public void setSummaryScenarioId(UUID summaryScenarioId) {
        this.summaryScenarioId = summaryScenarioId;
    }

    public UUID getProjectScenarioId() {
        return projectScenarioId;
    }

    public void setProjectScenarioId(UUID projectScenarioId) {
        this.projectScenarioId = projectScenarioId;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
