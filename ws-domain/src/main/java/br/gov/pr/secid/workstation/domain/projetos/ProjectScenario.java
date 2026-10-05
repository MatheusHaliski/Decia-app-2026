package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Cenário do Simulador (RF31) — TAXONOMIA §3.6; compartilhável na sessão (RF11, RF29). */
@DomainEntity(context = "3 Criador de Projetos", table = "project_scenarios", rfs = {"RF31", "RF11", "RF29"}, migration = 12,
        doc = "Cenários simulados por projeto. Filho do projeto → CASCADE; autor → CASCADE; sessão/versão SET NULL.",
        indexes = {"project_id, status"})
public record ProjectScenario(
        @Attr("identificador") UUID id,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.CASCADE) UUID authorId,
        @Attr(value = "nome", len = 120) String name,
        @Attr("variáveis (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText)")
        String variablesJson,
        @Attr(value = "relatório de impacto (affectedTasks, newEndDate, newRisks, conformity, pros/cons)", opt = true) String impactReportJson,
        @Attr(value = "cronograma recalculado", opt = true) String recalculatedTimelineJson,
        @Attr(value = "risco por fase", opt = true) String riskByPhaseJson,
        @Attr(value = "estado", def = "'RASCUNHO'") ScenarioStatus status,
        @Attr(value = "versão gerada ao aplicar", opt = true, ref = "project_versions", onDelete = OnDelete.SET_NULL) UUID appliedVersionId,
        @Attr(value = "sessão onde foi compartilhado", opt = true, ref = "decia_sessions", onDelete = OnDelete.SET_NULL) UUID sharedInSessionId,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
