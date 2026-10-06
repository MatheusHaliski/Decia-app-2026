/**
 * DECIA — view model do Decision Card (04 §3). Função pura: lê o agregado do domínio e as regras de rules.ts; o card
 * nunca guarda dados próprios. `includeBack: false` (COMPACT/STANDARD) pula a sensibilidade e o verso (04 §6).
 */
import {
  confidenceBand, decisionRiskOf, dominance, evidenceStrengthOf, focusAlternativeId, freshness, readiness, riskSeverity, scoreOf,
  sensitivity, toScoringInput, type ConfidenceBand, type DecisionRiskLevel, type EvidenceStrength, type Freshness, type Readiness,
  type SensitivityFlip,
} from "./rules";
import type {
  DecisionAggregate, DecisionComplexity, DecisionKind, DecisionLevel, DecisionLifecycle, EvidenceStance, Likelihood, OutcomeResult, PeopleDirectory,
} from "./types";

export type CardMode = "COMPACT" | "STANDARD" | "DETAIL" | "HERO";

export interface NextAction { key: string; vars?: Record<string, string | number> }

export interface CardBack {
  topEvidence: { id: string; title: string; stance: EvidenceStance; reliability: string; nature: string }[];
  topAssumptions: { id: string; statement: string; confidencePct: number | null; validation: string }[];
  keyCriteria: { id: string; name: string; weightPct: number | null }[];
  mainTradeOff: { pro: string | null; con: string | null } | null;
  principalRisk: { title: string; likelihood: Likelihood; impact: DecisionLevel; severity: DecisionLevel } | null;
  rejectedAlternative: { label: string; title: string; reason: string | null; dominatedBy: string | null } | null;
  nextCheckpoint: string | null;
  sensitivity: (SensitivityFlip & { criterionName: string; newLeaderLabel: string }) | null;
}

export interface DecisionCardViewModel {
  decisionId: string;
  title: string;
  question: string;
  status: DecisionLifecycle;
  complexity: DecisionComplexity;
  kind: DecisionKind;
  owner: { id: string; name: string } | null;
  deadline: string | null;
  daysToDeadline: number | null;
  lastUpdatedAt: string;
  selectedAlternative: { label: string; title: string } | null;
  leadingAlternative: { label: string; title: string; score: number } | null;
  technicalTie: boolean;
  recommendation: { source: "MODELO" | "IA"; label: string } | null;
  confidence: { pct: number; band: ConfidenceBand } | null;
  evidenceStrength: Pick<EvidenceStrength, "level" | "reason">;
  risk: DecisionRiskLevel;
  impact: DecisionLevel;
  urgency: DecisionLevel;
  readiness: Readiness;
  freshness: Freshness | null;
  overdue: boolean;
  criticalRisk: boolean;
  overconfident: boolean;
  archived: boolean;
  alternativesCount: number;
  outcome: OutcomeResult | null;
  stakeholders: string[];
  back: CardBack | null;
  timeline: { status: DecisionLifecycle; at: string }[];
  nextAction: NextAction;
}

const DAY = 86_400_000;
const CLOSED: DecisionLifecycle[] = ["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA", "REVISADA", "ARQUIVADA"];

export function nextActionOf(agg: DecisionAggregate, r: Readiness, now: Date): NextAction {
  const d = agg.decision;
  if (d.status === "ARQUIVADA") return { key: "decia.next.archived" };
  if (d.status === "REVISADA") return { key: "decia.next.reviewed" };
  if (d.status === "RESOLVIDA") return { key: agg.retrospective ? "decia.next.reviewed" : "decia.next.retrospective" };
  if (d.status === "DECIDIDA" || d.status === "EM_EXECUCAO") {
    const cp = agg.checkpoints.filter((c) => c.status === "AGENDADO").sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    return cp ? { key: "decia.next.checkpoint", vars: { days: Math.max(0, Math.ceil((Date.parse(cp.dueAt) - now.getTime()) / DAY)) } } : { key: "decia.next.recordOutcome" };
  }
  const missing = r.checks.find((c) => c.state === "FALTA") ?? r.checks.find((c) => c.state === "ALERTA");
  if (!missing) return { key: "decia.next.decide" };
  if (missing.key === "evidence") {
    const covered = new Set(agg.evidenceLinks.filter((l) => l.targetType === "CRITERIO").map((l) => l.targetId));
    const crit = [...agg.criteria].sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0)).find((c) => !covered.has(c.id));
    return crit ? { key: "decia.next.evidenceFor", vars: { criterion: crit.name } } : { key: "decia.next.evidence" };
  }
  return { key: `decia.next.${missing.key}` };
}

export function toDecisionCardViewModel(agg: DecisionAggregate, now: Date, opts: { people?: PeopleDirectory; includeBack?: boolean } = {}): DecisionCardViewModel {
  const d = agg.decision;
  const people = opts.people ?? {};
  const sc = scoreOf(agg);
  const altById = new Map(agg.alternatives.map((a) => [a.id, a]));
  const leaderAlt = sc.leader ? altById.get(sc.leader) : undefined;
  const leaderRow = sc.ranking.find((r) => r.alt === sc.leader);
  const selected = d.selectedAlternativeId ? altById.get(d.selectedAlternativeId) : undefined;
  const focus = focusAlternativeId(agg, sc);
  const ev = evidenceStrengthOf(agg, focus);
  const risk = decisionRiskOf(agg, focus);
  const r = readiness(agg, sc);
  const confidence = d.decisionConfidencePct != null ? { pct: d.decisionConfidencePct, band: confidenceBand(d.decisionConfidencePct) } : null;
  const deadline = d.targetDate ?? null;
  const daysToDeadline = deadline ? Math.ceil((Date.parse(deadline) - now.getTime()) / DAY) : null;
  const rec = agg.recommendations.find((x) => x.status !== "DESCARTADA" && x.source === "MODELO") ?? agg.recommendations.find((x) => x.status !== "DESCARTADA");
  const recAlt = rec?.alternativeId ? altById.get(rec.alternativeId) : undefined;

  let back: CardBack | null = null;
  if (opts.includeBack) {
    const linked = agg.evidenceLinks.filter((l) => l.targetType === "ALTERNATIVA" && l.targetId === focus);
    const relRank = { ALTA: 0, MEDIA: 1, BAIXA: 2 } as const;
    const topEvidence = linked
      .map((l) => ({ l, e: agg.evidence.find((e) => e.id === l.evidenceId && !e.supersededAt) }))
      .filter((x): x is { l: typeof linked[number]; e: NonNullable<typeof x.e> } => !!x.e)
      .sort((a, b) => relRank[a.e.reliability] - relRank[b.e.reliability] || (a.l.stance === "CONTRADIZ" ? 1 : 0) - (b.l.stance === "CONTRADIZ" ? 1 : 0))
      .slice(0, 2)
      .map(({ l, e }) => ({ id: e.id, title: e.title, stance: l.stance, reliability: e.reliability, nature: e.nature }));
    const impRank = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 } as const;
    const topAssumptions = [...agg.assumptions]
      .filter((a) => !a.alternativeId || a.alternativeId === focus)
      .sort((a, b) => impRank[a.importance] - impRank[b.importance])
      .slice(0, 2)
      .map((a) => ({ id: a.id, statement: a.statement, confidencePct: a.confidencePct ?? null, validation: a.validationStatus }));
    const keyCriteria = [...agg.criteria].sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0) || a.position - b.position).slice(0, 2).map((c) => ({ id: c.id, name: c.name, weightPct: d.weightingEnabled ? c.weightPct : null }));
    const focusAlt = focus ? altById.get(focus) : undefined;
    const sevRank = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 } as const;
    const risks = agg.risks
      .filter((x) => x.status === "ABERTO" && (!x.alternativeId || x.alternativeId === focus))
      .map((x) => ({ title: x.title, likelihood: x.likelihood, impact: x.impact, severity: riskSeverity(x.likelihood, x.impact) }))
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
    const doms = dominance(toScoringInput(agg));
    const discarded = agg.alternatives.find((a) => a.status === "DESCARTADA");
    const dominated = !discarded ? agg.alternatives.find((a) => doms.some((x) => x.dominated === a.id)) : undefined;
    const rej = discarded ?? dominated;
    const sens = sensitivity(toScoringInput(agg));
    const flip = sens.applicable ? sens.flips[0] : undefined;
    const cp = agg.checkpoints.filter((c) => c.status === "AGENDADO").sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
    back = {
      topEvidence,
      topAssumptions,
      keyCriteria,
      mainTradeOff: focusAlt ? { pro: focusAlt.pros[0] ?? null, con: focusAlt.cons[0] ?? null } : null,
      principalRisk: risks[0] ?? null,
      rejectedAlternative: rej
        ? { label: rej.label, title: rej.title, reason: rej.discardReason ?? null, dominatedBy: altById.get(doms.find((x) => x.dominated === rej.id)?.dominant ?? "")?.label ?? null }
        : null,
      nextCheckpoint: cp?.dueAt ?? null,
      sensitivity: flip
        ? { ...flip, criterionName: agg.criteria.find((c) => c.id === flip.criterion)?.name ?? flip.criterion, newLeaderLabel: altById.get(flip.newLeader)?.label ?? flip.newLeader }
        : null,
    };
  }

  return {
    decisionId: d.id,
    title: d.title,
    question: d.question,
    status: d.status,
    complexity: d.complexity,
    kind: d.kind,
    owner: d.ownerUserId ? { id: d.ownerUserId, name: people[d.ownerUserId]?.name ?? d.ownerUserId } : null,
    deadline,
    daysToDeadline,
    lastUpdatedAt: d.updatedAt,
    selectedAlternative: selected ? { label: selected.label, title: selected.title } : null,
    leadingAlternative: leaderAlt && leaderRow ? { label: leaderAlt.label, title: leaderAlt.title, score: leaderRow.score } : null,
    technicalTie: sc.valid && sc.ranking.length >= 2 && sc.leader === null,
    recommendation: rec ? { source: rec.source, label: recAlt ? `${recAlt.label} — ${recAlt.title}` : "" } : null,
    confidence,
    evidenceStrength: { level: ev.level, reason: ev.reason },
    risk,
    impact: d.impact,
    urgency: d.urgency,
    readiness: r,
    freshness: freshness(agg, now),
    overdue: daysToDeadline !== null && daysToDeadline < 0 && !CLOSED.includes(d.status),
    criticalRisk: risk === "CRITICO",
    overconfident: confidence?.band === "ALTA" && ev.level === "FRACA",
    archived: d.status === "ARQUIVADA",
    alternativesCount: agg.alternatives.filter((a) => a.status === "ATIVA").length,
    outcome: agg.outcome?.result ?? null,
    stakeholders: d.stakeholders,
    back,
    timeline: agg.events.filter((e) => e.type === "status_changed").map((e) => ({ status: e.payload.to as DecisionLifecycle, at: e.at })),
    nextAction: nextActionOf(agg, r, now),
  };
}
