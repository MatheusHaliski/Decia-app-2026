/**
 * DECIA — cliente HTTP real da API de decisões (fase 7/7b, `GET/POST /api/decisions…`, RF29). Implementa a mesma interface
 * `DecisionRepository` do DEMO (`source: "API"`): a UI continua síncrona — lê do cache e recebe `subscribe` —, e cada escrita é
 * aplicada otimista no cache e enviada como um lote de comandos com a versão lida (409 EDICAO_CONCORRENTE devolve o estado do
 * servidor). O servidor é a fonte da verdade: guarda pré-decisão, snapshot com SHA-256, papéis DACI (403) e 404 uniforme.
 *
 * Os tipos do contrato vêm do OpenAPI gerado (`components["schemas"]`, `npm run api:types`), sem espelho manual. Como `save(agg)`
 * recebe o agregado inteiro (os comandos puros de lib/decia/commands.ts já o calcularam), o cliente converte a diferença entre o
 * último estado confirmado e o novo em comandos da API (`diffCommands`): estrutura, notas, evidência, ciclo de vida e — desde a
 * fase 7b — premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints, vínculos de trabalho e retrospectiva. Ids
 * locais criados no mesmo lote vão como `ref` e são trocados pelos UUIDs do servidor na resposta. O que a API ainda não grava
 * (`unsupportedChanges`: edição de campos da raiz, de alternativas/critérios/evidências já gravados, participantes, vínculo com item
 * do laboratório sem UUID, recomendação de IA vinda do cliente) NUNCA some em silêncio: o repositório expõe o erro
 * `DecisionApiLimitError` com a lista, e a tela avisa.
 */
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { DECISION_TEMPLATES, type NewDecisionInput } from "./commands";
import type { DecisionRepository } from "./repository";
import type { DecisionAggregate, DecisionWorkLink, WorkLinkTarget } from "./types";

// ---------------------------------------------------------------------------------------------------- contrato (gerado)

type Schemas = components["schemas"];
/** `DecisionView` do OpenAPI (contracts/openapi/openapi.json). */
export type DecisionViewDto = Schemas["DecisionView"];
/** Comando do lote (`DecisionCommand` no servidor): forma plana, cada tipo usa só os seus campos. */
export type DecisionCommandDto = Schemas["DecisionCommand"];
export type DecisionCommandType = NonNullable<DecisionCommandDto["type"]>;

export interface DecisionTransport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

const defaultTransport: DecisionTransport = { get: (p) => api.get(p), post: (p, b) => api.post(p, b) };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Id que o servidor aceita como alvo/projeto (UUID). Ids do laboratório ("decia-v1", "t-termo") não são. */
export const isServerId = (id: string | undefined | null): id is string => !!id && UUID_RE.test(id);

/** Campo opcional do contrato (o gerador marca tudo como opcional; nulos chegam como `null` no JSON). */
const u = <T,>(x: T | null | undefined): T | undefined => (x === null ? undefined : x);
const s = (x: string | null | undefined, fallback = ""): string => x ?? fallback;

/** DTO → agregado do front. */
export function fromDto(dto: DecisionViewDto): DecisionAggregate {
  const d = dto.decision ?? {};
  const createdAt = s(d.createdAt);
  return {
    decision: {
      id: s(d.id), version: d.version ?? 0, title: s(d.title), question: s(d.question), contextMd: u(d.contextMd), objective: u(d.objective),
      constraintsMd: u(d.constraintsMd), scope: u(d.scope), stakeholders: d.stakeholders ?? [], targetDate: u(d.targetDate), ownerUserId: d.ownerUserId ?? null,
      createdByUserId: s(d.createdByUserId), companyId: s(d.companyId), departmentId: u(d.departmentId), sessionId: u(d.sessionId), projectId: u(d.projectId),
      status: d.status ?? "RASCUNHO", complexity: d.complexity ?? "PADRAO", kind: d.kind ?? "OPERACIONAL", impact: d.impact ?? "MEDIO", urgency: d.urgency ?? "MEDIO",
      visibility: d.visibility ?? "PRIVADA", accessClass: s(d.accessClass, "INTERNO"), weightingEnabled: !!d.weightingEnabled, independentScoring: !!d.independentScoring,
      templateKey: u(d.templateKey), selectedAlternativeId: u(d.selectedAlternativeId), decidedAt: u(d.decidedAt), decisionConfidencePct: u(d.decisionConfidencePct),
      rationale: u(d.rationale), reviewEveryDays: u(d.reviewEveryDays), createdAt, updatedAt: s(d.updatedAt, createdAt),
    },
    participants: (dto.participants ?? []).map((p) => ({ userId: s(p.userId), role: p.role ?? "INFORMADO", joinedAt: s(p.joinedAt), assessmentsSubmittedAt: u(p.assessmentsSubmittedAt) })),
    alternatives: (dto.alternatives ?? []).map((a) => ({
      id: s(a.id), label: s(a.label), title: s(a.title), description: u(a.description), doNothing: !!a.doNothing, pros: a.pros ?? [], cons: a.cons ?? [],
      estimatedCost: u(a.estimatedCost), estimatedDurationDays: u(a.estimatedDurationDays), status: a.status ?? "ATIVA", discardReason: u(a.discardReason),
      origin: a.origin ?? "HUMANO", position: a.position ?? 0,
    })),
    criteria: (dto.criteria ?? []).map((c) => ({
      id: s(c.id), name: s(c.name), description: u(c.description), direction: c.direction ?? "MAIOR_MELHOR", weightPct: c.weightPct ?? null, catalogKey: u(c.catalogKey),
      origin: c.origin ?? "HUMANO", position: c.position ?? 0,
    })),
    assessments: (dto.assessments ?? []).map((a) => ({
      id: s(a.id), alternativeId: s(a.alternativeId), criterionId: s(a.criterionId), assessorUserId: s(a.assessorUserId), score: a.score ?? 0, rationale: u(a.rationale),
      submittedAt: s(a.submittedAt), origin: a.origin ?? "HUMANO",
    })),
    evidence: (dto.evidence ?? []).map((e) => ({
      id: s(e.id), nature: e.nature ?? "EVIDENCIA", kind: e.kind ?? "DOCUMENTO", title: s(e.title), summary: s(e.summary), sourceLabel: s(e.sourceLabel), sourceUrl: u(e.sourceUrl),
      authorLabel: u(e.authorLabel), observedAt: u(e.observedAt), retrievedAt: u(e.retrievedAt), sourceQuality: e.sourceQuality ?? "NAO_VERIFICADA", relevance: e.relevance ?? "MEDIA",
      reliability: e.reliability ?? "MEDIA", origin: e.origin ?? "HUMANO", addedByUserId: s(e.addedByUserId), addedAt: s(e.addedAt, createdAt), supersededAt: u(e.supersededAt),
    })),
    evidenceLinks: (dto.evidenceLinks ?? []).map((l, i) => ({
      id: l.id ?? `${s(l.evidenceId)}-${i}`, evidenceId: s(l.evidenceId), targetType: l.targetType ?? "ALTERNATIVA", targetId: s(l.targetId), stance: l.stance ?? "CONTEXTO", note: u(l.note),
    })),
    assumptions: (dto.assumptions ?? []).map((a) => ({
      id: s(a.id), statement: s(a.statement), importance: a.importance ?? "MEDIO", confidencePct: u(a.confidencePct), validationStatus: a.validationStatus ?? "NAO_VALIDADA",
      ownerUserId: u(a.ownerUserId), alternativeId: u(a.alternativeId), validationNote: u(a.validationNote), validatedAt: u(a.validatedAt), origin: a.origin ?? "HUMANO",
    })),
    risks: (dto.risks ?? []).map((r) => ({
      id: s(r.id), title: s(r.title), description: u(r.description), alternativeId: u(r.alternativeId), likelihood: r.likelihood ?? "POSSIVEL", impact: r.impact ?? "MEDIO",
      mitigation: u(r.mitigation), ownerUserId: u(r.ownerUserId), source: r.source ?? "MANUAL", status: r.status ?? "ABERTO", origin: r.origin ?? "HUMANO",
    })),
    scenarios: (dto.scenarios ?? []).map((x) => ({
      id: s(x.id), alternativeId: u(x.alternativeId), case: x.scenarioCase ?? "BASE", description: s(x.description), likelihood: x.likelihood ?? "POSSIVEL",
      assumptionIds: x.assumptionIds ?? [], expectedResult: s(x.expectedResult),
    })),
    forecasts: (dto.forecasts ?? []).map((f) => ({
      id: s(f.id), alternativeId: u(f.alternativeId), statement: s(f.statement), probabilityPct: f.probabilityPct ?? 50, resolveBy: s(f.resolveBy),
      forecasterUserId: s(f.forecasterUserId), resolution: f.resolution ?? "PENDENTE", resolvedAt: u(f.resolvedAt),
    })),
    recommendations: (dto.recommendations ?? []).map((r) => ({
      id: s(r.id), alternativeId: u(r.alternativeId), source: r.source ?? "MODELO", reasoningMd: s(r.reasoningMd), supporting: r.supporting ?? [], contradicting: r.contradicting ?? [],
      criticalAssumptionIds: r.criticalAssumptionIds ?? [], limitationsMd: s(r.limitationsMd), whatWouldChangeMd: s(r.whatWouldChangeMd), modelVersion: s(r.modelVersion),
      status: r.status ?? "SUGERIDA", createdAt: s(r.createdAt, createdAt),
    })),
    triggers: (dto.triggers ?? []).map((t) => ({
      id: s(t.id), conditionText: s(t.conditionText), metricKey: u(t.metricKey), comparator: u(t.comparator), threshold: u(t.threshold), status: t.status ?? "ATIVO", firedAt: u(t.firedAt),
    })),
    snapshots: (dto.snapshots ?? []).map((x) => ({
      id: s(x.id), kind: x.kind ?? "DECISAO", versionNumber: x.versionNumber ?? 0, takenAt: s(x.takenAt), takenByUserId: s(x.takenByUserId), contentJson: s(x.contentJson),
      contentSha256: s(x.contentSha256), rationale: s(x.rationale), confidencePct: u(x.confidencePct), selectedAlternativeLabel: x.selectedAlternativeLabel ?? "—",
      modelVersion: s(x.modelVersion),
    })),
    checkpoints: (dto.checkpoints ?? []).map((c) => ({
      id: s(c.id), dueAt: s(c.dueAt), kind: c.kind ?? "PROGRAMADO", status: c.status ?? "AGENDADO", completedAt: u(c.completedAt), completedByUserId: u(c.completedByUserId),
      stillValid: u(c.stillValid), assumptionsChanged: u(c.assumptionsChanged), newEvidence: u(c.newEvidence), confidencePctAfter: u(c.confidencePctAfter), action: u(c.action), note: u(c.note),
    })),
    outcome: dto.outcome
      ? { id: s(dto.outcome.id), result: dto.outcome.result ?? "PARCIAL", observedAt: s(dto.outcome.observedAt), summary: s(dto.outcome.summary), recordedByUserId: s(dto.outcome.recordedByUserId) }
      : undefined,
    retrospective: dto.retrospective
      ? {
        id: s(dto.retrospective.id), outcomeId: u(dto.retrospective.outcomeId), whatHappened: s(dto.retrospective.whatHappened), whatExpected: s(dto.retrospective.whatExpected),
        whatWasRight: s(dto.retrospective.whatWasRight), whatWasWrong: s(dto.retrospective.whatWasWrong), failedAssumptionIds: dto.retrospective.failedAssumptionIds ?? [],
        processQuality: dto.retrospective.processQuality ?? "PARCIAL", lessonsMd: s(dto.retrospective.lessonsMd), shareAsLesson: !!dto.retrospective.shareAsLesson,
        reviewedByUserId: s(dto.retrospective.reviewedByUserId), reviewedAt: s(dto.retrospective.reviewedAt),
      }
      : undefined,
    // o vínculo não copia dados (§4.2): o rótulo do alvo é resolvido por quem exibe (workLinkLabel em components/decia)
    workLinks: (dto.workLinks ?? []).map((w) => ({ id: s(w.id), targetType: w.targetType ?? "TAREFA", targetId: s(w.targetId), label: "", createdByUserId: s(w.createdByUserId), createdAt: s(w.createdAt) })),
    events: (dto.events ?? []).map((e) => ({ id: s(e.id), actorUserId: e.actorUserId ?? null, type: e.type ?? "ESTADO_ALTERADO", payload: (e.payload ?? {}) as Record<string, unknown>, at: s(e.at), correlationId: u(e.correlationId) })),
  };
}

// ---------------------------------------------------------------------------------------------------- limites da API

/** O que a API ainda não grava (a tela avisa e desabilita; nada some em silêncio). */
export const API_LIMITS = ["decision.fields", "alternatives.edit", "criteria.edit", "evidence.edit", "participants", "workLinks.labTarget", "recommendations.ai", "outcome.edit"] as const;
export type ApiLimit = (typeof API_LIMITS)[number];

/** Mudança feita na tela que a API não grava: o resto do lote vai; isto volta ao estado do servidor e a tela mostra o aviso. */
export class DecisionApiLimitError extends Error {
  readonly code = "DECISAO_LIMITE_API";
  constructor(readonly limits: readonly ApiLimit[]) {
    super(`DECISAO_LIMITE_API: ${limits.join(", ")}`);
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const ROOT_FIELDS = ["title", "question", "contextMd", "objective", "constraintsMd", "scope", "stakeholders", "targetDate", "kind", "impact", "urgency", "visibility", "complexity", "weightingEnabled", "independentScoring", "reviewEveryDays"] as const;

/** Mudanças de `base` para `next` que nenhum comando da API expressa. */
export function unsupportedChanges(base: DecisionAggregate, next: DecisionAggregate, alias: (id: string) => string = (x) => x): ApiLimit[] {
  const out = new Set<ApiLimit>();
  if (ROOT_FIELDS.some((k) => !same(base.decision[k] ?? null, next.decision[k] ?? null))) out.add("decision.fields");
  const edited = <T extends { id: string }>(before: readonly T[], after: readonly T[], pick: (x: T) => unknown) => {
    const map = new Map(after.map((x) => [alias(x.id), x]));
    return before.some((b) => { const a = map.get(b.id); return !a || !same(pick(a), pick(b)); });
  };
  if (edited(base.alternatives, next.alternatives, (a) => [a.title, a.description, a.status, a.pros, a.cons, a.doNothing, a.discardReason])) out.add("alternatives.edit");
  if (edited(base.criteria, next.criteria, (c) => [c.name, c.description, c.direction])) out.add("criteria.edit");
  if (edited(base.evidence, next.evidence, (e) => [e.title, e.nature, e.reliability, e.sourceLabel, e.summary, e.supersededAt ?? null])) out.add("evidence.edit");
  if (!same(base.participants.map((p) => [p.userId, p.role]), next.participants.map((p) => [p.userId, p.role]))) out.add("participants");
  const known = new Set(base.workLinks.map((w) => `${w.targetType}|${w.targetId}`));
  if (next.workLinks.some((w) => !known.has(`${w.targetType}|${w.targetId}`) && !isServerId(w.targetId))) out.add("workLinks.labTarget");
  const recIds = new Set(base.recommendations.map((r) => r.id));
  if (next.recommendations.some((r) => !recIds.has(alias(r.id)) && r.source !== "MODELO")) out.add("recommendations.ai");
  if (base.outcome && next.outcome && !same([base.outcome.result, base.outcome.summary], [next.outcome.result, next.outcome.summary])) out.add("outcome.edit");
  return [...out];
}

// ---------------------------------------------------------------------------------------------------- diferença → comandos

type Keyed = { id: string };

/** Registros novos (id que o servidor não conhece), alterados (conteúdo diferente) e removidos, já com os ids do servidor. */
function delta<T extends Keyed>(before: readonly T[], after: readonly T[], alias: (id: string) => string, pick: (x: T) => unknown) {
  const prev = new Map(before.map((x) => [x.id, x]));
  const added: T[] = [];
  const changed: { id: string; item: T }[] = [];
  const seen = new Set<string>();
  for (const x of after) {
    const id = alias(x.id);
    const old = prev.get(id);
    if (!old) added.push(x);
    else {
      seen.add(id);
      if (!same(pick(old), pick(x))) changed.push({ id, item: x });
    }
  }
  const removed = before.filter((x) => !seen.has(x.id)).map((x) => x.id);
  return { added, changed, removed };
}

/**
 * Comandos que levam `base` (último estado confirmado pelo servidor) até `next` (o que a UI calculou). `alias` troca ids locais já
 * confirmados pelos do servidor. Ordem: criar alternativas/critérios, pesos, notas de `userId`, evidências, registros da fase 7b
 * (premissas antes de cenários/recomendações/retrospectiva, que as citam) e, por fim, o ciclo de vida (decidir, resultado ou transição).
 */
export function diffCommands(base: DecisionAggregate, next: DecisionAggregate, userId: string, alias: (id: string) => string = (x) => x): DecisionCommandDto[] {
  const out: DecisionCommandDto[] = [];
  const ref = (id: string) => alias(id);
  const altIds = new Set(base.alternatives.map((a) => a.id));
  const critIds = new Set(base.criteria.map((c) => c.id));
  for (const a of next.alternatives) {
    if (!altIds.has(alias(a.id))) out.push({ type: "ADD_ALTERNATIVE", ref: a.id, title: a.title, doNothing: a.doNothing });
  }
  for (const c of next.criteria) {
    if (!critIds.has(alias(c.id))) out.push({ type: "ADD_CRITERION", ref: c.id, name: c.name });
  }
  const baseCrit = new Map(base.criteria.map((c) => [c.id, c]));
  for (const c of next.criteria) {
    const before = baseCrit.get(alias(c.id));
    const was = before ? before.weightPct : null;
    if ((c.weightPct ?? null) !== (was ?? null)) out.push({ type: "SET_WEIGHT", criterionId: before ? before.id : c.id, weightPct: c.weightPct ?? undefined });
  }
  const key = (alt: string, crit: string) => `${alias(alt)}|${alias(crit)}`;
  const mine = (agg: DecisionAggregate) => new Map(agg.assessments.filter((a) => a.assessorUserId === userId).map((a) => [key(a.alternativeId, a.criterionId), a]));
  const before = mine(base);
  const after = mine(next);
  for (const [k, a] of after) {
    if (before.get(k)?.score !== a.score) out.push({ type: "SET_SCORE", alternativeId: ref(a.alternativeId), criterionId: ref(a.criterionId), score: a.score });
  }
  for (const [k, a] of before) {
    // score ausente = remover a nota de quem pede (o servidor trata nulo e ausente igual)
    if (!after.has(k)) out.push({ type: "SET_SCORE", alternativeId: a.alternativeId, criterionId: a.criterionId });
  }
  const evIds = new Set(base.evidence.map((e) => e.id));
  for (const e of next.evidence) {
    if (evIds.has(alias(e.id))) continue;
    const link = next.evidenceLinks.find((l) => l.evidenceId === e.id && l.targetType === "ALTERNATIVA");
    out.push({
      type: "ADD_EVIDENCE", title: e.title, nature: e.nature, sourceLabel: e.sourceLabel, reliability: e.reliability,
      ...(link ? { alternativeId: ref(link.targetId), stance: link.stance } : {}),
    });
  }
  out.push(...recordCommands(base, next, alias));
  const from = base.decision.status;
  const to = next.decision.status;
  if (to !== from) {
    if (next.outcome && !base.outcome) {
      out.push({ type: "RECORD_OUTCOME", result: next.outcome.result, summary: next.outcome.summary });
    } else if (to === "DECIDIDA" && next.decision.selectedAlternativeId) {
      out.push({
        type: "DECIDE", alternativeId: ref(next.decision.selectedAlternativeId), rationale: next.decision.rationale ?? "",
        confidencePct: next.decision.decisionConfidencePct,
        // a UI só chega a DECIDIDA depois do guarda local sem bloqueios e com os avisos confirmados (commands.decide)
        warningsConfirmed: true,
      });
    } else {
      out.push({ type: "TRANSITION", to });
    }
  }
  // retrospectiva depois do resultado (o servidor exige o resultado gravado)
  if (next.retrospective && !same(base.retrospective && retroBody(base.retrospective, alias), retroBody(next.retrospective, alias))) {
    out.push({ type: "PUT_RETROSPECTIVE", retrospective: retroBody(next.retrospective, alias) });
  }
  return out.map(clean);
}

const opt = (id: string | undefined, alias: (id: string) => string) => (id ? alias(id) : undefined);
const retroBody = (r: NonNullable<DecisionAggregate["retrospective"]>, alias: (id: string) => string) => ({
  whatHappened: r.whatHappened, whatExpected: r.whatExpected, whatWasRight: r.whatWasRight, whatWasWrong: r.whatWasWrong,
  failedAssumptionIds: r.failedAssumptionIds.map(alias), processQuality: r.processQuality, lessonsMd: r.lessonsMd, shareAsLesson: r.shareAsLesson,
});

/** Premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints e vínculos (fase 7b). */
function recordCommands(base: DecisionAggregate, next: DecisionAggregate, alias: (id: string) => string): DecisionCommandDto[] {
  const out: DecisionCommandDto[] = [];
  const put = <T extends Keyed>(type: DecisionCommandType, removeType: DecisionCommandType | null, field: keyof DecisionCommandDto, before: readonly T[], after: readonly T[], body: (x: T) => object) => {
    const d = delta(before, after, alias, body);
    for (const x of d.added) out.push({ type, ref: x.id, [field]: body(x) });
    for (const c of d.changed) out.push({ type, itemId: c.id, [field]: body(c.item) });
    if (removeType) for (const id of d.removed) out.push({ type: removeType, itemId: id });
  };
  put("PUT_ASSUMPTION", "REMOVE_ASSUMPTION", "assumption", base.assumptions, next.assumptions, (a) => ({
    statement: a.statement, importance: a.importance, confidencePct: a.confidencePct, validationStatus: a.validationStatus, ownerUserId: a.ownerUserId,
    alternativeId: opt(a.alternativeId, alias), validationNote: a.validationNote,
  }));
  put("PUT_RISK", "REMOVE_RISK", "risk", base.risks, next.risks.filter((r) => r.source !== "IA" || base.risks.some((b) => b.id === alias(r.id))), (r) => ({
    title: r.title, description: r.description, alternativeId: opt(r.alternativeId, alias), likelihood: r.likelihood, impact: r.impact, mitigation: r.mitigation,
    ownerUserId: r.ownerUserId, source: r.source === "IA" ? undefined : r.source, status: r.status,
  }));
  put("PUT_SCENARIO", "REMOVE_SCENARIO", "scenario", base.scenarios, next.scenarios, (x) => ({
    alternativeId: opt(x.alternativeId, alias), scenarioCase: x.case, description: x.description, likelihood: x.likelihood, assumptionIds: x.assumptionIds.map(alias),
    expectedResult: x.expectedResult,
  }));
  // previsões: nova (a de quem está logado), resolução ou ajuste da própria; nunca apagadas (calibração)
  const fd = delta(base.forecasts, next.forecasts, alias, (f) => [f.statement, f.probabilityPct, f.resolveBy, f.resolution]);
  for (const f of fd.added) out.push({ type: "PUT_FORECAST", ref: f.id, forecast: { alternativeId: opt(f.alternativeId, alias), statement: f.statement, probabilityPct: f.probabilityPct, resolveBy: f.resolveBy.slice(0, 10) } });
  for (const { id, item: f } of fd.changed) {
    const old = base.forecasts.find((x) => x.id === id);
    out.push(old && old.resolution !== f.resolution
      ? { type: "PUT_FORECAST", itemId: id, forecast: { resolution: f.resolution } }
      : { type: "PUT_FORECAST", itemId: id, forecast: { alternativeId: opt(f.alternativeId, alias), statement: f.statement, probabilityPct: f.probabilityPct, resolveBy: f.resolveBy.slice(0, 10) } });
  }
  // recomendações: MODELO nova com os quatro porquês; nas existentes, só a resposta (aceitar/descartar)
  const rd = delta(base.recommendations, next.recommendations, alias, (r) => r.status);
  for (const r of rd.added.filter((x) => x.source === "MODELO")) {
    out.push({
      type: "PUT_RECOMMENDATION", ref: r.id, recommendation: {
        alternativeId: opt(r.alternativeId, alias), source: "MODELO", reasoningMd: r.reasoningMd, supporting: r.supporting, contradicting: r.contradicting,
        criticalAssumptionIds: r.criticalAssumptionIds.map(alias), limitationsMd: r.limitationsMd, whatWouldChangeMd: r.whatWouldChangeMd,
      },
    });
  }
  for (const { id, item } of rd.changed) out.push({ type: "PUT_RECOMMENDATION", itemId: id, recommendation: { status: item.status } });
  put("PUT_TRIGGER", "REMOVE_TRIGGER", "trigger", base.triggers, next.triggers, (t) => ({
    conditionText: t.conditionText, metricKey: t.metricKey, comparator: t.comparator, threshold: t.threshold, status: t.status,
  }));
  const cd = delta(base.checkpoints, next.checkpoints, alias, (c) => [c.dueAt, c.status, c.action ?? null, c.note ?? null, c.confidencePctAfter ?? null]);
  const cpBody = (c: DecisionAggregate["checkpoints"][number]) => ({
    dueAt: c.dueAt, kind: c.kind, status: c.status, stillValid: c.stillValid, assumptionsChanged: c.assumptionsChanged, newEvidence: c.newEvidence,
    confidencePctAfter: c.confidencePctAfter, action: c.action, note: c.note,
  });
  for (const c of cd.added) out.push({ type: "PUT_CHECKPOINT", ref: c.id, checkpoint: cpBody(c) });
  for (const { id, item } of cd.changed) out.push({ type: "PUT_CHECKPOINT", itemId: id, checkpoint: cpBody(item) });
  // vínculos de trabalho: só alvos com UUID do servidor (os do laboratório viram aviso em unsupportedChanges)
  const linkKey = (w: DecisionWorkLink) => `${w.targetType}|${w.targetId}`;
  const baseLinks = new Map(base.workLinks.map((w) => [linkKey(w), w]));
  const nextLinks = new Set(next.workLinks.map(linkKey));
  for (const w of next.workLinks) {
    if (!baseLinks.has(linkKey(w)) && isServerId(w.targetId)) out.push({ type: "LINK_WORK", ref: w.id, workLink: { targetType: w.targetType, targetId: w.targetId } });
  }
  for (const [k, w] of baseLinks) if (!nextLinks.has(k)) out.push({ type: "UNLINK_WORK", itemId: w.id });
  return out;
}

/** Tira campos `undefined` (o JSON fica igual ao que o servidor espera e os testes comparam objetos limpos). */
function clean<T extends object>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

// ---------------------------------------------------------------------------------------------------- repositório HTTP

export type HttpStatus = "idle" | "loading" | "ready" | "error";

export interface HttpDecisionRepository extends DecisionRepository {
  readonly source: "API";
  /** Estado da carga inicial (a tela mostra carregando/erro). */
  status(): HttpStatus;
  /** Último erro de escrita ou leitura (ApiError com code/status, ou DecisionApiLimitError), ou `null`. */
  lastError(): unknown;
  /** Relê a lista do servidor. */
  refresh(): Promise<void>;
  /** Espera as escritas em voo (testes e navegação). */
  settled(): Promise<void>;
}

export interface HttpRepositoryOptions {
  /** id da pessoa logada (as notas enviadas são dela; o servidor confere) */
  userId: string;
  transport?: DecisionTransport;
  limit?: number;
}

export function createHttpRepository(opts: HttpRepositoryOptions): HttpDecisionRepository {
  const transport = opts.transport ?? defaultTransport;
  const listeners = new Set<() => void>();
  let items: readonly DecisionAggregate[] = [];
  const confirmed = new Map<string, DecisionAggregate>();
  const aliases = new Map<string, string>();
  const creations = new Map<string, Promise<string>>();
  let state: HttpStatus = "idle";
  let error: unknown = null;
  let chain: Promise<void> = Promise.resolve();
  let loading: Promise<void> | null = null;

  const emit = () => listeners.forEach((l) => l());
  const alias = (id: string) => aliases.get(id) ?? id;
  const put = (agg: DecisionAggregate, replaceId = agg.decision.id) => {
    const i = items.findIndex((a) => a.decision.id === replaceId);
    items = i < 0 ? [agg, ...items] : items.map((a, j) => (j === i ? agg : a));
  };
  const enqueue = (job: () => Promise<void>) => {
    chain = chain.then(job, job);
    return chain;
  };
  const merge = (list: readonly DecisionAggregate[]) => {
    for (const a of list) {
      confirmed.set(a.decision.id, a);
      put(a);
    }
  };

  async function load() {
    state = "loading";
    emit();
    try {
      const list = await transport.get<DecisionViewDto[]>(`/api/decisions?limit=${opts.limit ?? 50}`);
      const mapped = list.map(fromDto);
      mapped.forEach((a) => confirmed.set(a.decision.id, a));
      // escritas otimistas ainda em voo e decisões lidas por vínculo ficam por cima do que veio
      const ids = new Set(mapped.map((a) => a.decision.id));
      const pending = items.filter((a) => !ids.has(alias(a.decision.id)));
      items = [...pending, ...mapped];
      state = "ready";
    } catch (e) {
      error = e;
      state = "error";
      items = [...items]; // snapshot novo: a tela re-renderiza e mostra o erro
    }
    emit();
  }

  /** Liga ids locais (refs) aos do servidor: alternativas e critérios pela ordem de criação; registros 7b pelo conteúdo. */
  function learnAliases(base: DecisionAggregate, sent: DecisionCommandDto[], server: DecisionAggregate, local: DecisionAggregate) {
    const fresh = <T extends Keyed>(known: readonly Keyed[], list: readonly T[]) => { const ids = new Set(known.map((x) => x.id)); return list.filter((x) => !ids.has(x.id)); };
    const byPos = <T extends { id: string; position: number }>(list: T[]) => [...list].sort((a, b) => a.position - b.position);
    const newAlts = byPos(fresh(base.alternatives, server.alternatives));
    const newCrits = byPos(fresh(base.criteria, server.criteria));
    sent.filter((c) => c.type === "ADD_ALTERNATIVE").forEach((c, i) => { if (c.ref && newAlts[i]) aliases.set(c.ref, newAlts[i].id); });
    sent.filter((c) => c.type === "ADD_CRITERION").forEach((c, i) => { if (c.ref && newCrits[i]) aliases.set(c.ref, newCrits[i].id); });
    const match = <T extends Keyed>(type: DecisionCommandType, known: readonly T[], serverList: readonly T[], localList: readonly T[], sig: (x: T) => string) => {
      const pool = fresh(known, serverList);
      for (const c of sent.filter((x) => x.type === type && x.ref)) {
        const mine = localList.find((x) => x.id === c.ref);
        const k = mine ? pool.findIndex((x) => sig(x) === sig(mine)) : -1;
        if (k >= 0) { aliases.set(c.ref!, pool[k].id); pool.splice(k, 1); }
      }
    };
    match("PUT_ASSUMPTION", base.assumptions, server.assumptions, local.assumptions, (x) => x.statement);
    match("PUT_RISK", base.risks, server.risks, local.risks, (x) => x.title);
    match("PUT_SCENARIO", base.scenarios, server.scenarios, local.scenarios, (x) => `${x.case}|${x.description}`);
    match("PUT_FORECAST", base.forecasts, server.forecasts, local.forecasts, (x) => x.statement);
    match("PUT_RECOMMENDATION", base.recommendations, server.recommendations, local.recommendations, (x) => x.reasoningMd);
    match("PUT_TRIGGER", base.triggers, server.triggers, local.triggers, (x) => x.conditionText);
    match("PUT_CHECKPOINT", base.checkpoints, server.checkpoints, local.checkpoints, (x) => x.dueAt.slice(0, 19));
    match("LINK_WORK", base.workLinks, server.workLinks, local.workLinks, (x) => `${x.targetType}|${x.targetId}`);
  }

  const repo: HttpDecisionRepository = {
    source: "API",
    list: () => items,
    get: (id) => items.find((a) => a.decision.id === alias(id)) ?? items.find((a) => a.decision.id === id),
    status: () => state,
    lastError: () => error,
    refresh: () => (loading = load()),
    settled: () => chain.then(() => loading ?? undefined),
    ready() {
      if (state === "idle") loading = load();
      return chain.then(() => loading ?? undefined);
    },
    confirmedId(id) {
      return creations.get(id) ?? Promise.resolve(alias(id));
    },
    async linkedTo(type: WorkLinkTarget, targetId: string) {
      if (!isServerId(targetId)) return;
      try {
        const list = await transport.get<DecisionViewDto[]>(`/api/decisions?targetType=${type}&targetId=${encodeURIComponent(targetId)}&limit=50`);
        merge(list.map(fromDto));
      } catch (e) {
        error = e;
        items = [...items];
      }
      emit();
    },
    save(agg) {
      const localId = agg.decision.id;
      put(agg, alias(localId));
      emit();
      void enqueue(async () => {
        const id = alias(localId);
        const base = confirmed.get(id);
        if (!base) {
          error = new Error("DECISAO_NAO_CONFIRMADA");
          emit();
          return;
        }
        const limits = unsupportedChanges(base, agg, alias);
        const commands = diffCommands(base, agg, opts.userId, alias);
        if (!commands.length) {
          // nada que a API grave mudou: a tela volta ao estado confirmado (ids do servidor) e avisa o que não foi gravado
          put(base, id);
          error = limits.length ? new DecisionApiLimitError(limits) : error;
          emit();
          return;
        }
        try {
          const dto = await transport.post<DecisionViewDto>(`/api/decisions/${encodeURIComponent(id)}/commands`, { version: base.decision.version, commands });
          const server = fromDto(dto);
          learnAliases(base, commands, server, agg);
          confirmed.set(id, server);
          put(server, id);
          error = limits.length ? new DecisionApiLimitError(limits) : null;
        } catch (e) {
          // 409/403/422: volta ao último estado do servidor; a tela lê `lastError()`
          error = e;
          put(base, id);
        }
        emit();
      });
    },
    create(input: NewDecisionInput, now = new Date()) {
      const tempId = `local-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const iso = now.toISOString();
      const tpl = input.templateKey ? DECISION_TEMPLATES[input.templateKey] : undefined;
      const question = input.question.trim();
      const projectId = isServerId(input.projectId) ? input.projectId : undefined;
      const local: DecisionAggregate = {
        decision: {
          id: tempId, version: 0, title: question.replace(/\?$/, "").slice(0, 160), question, stakeholders: [], ownerUserId: opts.userId,
          createdByUserId: opts.userId, companyId: "", status: "RASCUNHO", complexity: input.complexity, kind: input.kind ?? tpl?.kind ?? "OPERACIONAL",
          impact: input.impact, urgency: "MEDIO", visibility: "PRIVADA", accessClass: "INTERNO", weightingEnabled: input.complexity === "PROFUNDA",
          independentScoring: false, templateKey: input.templateKey, projectId, createdAt: iso, updatedAt: iso,
        },
        participants: [{ userId: opts.userId, role: "CONDUTOR", joinedAt: iso }],
        alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], assumptions: [], risks: [], scenarios: [], forecasts: [],
        recommendations: [], triggers: [], snapshots: [], checkpoints: [], workLinks: [], events: [],
      };
      put(local);
      emit();
      let settle: (id: string) => void = () => {};
      creations.set(tempId, new Promise<string>((resolve) => { settle = resolve; }));
      void enqueue(async () => {
        try {
          const dto = await transport.post<DecisionViewDto>("/api/decisions", {
            question, complexity: input.complexity, impact: input.impact, kind: input.kind ?? tpl?.kind, templateKey: input.templateKey,
            criteria: tpl?.criteria ?? [], ...(projectId ? { projectId } : {}),
          });
          const server = fromDto(dto);
          aliases.set(tempId, server.decision.id);
          confirmed.set(server.decision.id, server);
          put(server, tempId);
          error = null;
          settle(server.decision.id);
        } catch (e) {
          error = e;
          items = items.filter((a) => a.decision.id !== tempId);
          settle(tempId);
        }
        emit();
      });
      return local;
    },
    subscribe(listener) {
      listeners.add(listener);
      if (state === "idle") loading = load();
      return () => listeners.delete(listener);
    },
  };
  return repo;
}

let shared: { userId: string; repo: HttpDecisionRepository } | null = null;
/** Repositório da API da aba para a pessoa logada (troca de conta = cache novo). */
export function httpRepository(userId: string): HttpDecisionRepository {
  if (!shared || shared.userId !== userId) shared = { userId, repo: createHttpRepository({ userId }) };
  return shared.repo;
}
/** Só para testes. */
export function resetHttpRepository() {
  shared = null;
}
