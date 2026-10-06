/**
 * DECIA — comandos puros sobre o agregado (cada um devolve um agregado novo, incrementa `version`, atualiza
 * `updatedAt` e grava um `DecisionEvent` na trilha). O repositório em memória e, no futuro, o cliente da API chamam
 * estes comandos; a UI nunca muta o agregado diretamente.
 */
import { buildSnapshotContent, canonicalJson, MODEL_VERSION, preDecisionGuard, sha256Hex, snapConfidence, type DecisionDraft } from "./rules";
import type {
  DecisionAggregate, DecisionComplexity, DecisionEvent, DecisionEventType, DecisionKind, DecisionLevel, DecisionLifecycle, DecisionSnapshot,
  EvidenceNature, EvidenceStance, RelevanceLevel,
} from "./types";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function touch(agg: DecisionAggregate, now: Date, actor: string | null, type: DecisionEventType, payload: Record<string, unknown> = {}): DecisionAggregate {
  const ev: DecisionEvent = { id: nextId("ev"), actorUserId: actor, type, payload, at: now.toISOString() };
  return { ...agg, decision: { ...agg.decision, version: agg.decision.version + 1, updatedAt: now.toISOString() }, events: [...agg.events, ev] };
}

/** Grava (ou remove, com `score = null`) a nota 1–5 de um avaliador para (alternativa, critério). */
export function setScore(agg: DecisionAggregate, altId: string, critId: string, assessorId: string, score: number | null, now: Date): DecisionAggregate {
  const rest = agg.assessments.filter((a) => !(a.alternativeId === altId && a.criterionId === critId && a.assessorUserId === assessorId));
  const assessments = score === null ? rest : [...rest, { id: nextId("as"), alternativeId: altId, criterionId: critId, assessorUserId: assessorId, score: Math.max(1, Math.min(5, Math.round(score))), submittedAt: now.toISOString(), origin: "HUMANO" as const }];
  return touch({ ...agg, assessments }, now, assessorId, "decision_compared", { altId, critId, score });
}

export function setWeight(agg: DecisionAggregate, critId: string, weightPct: number | null, actor: string, now: Date): DecisionAggregate {
  const criteria = agg.criteria.map((c) => (c.id === critId ? { ...c, weightPct } : c));
  return touch({ ...agg, criteria }, now, actor, "criterion_changed", { critId, weightPct });
}

export function addAlternative(agg: DecisionAggregate, input: { title: string; doNothing?: boolean }, actor: string, now: Date): DecisionAggregate {
  const position = agg.alternatives.length;
  const label = String.fromCharCode(65 + (position % 26));
  const alternative = { id: nextId("alt"), label, title: input.title.trim(), doNothing: !!input.doNothing, pros: [], cons: [], status: "ATIVA" as const, origin: "HUMANO" as const, position };
  return touch({ ...agg, alternatives: [...agg.alternatives, alternative] }, now, actor, "alternative_added", { label });
}

export function addEvidence(
  agg: DecisionAggregate,
  input: { title: string; nature: EvidenceNature; sourceLabel: string; reliability: RelevanceLevel; altId?: string; stance?: EvidenceStance },
  actor: string,
  now: Date,
): DecisionAggregate {
  const id = nextId("evd");
  const evidence = {
    id, nature: input.nature, kind: "OUTRO" as const, title: input.title.trim(), summary: "", sourceLabel: input.sourceLabel.trim() || "—",
    retrievedAt: now.toISOString(), sourceQuality: "PRIMARIA" as const, relevance: "MEDIA" as const, reliability: input.reliability,
    origin: "HUMANO" as const, addedByUserId: actor, addedAt: now.toISOString(),
  };
  const links = input.altId ? [{ id: nextId("lnk"), evidenceId: id, targetType: "ALTERNATIVA" as const, targetId: input.altId, stance: input.stance ?? "SUSTENTA", createdAt: now.toISOString() }] : [];
  return touch({ ...agg, evidence: [...agg.evidence, evidence], evidenceLinks: [...agg.evidenceLinks, ...links] }, now, actor, "evidence_added", { evidenceId: id });
}

export function addCriteria(agg: DecisionAggregate, names: readonly string[], actor: string, now: Date): DecisionAggregate {
  const start = agg.criteria.length;
  const criteria = [...agg.criteria, ...names.map((name, i) => ({ id: nextId("crt"), name, direction: "MAIOR_MELHOR" as const, weightPct: null, origin: "HUMANO" as const, position: start + i }))];
  return touch({ ...agg, criteria }, now, actor, "criterion_changed", { added: names.length });
}

export function setRecommendationStatus(agg: DecisionAggregate, recId: string, status: "ACEITA" | "DESCARTADA", actor: string, now: Date): DecisionAggregate {
  const recommendations = agg.recommendations.map((r) => (r.id === recId ? { ...r, status } : r));
  return touch({ ...agg, recommendations }, now, actor, status === "ACEITA" ? "ai_suggestion_accepted" : "ai_suggestion_dismissed", { recId });
}

export function setStatus(agg: DecisionAggregate, to: DecisionLifecycle, actor: string, now: Date): DecisionAggregate {
  return touch({ ...agg, decision: { ...agg.decision, status: to } }, now, actor, "status_changed", { to });
}

export class DecisionIncompleteError extends Error {
  readonly code = "DECISAO_INCOMPLETA";
  constructor(readonly blocking: string[]) {
    super(`DECISAO_INCOMPLETA: ${blocking.join(", ")}`);
  }
}

/**
 * Decidir (§4.3/§6.10/§6.12): exige o guarda sem bloqueios (avisos precisam de `warningsConfirmed`), grava o snapshot
 * DECISAO append-only com o hash do JSON canônico e muda o estado para DECIDIDA. O snapshot nunca é atualizado depois.
 */
export function decide(agg: DecisionAggregate, draft: DecisionDraft & { warningsConfirmed?: boolean }, actor: string, now: Date): { aggregate: DecisionAggregate; snapshot: DecisionSnapshot } {
  const guard = preDecisionGuard(agg, draft);
  if (guard.blocking.length) throw new DecisionIncompleteError(guard.blocking);
  if (guard.warnings.length && !draft.warningsConfirmed) throw new DecisionIncompleteError(["AVISOS_NAO_CONFIRMADOS"]);
  const confidencePct = draft.confidencePct == null ? undefined : snapConfidence(draft.confidencePct);
  const content = buildSnapshotContent(agg, { ...draft, confidencePct, decidedByUserId: actor });
  const contentJson = canonicalJson(content);
  const versionNumber = agg.snapshots.length + 1;
  const selected = agg.alternatives.find((a) => a.id === draft.selectedAlternativeId)!;
  const snapshot: DecisionSnapshot = {
    id: nextId("snap"), kind: "DECISAO", versionNumber, takenAt: now.toISOString(), takenByUserId: actor, contentJson, contentSha256: sha256Hex(contentJson),
    rationale: draft.rationale.trim(), confidencePct, selectedAlternativeLabel: selected.label, modelVersion: MODEL_VERSION,
  };
  const decided: DecisionAggregate = {
    ...agg,
    decision: { ...agg.decision, status: "DECIDIDA", selectedAlternativeId: selected.id, decidedAt: now.toISOString(), rationale: draft.rationale.trim(), decisionConfidencePct: confidencePct },
    snapshots: [...agg.snapshots, snapshot],
  };
  const withTrail = touch(touch(decided, now, actor, "decision_finalized", { snapshotId: snapshot.id, warnings: guard.warnings, sha256: snapshot.contentSha256 }), now, actor, "status_changed", { to: "DECIDIDA" });
  return { aggregate: withTrail, snapshot };
}

export interface NewDecisionInput {
  question: string;
  complexity: DecisionComplexity;
  impact: DecisionLevel;
  kind?: DecisionKind;
  templateKey?: string;
  ownerUserId: string;
}

/** Modelos opcionais da criação: critérios sugeridos (o usuário pode editar tudo depois). DESIGN PROPOSAL. */
export const DECISION_TEMPLATES: Record<string, { kind: DecisionKind; criteria: string[] }> = {
  fornecedor: { kind: "FORNECEDOR", criteria: ["Custo", "Qualidade do serviço", "Prazo", "Risco de transição"] },
  priorizacao: { kind: "PRODUTO", criteria: ["Valor para o usuário", "Esforço", "Risco técnico", "Alinhamento com a meta"] },
  arquitetura: { kind: "TECNICA", criteria: ["Segurança", "Custo", "Escalabilidade", "Tempo de implantação", "Manutenção"] },
};

export function createDecision(input: NewDecisionInput, now: Date, id = nextId("d-nova")): DecisionAggregate {
  const tpl = input.templateKey ? DECISION_TEMPLATES[input.templateKey] : undefined;
  const iso = now.toISOString();
  const question = input.question.trim();
  const agg: DecisionAggregate = {
    decision: {
      id, version: 1, title: question.replace(/\?$/, "").slice(0, 160), question, stakeholders: [], ownerUserId: input.ownerUserId, createdByUserId: input.ownerUserId,
      companyId: "c-exemplo", status: "RASCUNHO", complexity: input.complexity, kind: input.kind ?? tpl?.kind ?? "OUTRA", impact: input.impact, urgency: "MEDIO",
      visibility: "PRIVADA", accessClass: "INTERNO", weightingEnabled: input.complexity === "PROFUNDA", independentScoring: false, templateKey: input.templateKey,
      createdAt: iso, updatedAt: iso,
    },
    participants: [{ userId: input.ownerUserId, role: "CONDUTOR", joinedAt: iso }],
    alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], assumptions: [], risks: [], scenarios: [], forecasts: [],
    recommendations: [], triggers: [], snapshots: [], checkpoints: [], workLinks: [],
    events: [{ id: nextId("ev"), actorUserId: input.ownerUserId, type: "decision_created", payload: { complexity: input.complexity }, at: iso }],
  };
  return tpl ? { ...addCriteria(agg, tpl.criteria, input.ownerUserId, now), decision: { ...agg.decision, version: 1 } } : agg;
}
