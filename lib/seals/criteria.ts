/**
 * Critérios e sugestão de chancela (RF39.CA03, CA04) — funções puras e determinísticas (D-12). `evaluatePolicy` confere cada
 * critério da política contra os fatos do item calculados pelo sistema; `suggestSeals` ordena as chancelas abertas do mesmo tier
 * pela fração de critérios atendidos e devolve até 3, com a base do vínculo e os fatos que a justificam — o texto ✦ da tela é
 * montado só com esses números.
 */
import type { BondBasis, CriterionResult, CriterionRule, Seal, SealPolicy, SealTarget, TargetFacts } from "./types";

export function evaluateCriterion(rule: CriterionRule, facts: TargetFacts): CriterionResult {
  const min = rule.threshold ?? 0;
  switch (rule.criterion) {
    case "CONFORMIDADE_MIN":
      return { criterion: rule.criterion, threshold: min, value: facts.conformityPct, met: facts.conformityPct >= min };
    case "REACOES_MIN":
      return { criterion: rule.criterion, threshold: min, value: facts.reactions, met: facts.reactions >= min };
    case "REUTILIZACOES_MIN":
      return { criterion: rule.criterion, threshold: min, value: facts.reuses, met: facts.reuses >= min };
    case "RASTRO_COMPLETO":
      return { criterion: rule.criterion, threshold: null, value: facts.traceComplete, met: facts.traceComplete };
    case "PRAZO_CUMPRIDO":
      return { criterion: rule.criterion, threshold: null, value: facts.deadlineMet, met: facts.deadlineMet };
    case "DECISAO_VALIDADA":
      return { criterion: rule.criterion, threshold: null, value: facts.decisionValidated, met: facts.decisionValidated };
    case "SEM_PENDENCIA":
      return { criterion: rule.criterion, threshold: 0, value: facts.pending, met: facts.pending === 0 };
  }
}

export interface PolicyReport {
  results: CriterionResult[];
  met: number;
  total: number;
  allMet: boolean;
}

export function evaluatePolicy(policy: SealPolicy, facts: TargetFacts): PolicyReport {
  const results = policy.criteria.map((r) => evaluateCriterion(r, facts));
  const met = results.filter((r) => r.met).length;
  return { results, met, total: results.length, allMet: results.length > 0 && met === results.length };
}

const today = (now: Date) => now.toISOString().slice(0, 10);

/** Ciclo de concessão aberto hoje e limite de uso não atingido? */
export function sealOpen(seal: Seal, now: Date): "ABERTA" | "FORA_DO_CICLO" | "LIMITE_ESGOTADO" {
  const d = today(now);
  if (d < seal.availableFrom || (seal.availableUntil !== null && d > seal.availableUntil)) return "FORA_DO_CICLO";
  if (seal.usageLimit !== null && seal.usageCount >= seal.usageLimit) return "LIMITE_ESGOTADO";
  return "ABERTA";
}

/** Base do vínculo sugerido: plano → PLANO_MATCH; decisão validada → DECISAO_MATCH; reutilizado como modelo → MODELO_MATCH; senão o departamento. */
export function suggestionBasis(target: Pick<SealTarget, "type" | "facts">): BondBasis {
  if (target.type === "PLANO") return "PLANO_MATCH";
  if (target.facts.decisionValidated) return "DECISAO_MATCH";
  if (target.facts.reuses > 0) return "MODELO_MATCH";
  return "DEPARTAMENTO_MATCH";
}

export interface Suggestion {
  seal: Seal;
  basis: BondBasis;
  /** 0–100: fração de critérios atendidos */
  confidence: number;
  report: PolicyReport;
}

export function suggestSeals(target: SealTarget, seals: readonly Seal[], now: Date, limit = 3): Suggestion[] {
  return seals
    .filter((s) => s.tier === target.type && sealOpen(s, now) === "ABERTA")
    .map((seal) => {
      const report = evaluatePolicy(seal.policy, target.facts);
      return { seal, basis: suggestionBasis(target), confidence: report.total ? Math.round((100 * report.met) / report.total) : 0, report };
    })
    .sort((a, b) => b.confidence - a.confidence || Number(a.seal.excellence) - Number(b.seal.excellence) || a.seal.name.localeCompare(b.seal.name, "pt-BR"))
    .slice(0, limit);
}
