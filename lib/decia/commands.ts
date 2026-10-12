/**
 * DECIA — comandos puros sobre o agregado (cada um devolve um agregado novo, incrementa `version`, atualiza
 * `updatedAt` e grava um `DecisionEvent` na trilha). O repositório em memória e, no futuro, o cliente da API chamam
 * estes comandos; a UI nunca muta o agregado diretamente.
 */
import { buildSnapshotContent, canonicalJson, MODEL_VERSION, preDecisionGuard, sha256Hex, snapConfidence, type DecisionDraft } from "./rules";
import type {
  DecisionAggregate, DecisionComplexity, DecisionEvent, DecisionEventType, DecisionKind, DecisionLevel, DecisionLifecycle, DecisionSnapshot,
  EvidenceNature, EvidenceStance, OutcomeResult, RelevanceLevel,
} from "./types";
import { isStructureEditable, LIFECYCLE_TRANSITIONS, PATH_TO_AWAITING } from "./types";

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function touch(agg: DecisionAggregate, now: Date, actor: string | null, type: DecisionEventType, payload: Record<string, unknown> = {}): DecisionAggregate {
  const ev: DecisionEvent = { id: nextId("ev"), actorUserId: actor, type, payload, at: now.toISOString() };
  return { ...agg, decision: { ...agg.decision, version: agg.decision.version + 1, updatedAt: now.toISOString() }, events: [...agg.events, ev] };
}

/** Grava (ou remove, com `score = null`) a nota 1–5 de um avaliador para (alternativa, critério). */
export function setScore(agg: DecisionAggregate, altId: string, critId: string, assessorId: string, score: number | null, now: Date): DecisionAggregate {
  requireEditable(agg);
  const rest = agg.assessments.filter((a) => !(a.alternativeId === altId && a.criterionId === critId && a.assessorUserId === assessorId));
  const assessments = score === null ? rest : [...rest, { id: nextId("as"), alternativeId: altId, criterionId: critId, assessorUserId: assessorId, score: Math.max(1, Math.min(5, Math.round(score))), submittedAt: now.toISOString(), origin: "HUMANO" as const }];
  return touch({ ...agg, assessments }, now, assessorId, "AVALIACAO_REGISTRADA", { altId, critId, score });
}

export function setWeight(agg: DecisionAggregate, critId: string, weightPct: number | null, actor: string, now: Date): DecisionAggregate {
  requireEditable(agg);
  const criteria = agg.criteria.map((c) => (c.id === critId ? { ...c, weightPct } : c));
  return touch({ ...agg, criteria }, now, actor, "CRITERIO_ATUALIZADO", { critId, weightPct });
}

export function addAlternative(agg: DecisionAggregate, input: { title: string; doNothing?: boolean }, actor: string, now: Date): DecisionAggregate {
  requireEditable(agg);
  const position = agg.alternatives.length;
  const label = String.fromCharCode(65 + (position % 26));
  const alternative = { id: nextId("alt"), label, title: input.title.trim(), doNothing: !!input.doNothing, pros: [], cons: [], status: "ATIVA" as const, origin: "HUMANO" as const, position };
  return touch({ ...agg, alternatives: [...agg.alternatives, alternative] }, now, actor, "ALTERNATIVA_CRIADA", { label });
}

export function addEvidence(
  agg: DecisionAggregate,
  input: { title: string; nature: EvidenceNature; sourceLabel: string; reliability: RelevanceLevel; altId?: string; stance?: EvidenceStance },
  actor: string,
  now: Date,
): DecisionAggregate {
  const id = nextId("evd");
  const evidence = {
    id, nature: input.nature, kind: "DOCUMENTO" as const, title: input.title.trim(), summary: "", sourceLabel: input.sourceLabel.trim() || "—",
    retrievedAt: now.toISOString(), sourceQuality: "NAO_VERIFICADA" as const, relevance: "MEDIA" as const, reliability: input.reliability,
    origin: "HUMANO" as const, addedByUserId: actor, addedAt: now.toISOString(),
  };
  const links = input.altId ? [{ id: nextId("lnk"), evidenceId: id, targetType: "ALTERNATIVA" as const, targetId: input.altId, stance: input.stance ?? "SUSTENTA", createdAt: now.toISOString() }] : [];
  return touch({ ...agg, evidence: [...agg.evidence, evidence], evidenceLinks: [...agg.evidenceLinks, ...links] }, now, actor, "EVIDENCIA_ADICIONADA", { evidenceId: id });
}

export function addCriteria(agg: DecisionAggregate, names: readonly string[], actor: string, now: Date): DecisionAggregate {
  requireEditable(agg);
  const start = agg.criteria.length;
  const criteria = [...agg.criteria, ...names.map((name, i) => ({ id: nextId("crt"), name, direction: "MAIOR_MELHOR" as const, weightPct: null, origin: "HUMANO" as const, position: start + i }))];
  return touch({ ...agg, criteria }, now, actor, "CRITERIO_ATUALIZADO", { added: names.length });
}

export function setRecommendationStatus(agg: DecisionAggregate, recId: string, status: "ACEITA" | "DESCARTADA", actor: string, now: Date): DecisionAggregate {
  const recommendations = agg.recommendations.map((r) => (r.id === recId ? { ...r, status } : r));
  return touch({ ...agg, recommendations }, now, actor, status === "ACEITA" ? "SUGESTAO_IA_ACEITA" : "SUGESTAO_IA_DESCARTADA", { recId });
}

export function setStatus(agg: DecisionAggregate, to: DecisionLifecycle, actor: string, now: Date): DecisionAggregate {
  return touch({ ...agg, decision: { ...agg.decision, status: to } }, now, actor, "ESTADO_ALTERADO", { to });
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
export class DecisionLifecycleError extends Error {
  readonly code = "DECISAO_CICLO_TRANSICAO_INVALIDA";
  constructor(from: string, to: string) {
    super(`DECISAO_CICLO_TRANSICAO_INVALIDA: ${from} → ${to}`);
  }
}

/** A estrutura só muda antes de decidir (ou reaberta); depois disso, alterar exige reabrir (Codex P2, PR #31). */
function requireEditable(agg: DecisionAggregate) {
  if (!isStructureEditable(agg.decision.status)) throw new DecisionLifecycleError(agg.decision.status, "EDICAO");
}

export function decide(agg: DecisionAggregate, draft: DecisionDraft & { warningsConfirmed?: boolean }, actor: string, now: Date): { aggregate: DecisionAggregate; snapshot: DecisionSnapshot } {
  const path = PATH_TO_AWAITING[agg.decision.status];
  if (!path) throw new DecisionLifecycleError(agg.decision.status, "DECIDIDA");
  // a guarda roda sobre exatamente os valores que serão gravados (confiança já normalizada, motivo sem espaços nas pontas)
  const confidencePct = draft.confidencePct == null ? undefined : snapConfidence(draft.confidencePct);
  const stored = { selectedAlternativeId: draft.selectedAlternativeId, rationale: draft.rationale.trim(), confidencePct };
  const guard = preDecisionGuard(agg, stored);
  if (guard.blocking.length) throw new DecisionIncompleteError(guard.blocking);
  if (guard.warnings.length && !draft.warningsConfirmed) throw new DecisionIncompleteError(["DECISAO_AVISOS_NAO_CONFIRMADOS"]);
  const content = buildSnapshotContent(agg, { ...draft, confidencePct, decidedByUserId: actor });
  const contentJson = canonicalJson(content);
  const versionNumber = agg.snapshots.length + 1;
  const selected = agg.alternatives.find((a) => a.id === draft.selectedAlternativeId)!;
  const snapshot: DecisionSnapshot = {
    id: nextId("snap"), kind: "DECISAO", versionNumber, takenAt: now.toISOString(), takenByUserId: actor, contentJson, contentSha256: sha256Hex(contentJson),
    rationale: draft.rationale.trim(), confidencePct, selectedAlternativeLabel: selected.label, modelVersion: MODEL_VERSION,
  };
  // cada transição intermediária é explícita, validada e registrada na trilha (nunca um salto direto para DECIDIDA)
  let walked = agg;
  for (const to of [...path, "DECIDIDA" as const]) {
    const from = walked.decision.status;
    if (!LIFECYCLE_TRANSITIONS[from].includes(to)) throw new DecisionLifecycleError(from, to);
    if (to !== "DECIDIDA") walked = touch({ ...walked, decision: { ...walked.decision, status: to } }, now, actor, "ESTADO_ALTERADO", { from, to });
  }
  const decided: DecisionAggregate = {
    ...walked,
    decision: { ...agg.decision, status: "DECIDIDA", selectedAlternativeId: selected.id, decidedAt: now.toISOString(), rationale: draft.rationale.trim(), decisionConfidencePct: confidencePct },
    snapshots: [...agg.snapshots, snapshot],
  };
  const withTrail = touch(touch(decided, now, actor, "DECISAO_FINALIZADA", { snapshotId: snapshot.id, warnings: guard.warnings, sha256: snapshot.contentSha256 }), now, actor, "ESTADO_ALTERADO", { from: "AGUARDANDO_DECISAO", to: "DECIDIDA" });
  return { aggregate: withTrail, snapshot };
}

/** Registrar o resultado observado (único por decisão) e mover para RESOLVIDA. */
export function recordOutcome(agg: DecisionAggregate, input: { result: OutcomeResult; summary: string }, actor: string, now: Date): DecisionAggregate {
  const outcome = { id: nextId("out"), result: input.result, summary: input.summary.trim(), observedAt: now.toISOString(), recordedByUserId: actor };
  const withOutcome = touch({ ...agg, outcome, decision: { ...agg.decision, status: "RESOLVIDA" } }, now, actor, "RESULTADO_REGISTRADO", { result: input.result });
  return touch(withOutcome, now, actor, "ESTADO_ALTERADO", { to: "RESOLVIDA" });
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
  fornecedor: { kind: "CONTRATACAO", criteria: ["Custo", "Qualidade do serviço", "Prazo", "Risco de transição"] },
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
      companyId: "c-exemplo", status: "RASCUNHO", complexity: input.complexity, kind: input.kind ?? tpl?.kind ?? "OPERACIONAL", impact: input.impact, urgency: "MEDIO",
      visibility: "PRIVADA", accessClass: "INTERNO", weightingEnabled: input.complexity === "PROFUNDA", independentScoring: false, templateKey: input.templateKey,
      createdAt: iso, updatedAt: iso,
    },
    participants: [{ userId: input.ownerUserId, role: "CONDUTOR", joinedAt: iso }],
    alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], assumptions: [], risks: [], scenarios: [], forecasts: [],
    recommendations: [], triggers: [], snapshots: [], checkpoints: [], workLinks: [],
    events: [{ id: nextId("ev"), actorUserId: input.ownerUserId, type: "DECISAO_CRIADA", payload: { complexity: input.complexity }, at: iso }],
  };
  return tpl ? { ...addCriteria(agg, tpl.criteria, input.ownerUserId, now), decision: { ...agg.decision, version: 1 } } : agg;
}
