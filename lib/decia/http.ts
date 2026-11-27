/**
 * DECIA — cliente HTTP real da API de decisões (fase 7, `GET/POST /api/decisions…`, RF29). Implementa a mesma interface
 * `DecisionRepository` do DEMO (`source: "API"`): a UI continua síncrona — lê do cache e recebe `subscribe` —, e cada escrita é
 * aplicada otimista no cache e enviada como um lote de comandos com a versão lida (409 EDICAO_CONCORRENTE devolve o estado do
 * servidor). O servidor é a fonte da verdade: guarda pré-decisão, snapshot com SHA-256, papéis DACI (403) e 404 uniforme.
 *
 * Como `save(agg)` recebe o agregado inteiro (os comandos puros de lib/decia/commands.ts já o calcularam), o cliente converte a
 * diferença entre o último estado confirmado e o novo em comandos da API (`diffCommands`). Ids locais de alternativas e critérios
 * criados no mesmo lote vão como `ref` e são trocados pelos UUIDs do servidor na resposta. O que a API ainda não grava (premissas,
 * riscos, cenários, previsões, recomendações, gatilhos, checkpoints, retrospectiva, vínculos) não vira comando e some na volta do
 * servidor — ver docs/decia/08 (fase 7).
 */
import { api } from "@/lib/api/client";
import { DECISION_TEMPLATES, type NewDecisionInput } from "./commands";
import type { DecisionRepository } from "./repository";
import type {
  ContentOrigin, DecisionAggregate, DecisionComplexity, DecisionEventType, DecisionKind, DecisionLevel, DecisionLifecycle, DecisionRole,
  EvidenceKind, EvidenceNature, EvidenceStance, EvidenceTargetType, OutcomeResult, RelevanceLevel, SnapshotKind, SourceQuality, Visibility,
} from "./types";

// ---------------------------------------------------------------------------------------------------- contrato (DecisionView)

type Opt<T> = T | null | undefined;

/** Espelho do `DecisionView` do OpenAPI (contracts/openapi/openapi.json): mesmos nomes; datas em ISO-8601. */
export interface DecisionViewDto {
  decision: {
    id: string; version: number; title: string; question: string; contextMd?: Opt<string>; objective?: Opt<string>; constraintsMd?: Opt<string>;
    scope?: Opt<string>; stakeholders?: Opt<string[]>; targetDate?: Opt<string>; ownerUserId: string; createdByUserId: string; companyId: string;
    departmentId?: Opt<string>; sessionId?: Opt<string>; projectId?: Opt<string>; status: DecisionLifecycle; complexity: DecisionComplexity;
    kind: DecisionKind; impact: DecisionLevel; urgency: DecisionLevel; visibility: Visibility; accessClass: string; weightingEnabled: boolean;
    independentScoring: boolean; templateKey?: Opt<string>; selectedAlternativeId?: Opt<string>; decidedAt?: Opt<string>;
    decisionConfidencePct?: Opt<number>; rationale?: Opt<string>; reviewEveryDays?: Opt<number>; createdAt: string; updatedAt: string;
  };
  participants?: { userId: string; role: DecisionRole; joinedAt: string; assessmentsSubmittedAt?: Opt<string> }[];
  alternatives?: {
    id: string; label: string; title: string; description?: Opt<string>; doNothing: boolean; pros?: Opt<string[]>; cons?: Opt<string[]>;
    estimatedCost?: Opt<string>; estimatedDurationDays?: Opt<number>; status: "ATIVA" | "DESCARTADA"; discardReason?: Opt<string>;
    origin: ContentOrigin; position: number;
  }[];
  criteria?: { id: string; name: string; description?: Opt<string>; direction: "MAIOR_MELHOR" | "MENOR_MELHOR"; weightPct?: Opt<number>; catalogKey?: Opt<string>; origin: ContentOrigin; position: number }[];
  assessments?: { id: string; alternativeId: string; criterionId: string; assessorUserId: string; score: number; rationale?: Opt<string>; submittedAt: string; origin: ContentOrigin }[];
  evidence?: {
    id: string; nature: EvidenceNature; kind: EvidenceKind; title: string; summary?: Opt<string>; sourceLabel: string; sourceUrl?: Opt<string>;
    authorLabel?: Opt<string>; observedAt?: Opt<string>; retrievedAt?: Opt<string>; sourceQuality: SourceQuality; relevance: RelevanceLevel;
    reliability: RelevanceLevel; origin: ContentOrigin; addedByUserId: string; addedAt?: Opt<string>; supersededAt?: Opt<string>;
  }[];
  evidenceLinks?: { id?: Opt<string>; evidenceId: string; targetType: EvidenceTargetType; targetId: string; stance: EvidenceStance; note?: Opt<string> }[];
  snapshots?: {
    id: string; kind: SnapshotKind; versionNumber: number; takenAt: string; takenByUserId: string; contentJson: string; contentSha256: string;
    rationale: string; confidencePct?: Opt<number>; selectedAlternativeLabel?: Opt<string>; modelVersion: string;
  }[];
  outcome?: Opt<{ id: string; result: OutcomeResult; observedAt: string; summary: string; recordedByUserId: string }>;
  events?: { id: string; actorUserId?: Opt<string>; type: DecisionEventType; payload?: Opt<Record<string, unknown>>; at: string; correlationId?: Opt<string> }[];
  permissions?: { editStructure: boolean; assess: boolean; decide: boolean; reopen: boolean; edit: boolean };
}

/** Comando do lote (`DecisionCommand` no servidor): forma plana, cada tipo usa só os seus campos. */
export interface DecisionCommandDto {
  type: "TRANSITION" | "REOPEN" | "ADD_ALTERNATIVE" | "ADD_CRITERION" | "SET_WEIGHT" | "SET_SCORE" | "ADD_EVIDENCE" | "DECIDE" | "RECORD_OUTCOME";
  ref?: string; to?: DecisionLifecycle; title?: string; doNothing?: boolean; name?: string; criterionId?: string; weightPct?: number | null;
  alternativeId?: string; score?: number | null; rationale?: string; confidencePct?: number | null; warningsConfirmed?: boolean;
  result?: OutcomeResult; summary?: string; nature?: EvidenceNature; sourceLabel?: string; reliability?: RelevanceLevel; stance?: EvidenceStance;
}

export interface DecisionTransport {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

const defaultTransport: DecisionTransport = { get: (p) => api.get(p), post: (p, b) => api.post(p, b) };

const u = <T,>(x: Opt<T>): T | undefined => (x === null ? undefined : x);

/** DTO → agregado do front. Coleções que a API ainda não grava voltam vazias. */
export function fromDto(dto: DecisionViewDto): DecisionAggregate {
  const d = dto.decision;
  return {
    decision: {
      id: d.id, version: d.version, title: d.title, question: d.question, contextMd: u(d.contextMd), objective: u(d.objective),
      constraintsMd: u(d.constraintsMd), scope: u(d.scope), stakeholders: d.stakeholders ?? [], targetDate: u(d.targetDate), ownerUserId: d.ownerUserId,
      createdByUserId: d.createdByUserId, companyId: d.companyId, departmentId: u(d.departmentId), sessionId: u(d.sessionId), projectId: u(d.projectId),
      status: d.status, complexity: d.complexity, kind: d.kind, impact: d.impact, urgency: d.urgency, visibility: d.visibility, accessClass: d.accessClass,
      weightingEnabled: d.weightingEnabled, independentScoring: d.independentScoring, templateKey: u(d.templateKey),
      selectedAlternativeId: u(d.selectedAlternativeId), decidedAt: u(d.decidedAt), decisionConfidencePct: u(d.decisionConfidencePct),
      rationale: u(d.rationale), reviewEveryDays: u(d.reviewEveryDays), createdAt: d.createdAt, updatedAt: d.updatedAt,
    },
    participants: (dto.participants ?? []).map((p) => ({ userId: p.userId, role: p.role, joinedAt: p.joinedAt, assessmentsSubmittedAt: u(p.assessmentsSubmittedAt) })),
    alternatives: (dto.alternatives ?? []).map((a) => ({
      id: a.id, label: a.label, title: a.title, description: u(a.description), doNothing: a.doNothing, pros: a.pros ?? [], cons: a.cons ?? [],
      estimatedCost: u(a.estimatedCost), estimatedDurationDays: u(a.estimatedDurationDays), status: a.status, discardReason: u(a.discardReason),
      origin: a.origin, position: a.position,
    })),
    criteria: (dto.criteria ?? []).map((c) => ({
      id: c.id, name: c.name, description: u(c.description), direction: c.direction, weightPct: c.weightPct ?? null, catalogKey: u(c.catalogKey),
      origin: c.origin, position: c.position,
    })),
    assessments: (dto.assessments ?? []).map((a) => ({
      id: a.id, alternativeId: a.alternativeId, criterionId: a.criterionId, assessorUserId: a.assessorUserId, score: a.score, rationale: u(a.rationale),
      submittedAt: a.submittedAt, origin: a.origin,
    })),
    evidence: (dto.evidence ?? []).map((e) => ({
      id: e.id, nature: e.nature, kind: e.kind, title: e.title, summary: e.summary ?? "", sourceLabel: e.sourceLabel, sourceUrl: u(e.sourceUrl),
      authorLabel: u(e.authorLabel), observedAt: u(e.observedAt), retrievedAt: u(e.retrievedAt), sourceQuality: e.sourceQuality, relevance: e.relevance,
      reliability: e.reliability, origin: e.origin, addedByUserId: e.addedByUserId, addedAt: e.addedAt ?? d.createdAt, supersededAt: u(e.supersededAt),
    })),
    evidenceLinks: (dto.evidenceLinks ?? []).map((l, i) => ({
      id: l.id ?? `${l.evidenceId}-${i}`, evidenceId: l.evidenceId, targetType: l.targetType, targetId: l.targetId, stance: l.stance, note: u(l.note),
    })),
    assumptions: [], risks: [], scenarios: [], forecasts: [], recommendations: [], triggers: [],
    snapshots: (dto.snapshots ?? []).map((s) => ({
      id: s.id, kind: s.kind, versionNumber: s.versionNumber, takenAt: s.takenAt, takenByUserId: s.takenByUserId, contentJson: s.contentJson,
      contentSha256: s.contentSha256, rationale: s.rationale, confidencePct: u(s.confidencePct), selectedAlternativeLabel: s.selectedAlternativeLabel ?? "—",
      modelVersion: s.modelVersion,
    })),
    checkpoints: [],
    outcome: dto.outcome ? { id: dto.outcome.id, result: dto.outcome.result, observedAt: dto.outcome.observedAt, summary: dto.outcome.summary, recordedByUserId: dto.outcome.recordedByUserId } : undefined,
    workLinks: [],
    events: (dto.events ?? []).map((e) => ({ id: e.id, actorUserId: e.actorUserId ?? null, type: e.type, payload: e.payload ?? {}, at: e.at, correlationId: u(e.correlationId) })),
  };
}

// ---------------------------------------------------------------------------------------------------- diferença → comandos

/**
 * Comandos que levam `base` (último estado confirmado pelo servidor) até `next` (o que a UI calculou). `alias` troca ids locais já
 * confirmados pelos do servidor. Ordem: criar alternativas/critérios, pesos, notas de `userId`, evidências e, por fim, o ciclo de vida
 * (decidir, resultado ou transição).
 */
export function diffCommands(base: DecisionAggregate, next: DecisionAggregate, userId: string, alias: (id: string) => string = (x) => x): DecisionCommandDto[] {
  const out: DecisionCommandDto[] = [];
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
    if ((c.weightPct ?? null) !== (was ?? null)) out.push({ type: "SET_WEIGHT", criterionId: before ? before.id : c.id, weightPct: c.weightPct ?? null });
  }
  const key = (alt: string, crit: string) => `${alias(alt)}|${alias(crit)}`;
  const mine = (agg: DecisionAggregate) => new Map(agg.assessments.filter((a) => a.assessorUserId === userId).map((a) => [key(a.alternativeId, a.criterionId), a]));
  const before = mine(base);
  const after = mine(next);
  const ref = (id: string) => alias(id);
  for (const [k, a] of after) {
    if (before.get(k)?.score !== a.score) out.push({ type: "SET_SCORE", alternativeId: ref(a.alternativeId), criterionId: ref(a.criterionId), score: a.score });
  }
  for (const [k, a] of before) {
    if (!after.has(k)) out.push({ type: "SET_SCORE", alternativeId: a.alternativeId, criterionId: a.criterionId, score: null });
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
  const from = base.decision.status;
  const to = next.decision.status;
  if (to !== from) {
    if (next.outcome && !base.outcome) {
      out.push({ type: "RECORD_OUTCOME", result: next.outcome.result, summary: next.outcome.summary });
    } else if (to === "DECIDIDA" && next.decision.selectedAlternativeId) {
      out.push({
        type: "DECIDE", alternativeId: ref(next.decision.selectedAlternativeId), rationale: next.decision.rationale ?? "",
        confidencePct: next.decision.decisionConfidencePct ?? null,
        // a UI só chega a DECIDIDA depois do guarda local sem bloqueios e com os avisos confirmados (commands.decide)
        warningsConfirmed: true,
      });
    } else {
      out.push({ type: "TRANSITION", to });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- repositório HTTP

export type HttpStatus = "idle" | "loading" | "ready" | "error";

export interface HttpDecisionRepository extends DecisionRepository {
  readonly source: "API";
  /** Estado da carga inicial (a tela mostra carregando/erro). */
  status(): HttpStatus;
  /** Último erro de escrita ou leitura (ApiError com code/status), ou `null`. */
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

  async function load() {
    state = "loading";
    emit();
    try {
      const list = await transport.get<DecisionViewDto[]>(`/api/decisions?limit=${opts.limit ?? 50}`);
      const mapped = list.map(fromDto);
      mapped.forEach((a) => confirmed.set(a.decision.id, a));
      // escritas otimistas ainda em voo ficam por cima do que veio
      const pending = items.filter((a) => !confirmed.has(alias(a.decision.id)));
      items = [...pending, ...mapped];
      state = "ready";
    } catch (e) {
      error = e;
      state = "error";
      items = [...items]; // snapshot novo: a tela re-renderiza e mostra o erro
    }
    emit();
  }

  /** Liga ids locais (refs) aos do servidor pela ordem de criação: alternativas e critérios novos chegam na ordem enviada. */
  function learnAliases(base: DecisionAggregate, sent: DecisionCommandDto[], server: DecisionAggregate) {
    const known = (ids: Set<string>, list: { id: string; position: number }[]) => list.filter((x) => !ids.has(x.id)).sort((a, b) => a.position - b.position);
    const newAlts = known(new Set(base.alternatives.map((a) => a.id)), server.alternatives);
    const newCrits = known(new Set(base.criteria.map((c) => c.id)), server.criteria);
    sent.filter((c) => c.type === "ADD_ALTERNATIVE").forEach((c, i) => { if (c.ref && newAlts[i]) aliases.set(c.ref, newAlts[i].id); });
    sent.filter((c) => c.type === "ADD_CRITERION").forEach((c, i) => { if (c.ref && newCrits[i]) aliases.set(c.ref, newCrits[i].id); });
  }

  const repo: HttpDecisionRepository = {
    source: "API",
    list: () => items,
    get: (id) => items.find((a) => a.decision.id === alias(id)) ?? items.find((a) => a.decision.id === id),
    status: () => state,
    lastError: () => error,
    refresh: () => (loading = load()),
    settled: () => chain.then(() => loading ?? undefined),
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
        const commands = diffCommands(base, agg, opts.userId, alias);
        if (!commands.length) {
          // nada que a API grave mudou: a tela volta ao estado confirmado (ids do servidor)
          put(base, id);
          emit();
          return;
        }
        try {
          const dto = await transport.post<DecisionViewDto>(`/api/decisions/${encodeURIComponent(id)}/commands`, { version: base.decision.version, commands });
          const server = fromDto(dto);
          learnAliases(base, commands, server);
          confirmed.set(id, server);
          put(server, id);
          error = null;
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
      const local: DecisionAggregate = {
        decision: {
          id: tempId, version: 0, title: question.replace(/\?$/, "").slice(0, 160), question, stakeholders: [], ownerUserId: opts.userId,
          createdByUserId: opts.userId, companyId: "", status: "RASCUNHO", complexity: input.complexity, kind: input.kind ?? tpl?.kind ?? "OPERACIONAL",
          impact: input.impact, urgency: "MEDIO", visibility: "PRIVADA", accessClass: "INTERNO", weightingEnabled: input.complexity === "PROFUNDA",
          independentScoring: false, templateKey: input.templateKey, createdAt: iso, updatedAt: iso,
        },
        participants: [{ userId: opts.userId, role: "CONDUTOR", joinedAt: iso }],
        alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], assumptions: [], risks: [], scenarios: [], forecasts: [],
        recommendations: [], triggers: [], snapshots: [], checkpoints: [], workLinks: [], events: [],
      };
      put(local);
      emit();
      void enqueue(async () => {
        try {
          const dto = await transport.post<DecisionViewDto>("/api/decisions", {
            question, complexity: input.complexity, impact: input.impact, kind: input.kind ?? tpl?.kind, templateKey: input.templateKey,
            criteria: tpl?.criteria ?? [],
          });
          const server = fromDto(dto);
          aliases.set(tempId, server.decision.id);
          confirmed.set(server.decision.id, server);
          put(server, tempId);
          error = null;
        } catch (e) {
          error = e;
          items = items.filter((a) => a.decision.id !== tempId);
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
