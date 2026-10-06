package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.ScenarioCase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_scenarios} (DecisionScenario — 5b DECIA decisão estruturada; RF29, RF31). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_scenarios")
public class DecisionScenarioEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "alternative_id", columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scenario_case", nullable = false)
    private ScenarioCase scenarioCase;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "likelihood", nullable = false)
    private Likelihood likelihood;

    @Column(name = "assumption_ids_json", columnDefinition = "JSON")
    private String assumptionIdsJson;

    @Column(name = "expected_result", nullable = false)
    private String expectedResult;

    @Column(name = "project_scenario_id", columnDefinition = "BINARY(16)")
    private UUID projectScenarioId;

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

    public ScenarioCase getScenarioCase() {
        return scenarioCase;
    }

    public void setScenarioCase(ScenarioCase scenarioCase) {
        this.scenarioCase = scenarioCase;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Likelihood getLikelihood() {
        return likelihood;
    }

    public void setLikelihood(Likelihood likelihood) {
        this.likelihood = likelihood;
    }

    public String getAssumptionIdsJson() {
        return assumptionIdsJson;
    }

    public void setAssumptionIdsJson(String assumptionIdsJson) {
        this.assumptionIdsJson = assumptionIdsJson;
    }

    public String getExpectedResult() {
        return expectedResult;
    }

    public void setExpectedResult(String expectedResult) {
        this.expectedResult = expectedResult;
    }

    public UUID getProjectScenarioId() {
        return projectScenarioId;
    }

    public void setProjectScenarioId(UUID projectScenarioId) {
        this.projectScenarioId = projectScenarioId;
    }
}
