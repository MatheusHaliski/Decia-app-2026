package br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.ia.SheetStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code feasibility_sheets} (FeasibilitySheet — 10 IA do sistema; RF43, RF30, RF21). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "feasibility_sheets")
public class FeasibilitySheetEntity extends AuditableEntity {

    @Column(name = "candidate_title", nullable = false)
    private String candidateTitle;

    @Column(name = "demand_ref")
    private String demandRef;

    @Column(name = "cost_json", columnDefinition = "JSON")
    private String costJson;

    @Column(name = "time_json", columnDefinition = "JSON")
    private String timeJson;

    @Column(name = "deadline_json", columnDefinition = "JSON")
    private String deadlineJson;

    @Column(name = "viability_score_json", columnDefinition = "JSON")
    private String viabilityScoreJson;

    @Column(name = "risks_json", columnDefinition = "JSON")
    private String risksJson;

    @Column(name = "wbs_json", columnDefinition = "JSON")
    private String wbsJson;

    @Column(name = "raci_json", columnDefinition = "JSON")
    private String raciJson;

    @Column(name = "assumptions_json", columnDefinition = "JSON")
    private String assumptionsJson;

    @Column(name = "unknowns_json", columnDefinition = "JSON")
    private String unknownsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SheetStatus status;

    @Column(name = "discard_reason")
    private String discardReason;

    @Column(name = "resulting_project_id", columnDefinition = "BINARY(16)")
    private UUID resultingProjectId;

    @Column(name = "resulting_task_id", columnDefinition = "BINARY(16)")
    private UUID resultingTaskId;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public String getCandidateTitle() {
        return candidateTitle;
    }

    public void setCandidateTitle(String candidateTitle) {
        this.candidateTitle = candidateTitle;
    }

    public String getDemandRef() {
        return demandRef;
    }

    public void setDemandRef(String demandRef) {
        this.demandRef = demandRef;
    }

    public String getCostJson() {
        return costJson;
    }

    public void setCostJson(String costJson) {
        this.costJson = costJson;
    }

    public String getTimeJson() {
        return timeJson;
    }

    public void setTimeJson(String timeJson) {
        this.timeJson = timeJson;
    }

    public String getDeadlineJson() {
        return deadlineJson;
    }

    public void setDeadlineJson(String deadlineJson) {
        this.deadlineJson = deadlineJson;
    }

    public String getViabilityScoreJson() {
        return viabilityScoreJson;
    }

    public void setViabilityScoreJson(String viabilityScoreJson) {
        this.viabilityScoreJson = viabilityScoreJson;
    }

    public String getRisksJson() {
        return risksJson;
    }

    public void setRisksJson(String risksJson) {
        this.risksJson = risksJson;
    }

    public String getWbsJson() {
        return wbsJson;
    }

    public void setWbsJson(String wbsJson) {
        this.wbsJson = wbsJson;
    }

    public String getRaciJson() {
        return raciJson;
    }

    public void setRaciJson(String raciJson) {
        this.raciJson = raciJson;
    }

    public String getAssumptionsJson() {
        return assumptionsJson;
    }

    public void setAssumptionsJson(String assumptionsJson) {
        this.assumptionsJson = assumptionsJson;
    }

    public String getUnknownsJson() {
        return unknownsJson;
    }

    public void setUnknownsJson(String unknownsJson) {
        this.unknownsJson = unknownsJson;
    }

    public SheetStatus getStatus() {
        return status;
    }

    public void setStatus(SheetStatus status) {
        this.status = status;
    }

    public String getDiscardReason() {
        return discardReason;
    }

    public void setDiscardReason(String discardReason) {
        this.discardReason = discardReason;
    }

    public UUID getResultingProjectId() {
        return resultingProjectId;
    }

    public void setResultingProjectId(UUID resultingProjectId) {
        this.resultingProjectId = resultingProjectId;
    }

    public UUID getResultingTaskId() {
        return resultingTaskId;
    }

    public void setResultingTaskId(UUID resultingTaskId) {
        this.resultingTaskId = resultingTaskId;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public long getVersion() {
        return version;
    }
}
