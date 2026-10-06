/**
 * Trilha dos nove estágios (03 §2; 05 §3): PROBLEMA → … → APRENDIZADO, cada um com ✓ (feito), ! (atenção) ou vazio.
 * É o modelo mental, não nove telas: o workspace agrupa os estágios em 6 seções. DESIGN PROPOSAL para as regras.
 */
import { evidenceStrengthOf, focusAlternativeId, freshness, readiness, scoreOf } from "./rules";
import type { DecisionAggregate } from "./types";

export const STAGES = ["problem", "context", "evidence", "alternatives", "criteria", "analysis", "decision", "execution", "learning"] as const;
export type Stage = (typeof STAGES)[number];
export type StageState = "done" | "attention" | "empty";

export const WORKSPACE_SECTIONS = ["visao-geral", "evidencias", "comparar", "riscos", "decisao", "execucao"] as const;
export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];
export const isWorkspaceSection = (v: unknown): v is WorkspaceSection => typeof v === "string" && (WORKSPACE_SECTIONS as readonly string[]).includes(v);

/** Seção do workspace que trata cada estágio. */
export const STAGE_SECTION: Record<Stage, WorkspaceSection> = {
  problem: "visao-geral", context: "visao-geral", evidence: "evidencias", alternatives: "comparar", criteria: "comparar", analysis: "comparar",
  decision: "decisao", execution: "execucao", learning: "execucao",
};

const DECIDED = ["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA", "REVISADA", "ARQUIVADA"];

export function stageStates(agg: DecisionAggregate, now: Date): Record<Stage, StageState> {
  const d = agg.decision;
  const sc = scoreOf(agg);
  const r = readiness(agg, sc);
  const check = (k: string) => r.checks.find((c) => c.key === k)?.state;
  const active = agg.alternatives.filter((a) => a.status === "ATIVA").length;
  const decided = DECIDED.includes(d.status);
  const ev = evidenceStrengthOf(agg, focusAlternativeId(agg, sc));
  const fresh = freshness(agg, now);
  return {
    problem: check("question") === "OK" ? "done" : "attention",
    context: d.objective || d.contextMd || d.scope ? "done" : "empty",
    evidence: agg.evidence.length === 0 ? "empty" : ev.level === "FRACA" ? "attention" : "done",
    alternatives: active >= 2 ? "done" : agg.alternatives.length ? "attention" : "empty",
    criteria: agg.criteria.length === 0 ? "empty" : check("criteria") === "OK" && sc.valid ? "done" : "attention",
    analysis: agg.assessments.length === 0 ? "empty" : sc.valid && sc.incomplete.length === 0 && sc.ranking.length > 0 ? "done" : "attention",
    decision: decided ? "done" : d.status === "AGUARDANDO_DECISAO" ? "attention" : "empty",
    execution: !decided ? "empty" : fresh === "VENCIDA" || fresh === "REVISAO_DEVIDA" ? "attention" : agg.workLinks.length || agg.checkpoints.length ? "done" : "empty",
    learning: agg.retrospective ? "done" : agg.outcome ? "attention" : "empty",
  };
}
