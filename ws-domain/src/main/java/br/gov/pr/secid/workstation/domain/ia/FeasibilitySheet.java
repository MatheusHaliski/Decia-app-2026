package br.gov.pr.secid.workstation.domain.ia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Ficha de Viabilidade (RF43 §7; RF30 Autopilot) — TAXONOMIA §10.5: custo P10/P50/P90, PERT/CPM, Monte Carlo, score, riscos, WBS, RACI. */
@DomainEntity(context = "10 IA do sistema", table = "feasibility_sheets", rfs = {"RF43", "RF30", "RF21"}, migration = 21, versioned = true,
        doc = "Fichas de viabilidade de candidatos a projeto. Projeto/tarefa resultantes SET NULL.",
        indexes = {"status", "resulting_project_id"})
public record FeasibilitySheet(
        @Attr("identificador") UUID id,
        @Attr(value = "título do candidato", len = 200) String candidateTitle,
        @Attr(value = "referência da demanda", opt = true, len = 200) String demandRef,
        @Attr(value = "custo {p10, p50, p90, wbsBudget}", opt = true) String costJson,
        @Attr(value = "tempo {pert, cpm, leadCycle}", opt = true) String timeJson,
        @Attr(value = "prazo {monteCarloRuns, pOnTime, milestones}", opt = true) String deadlineJson,
        @Attr(value = "score {total, tecnica, juridica, orcamentaria, prazo, risco, roi, payback, vpl, alinhamentoPlano, smart}", opt = true)
        String viabilityScoreJson,
        @Attr(value = "riscos top 5 (P×I)", opt = true) String risksJson,
        @Attr(value = "WBS", opt = true) String wbsJson,
        @Attr(value = "RACI", opt = true) String raciJson,
        @Attr(value = "premissas", opt = true) String assumptionsJson,
        @Attr(value = "incertezas", opt = true) String unknownsJson,
        @Attr(value = "estado", def = "'PROPOSTA'") SheetStatus status,
        @Attr(value = "motivo do descarte", opt = true, len = 500) String discardReason,
        @Attr(value = "projeto criado", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID resultingProjectId,
        @Attr(value = "ETP criado (ESTUDO_TECNICO_PRELIMINAR)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID resultingTaskId,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
