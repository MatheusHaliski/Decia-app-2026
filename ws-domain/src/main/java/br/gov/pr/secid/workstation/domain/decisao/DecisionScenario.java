package br.gov.pr.secid.workstation.domain.decisao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Cenário melhor/base/pior de uma alternativa (§4.2); pode apontar para um cenário do simulador RF31. {@code case} é reservada → scenario_case. */
@DomainEntity(context = "5b DECIA decisão estruturada", table = "decision_scenarios", rfs = {"RF29", "RF31"}, migration = 22,
        doc = "Cenários (filho da decisão → CASCADE); alternativa e cenário do simulador SET NULL.",
        indexes = {"decision_id, alternative_id"})
public record DecisionScenario(
        @Attr("identificador") UUID id,
        @Attr(value = "decisão", ref = "decisions", onDelete = OnDelete.CASCADE) UUID decisionId,
        @Attr(value = "alternativa", opt = true, ref = "decision_alternatives", onDelete = OnDelete.SET_NULL) UUID alternativeId,
        @Attr("caso (melhor/base/pior)") ScenarioCase scenarioCase,
        @Attr(value = "descrição", sql = "TEXT") String description,
        @Attr("probabilidade") Likelihood likelihood,
        @Attr(value = "premissas do cenário", opt = true) String assumptionIdsJson,
        @Attr(value = "resultado esperado", len = 1000) String expectedResult,
        @Attr(value = "cenário do simulador (RF31)", opt = true, ref = "project_scenarios", onDelete = OnDelete.SET_NULL) UUID projectScenarioId) {
}
