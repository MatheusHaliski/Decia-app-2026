package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.projetos.ScenarioStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code project_scenarios} (ProjectScenario — 3 Criador de Projetos; RF31, RF11, RF29). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "project_scenarios")
public class ProjectScenarioEntity extends AuditableEntity {

    @Column(name = "project_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "author_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID authorId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "variables_json", nullable = false, columnDefinition = "JSON")
    private String variablesJson;

    @Column(name = "impact_report_json", columnDefinition = "JSON")
    private String impactReportJson;

    @Column(name = "recalculated_timeline_json", columnDefinition = "JSON")
    private String recalculatedTimelineJson;

    @Column(name = "risk_by_phase_json", columnDefinition = "JSON")
    private String riskByPhaseJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ScenarioStatus status;

    @Column(name = "applied_version_id", columnDefinition = "BINARY(16)")
    private UUID appliedVersionId;

    @Column(name = "shared_in_session_id", columnDefinition = "BINARY(16)")
    private UUID sharedInSessionId;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public void setAuthorId(UUID authorId) {
        this.authorId = authorId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVariablesJson() {
        return variablesJson;
    }

    public void setVariablesJson(String variablesJson) {
        this.variablesJson = variablesJson;
    }

    public String getImpactReportJson() {
        return impactReportJson;
    }

    public void setImpactReportJson(String impactReportJson) {
        this.impactReportJson = impactReportJson;
    }

    public String getRecalculatedTimelineJson() {
        return recalculatedTimelineJson;
    }

    public void setRecalculatedTimelineJson(String recalculatedTimelineJson) {
        this.recalculatedTimelineJson = recalculatedTimelineJson;
    }

    public String getRiskByPhaseJson() {
        return riskByPhaseJson;
    }

    public void setRiskByPhaseJson(String riskByPhaseJson) {
        this.riskByPhaseJson = riskByPhaseJson;
    }

    public ScenarioStatus getStatus() {
        return status;
    }

    public void setStatus(ScenarioStatus status) {
        this.status = status;
    }

    public UUID getAppliedVersionId() {
        return appliedVersionId;
    }

    public void setAppliedVersionId(UUID appliedVersionId) {
        this.appliedVersionId = appliedVersionId;
    }

    public UUID getSharedInSessionId() {
        return sharedInSessionId;
    }

    public void setSharedInSessionId(UUID sharedInSessionId) {
        this.sharedInSessionId = sharedInSessionId;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }
}
