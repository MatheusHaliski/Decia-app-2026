/**
 * Pactos de Desbloqueio (RF49) — máquina de estados e comandos PUROS (D-12): cada comando recebe o estado, o ator (identidade
 * derivada da sessão — no DEMO, a pessoa do perfil de visualização) e o relógio, e devolve um NOVO estado ou um erro explicável.
 * Nada muda em caso de erro; evento, mudança de estado e notificação entram juntos no mesmo resultado (RF49.CA10).
 *
 *   SOLICITADO ─(proposta/contraproposta/esclarecimento)→ EM_NEGOCIACAO ─(aceite bilateral + executor)→ COMPROMETIDO
 *   COMPROMETIDO ─(evidência)→ ENTREGUE ─(valida)→ VALIDADO · ENTREGUE ─(devolve com critério)→ COMPROMETIDO
 *   SOLICITADO|EM_NEGOCIACAO ─(recusa com motivo)→ RECUSADO · SOLICITADO|EM_NEGOCIACAO|COMPROMETIDO ─(cancela com motivo)→ CANCELADO
 *   COMPROMETIDO ─(renegociação aceita pelos dois lados)→ COMPROMETIDO (acordo anterior preservado; createdAt intacto)
 *
 * Regras de aceite: proposta de data NÃO é compromisso; o acordo só nasce quando a MESMA proposta tem o aceite do solicitante e
 * do destinatário (pessoas diferentes) e o aceite pessoal de quem executa (nomear alguém não é aceitação dele). O limite de
 * compromissos simultâneos da unidade destinatária bloqueia o aceite (salvo exceção justificada da chefia). Dependência circular
 * é recusada antes de gravar. Escalonamento registra o conflito para a chefia acima decidir — nada é decidido automaticamente.
 */
import { actingSides, canNegotiate, currentAgreement, escalationTargets, negotiatorsOf, partyOf, validExecutors } from "./access";
import { edgesFromPacts, findCycle, type DependencyEdge } from "./cycle";
import { companyOfDepartment, departmentOf, headOf, membersOf, personOf, type OrgDirectory } from "./org";
import {
  ACTIVE_COMMITMENT_STATES, COMMITMENT_KINDS, OPEN_PACT_STATES, SIDES, otherSide, type AccessClass, type Agreement, type Commitment,
  type CommitmentDraft, type CooperationPact, type Impediment, type PactEventKind, type PactParty, type PactsState, type PactStatus, type Proposal, type Side,
} from "./types";

export type PactError =
  | "NAO_ENCONTRADO" | "ACESSO_NEGADO" | "VALIDACAO" | "TRANSICAO_INVALIDA" | "EDICAO_CONCORRENTE" | "DEPENDENCIA_CIRCULAR"
  | "LIMITE_COMPROMISSOS" | "ACEITE_DUPLO" | "EVIDENCIA_INACESSIVEL" | "LEMBRETE_FREQUENTE" | "PROPOSTA_SUPERADA" | "ESCALONAMENTO_ABERTO";

export interface PactDraft {
  requester: PactParty;
  target: PactParty;
  expectedDelivery: string;
  justification: string;
  acceptanceCriterion: string;
  requestedDueDate: string;
  impedimentId?: string | null;
  dependentTaskId?: string | null;
  deliverableTaskId?: string | null;
  accessClass?: AccessClass;
  grants?: string[];
}

export interface ImpedimentDraft {
  title: string;
  blockedBy: string;
  since: string;
  dependents: string[];
  taskId?: string | null;
  accessClass?: AccessClass;
}

export type PactCommand =
  | { type: "ABRIR"; draft: PactDraft }
  | { type: "PROPOR"; pactId: string; side: Side; commitments: CommitmentDraft[]; executorId: string | null; note: string }
  | { type: "ACEITAR"; pactId: string; proposalId: string; as: Side | "EXECUTOR" }
  | { type: "PEDIR_ESCLARECIMENTO"; pactId: string; question: string }
  | { type: "ESCLARECER"; pactId: string; clarificationId: string; answer: string }
  | { type: "RECUSAR"; pactId: string; reason: string }
  | { type: "CANCELAR"; pactId: string; reason: string }
  | { type: "EXCECAO_LIMITE"; pactId: string; reason: string }
  | { type: "ENTREGAR"; pactId: string; evidence: string; evidenceClass: AccessClass; resourceVersion: string }
  | { type: "DEVOLVER"; pactId: string; unmetCriterion: string; reason: string }
  | { type: "VALIDAR"; pactId: string }
  | { type: "CONFIRMAR_DESBLOQUEIO"; pactId: string }
  | { type: "RECONHECER"; pactId: string; text: string }
  | { type: "RENEGOCIAR"; pactId: string; side: Side; commitments: CommitmentDraft[]; executorId: string | null; reason: string; note: string }
  | { type: "CHECKIN"; pactId: string; note: string; updates: { commitmentId: string; status: "CUMPRIDO" | "DESCUMPRIDO" }[] }
  | { type: "MARCO"; pactId: string; title: string; dueDate: string }
  | { type: "MARCO_CONCLUIDO"; pactId: string; milestoneId: string }
  | { type: "ESCALAR"; pactId: string; reason: string }
  | { type: "RESOLVER_ESCALONAMENTO"; pactId: string; escalationId: string; text: string }
  | { type: "LEMBRAR"; pactId: string }
  | { type: "REGISTRAR_IMPEDIMENTO"; draft: ImpedimentDraft };

export interface CommandContext {
  actorId: string | null;
  now: Date;
  org: OrgDirectory;
  /** versão do pacto que a tela viu (controle de edição concorrente) */
  expectedVersion?: number;
  /** repetir a mesma requisição não duplica nada */
  idempotencyKey?: string | null;
  /** arestas extras para a checagem de ciclo (ex.: dependências da Mesa) */
  extraEdges?: readonly DependencyEdge[];
  /** id do pacto/impedimento criado (fixtures); padrão = sequência da aba */
  newId?: string;
}

export type CommandResult =
  | { ok: true; state: PactsState; id: string; duplicate: boolean }
  | { ok: false; error: PactError; fields?: Record<string, string>; info?: Record<string, string | number> };

export const LIMITS = { textMin: 5, shortMin: 3, textMax: 600, maxCommitments: 10, reminderHours: 24 } as const;
const REMINDER_MS = LIMITS.reminderHours * 3_600_000;

/** Dia local (AAAA-MM-DD) do relógio da tela. */
export const localDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
export const isIsoDay = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

const fail = (error: PactError, fields?: Record<string, string>, info?: Record<string, string | number>): CommandResult => ({ ok: false, error, fields, info });
const len = (s: string | null | undefined) => (s ?? "").trim().length;

/** Compromissos ativos (COMPROMETIDO/ENTREGUE) da unidade destinatária — pactos encerrados não contam (RF49.CA04). */
export function activeCommitmentsOf(state: PactsState, departmentId: string, exceptPactId?: string): number {
  return state.pacts.filter((p) => p.target.departmentId === departmentId && ACTIVE_COMMITMENT_STATES.includes(p.status) && p.id !== exceptPactId).length;
}

export function limitCheck(state: PactsState, pact: CooperationPact): { count: number; limit: number | null; exceeds: boolean } {
  const limit = state.limits[pact.target.departmentId] ?? null;
  const count = activeCommitmentsOf(state, pact.target.departmentId, pact.id);
  return { count, limit, exceeds: limit !== null && count + 1 > limit };
}

/** Participa do pacto (negocia por um lado, executa ou abriu)? */
export function isParticipant(org: OrgDirectory, pact: CooperationPact, userId: string | null): boolean {
  if (!userId) return false;
  return (
    userId === pact.requesterId ||
    canNegotiate(org, pact, "SOLICITANTE", userId) ||
    canNegotiate(org, pact, "DESTINATARIO", userId) ||
    currentAgreement(pact)?.executorId === userId ||
    pact.proposals.some((p) => p.status === "ABERTA" && p.executorId === userId)
  );
}

export function validateCommitments(drafts: readonly CommitmentDraft[], today: string): string | null {
  if (!drafts.length || drafts.length > LIMITS.maxCommitments) return "QUANTIDADE";
  for (const c of drafts) {
    if (!COMMITMENT_KINDS.includes(c.kind) || !SIDES.includes(c.side)) return "TIPO";
    if (len(c.description) < LIMITS.shortMin || len(c.description) > LIMITS.textMax) return "DESCRICAO";
    if (c.kind === "PRAZO" && !isIsoDay(c.dueDate)) return "DATA";
    if (c.dueDate != null && c.dueDate !== "" && (!isIsoDay(c.dueDate) || c.dueDate < today)) return "DATA";
  }
  if (!drafts.some((c) => c.kind === "PRAZO" && c.side === "DESTINATARIO")) return "SEM_PRAZO_DESTINATARIO";
  return null;
}

/** "Data acordada": o maior PRAZO do lado destinatário. */
export const agreedDueDateOf = (commitments: readonly Pick<Commitment, "kind" | "side" | "dueDate">[]) =>
  commitments.filter((c) => c.kind === "PRAZO" && c.side === "DESTINATARIO" && c.dueDate).map((c) => c.dueDate!).sort().at(-1) ?? null;

/** Evidência que todos os envolvidos conseguem abrir: SIGILOSO nunca; RESTRITO só se as duas partes são da mesma unidade. */
export function evidenceReadableByAll(pact: CooperationPact, evidenceClass: AccessClass): boolean {
  if (evidenceClass === "SIGILOSO") return pact.accessClass === "SIGILOSO";
  if (evidenceClass === "RESTRITO") return pact.requester.departmentId === pact.target.departmentId || pact.accessClass === "RESTRITO";
  return true;
}

/* ── montagem do resultado ────────────────────────────────────────────────────────────────────────────── */

interface Mutation {
  kinds: PactEventKind[];
  to?: PactStatus;
  reason?: string | null;
  /** quem recebe aviso (além dos participantes); null = só participantes */
  notifyExtra?: string[];
  /** só estas pessoas (lembrete) */
  notifyOnly?: string[];
}

function participantsOf(org: OrgDirectory, pact: CooperationPact): string[] {
  const out = new Set<string>([pact.requesterId, ...negotiatorsOf(org, pact, "SOLICITANTE"), ...negotiatorsOf(org, pact, "DESTINATARIO")]);
  const exec = currentAgreement(pact)?.executorId;
  if (exec) out.add(exec);
  for (const p of pact.proposals) if (p.status === "ABERTA" && p.executorId) out.add(p.executorId);
  return [...out];
}

function commit(state: PactsState, before: CooperationPact | null, pact: CooperationPact, m: Mutation, ctx: CommandContext): CommandResult {
  const at = ctx.now.toISOString();
  const actor = ctx.actorId!;
  const from = before?.status ?? null;
  const to = m.to ?? pact.status;
  let seq = state.seq;
  const events = [...pact.events];
  // vários fatos no mesmo comando (ex.: ACEITAR + COMPROMETER): só o último muda o estado
  m.kinds.forEach((kind, i) => {
    const last = i === m.kinds.length - 1;
    events.push({ id: `${pact.id}-e${events.length + 1}`, at, actorId: actor, kind, from, to: last ? to : (from ?? to), reason: m.reason ?? null, idempotencyKey: i === 0 ? (ctx.idempotencyKey ?? null) : null });
  });
  const next: CooperationPact = { ...pact, status: to, version: (before?.version ?? 0) + 1, updatedAt: at, events };
  const recipients = (m.notifyOnly ?? [...participantsOf(ctx.org, next), ...(m.notifyExtra ?? [])]).filter((u, i, all) => u !== actor && all.indexOf(u) === i);
  let notifications = state.notifications;
  for (const r of recipients) {
    const groupKey = `pacto:${next.id}`;
    const open = notifications.find((n) => n.recipientId === r && n.groupKey === groupKey && !n.read);
    if (open) {
      notifications = notifications.map((n) => (n === open ? { ...n, count: n.count + m.kinds.length, kinds: [...new Set([...n.kinds, ...m.kinds])], lastAt: at } : n));
    } else {
      seq++;
      notifications = [...notifications, { id: `ntf-${seq}`, recipientId: r, pactId: next.id, groupKey, kinds: [...m.kinds], count: m.kinds.length, firstAt: at, lastAt: at, read: false }];
    }
  }
  const pacts = before ? state.pacts.map((p) => (p.id === next.id ? next : p)) : [next, ...state.pacts];
  return { ok: true, state: { ...state, pacts, notifications, seq }, id: next.id, duplicate: false };
}

/* ── comandos ──────────────────────────────────────────────────────────────────────────────────────────── */

export function applyPactCommand(state: PactsState, cmd: PactCommand, ctx: CommandContext): CommandResult {
  const actor = ctx.actorId;
  if (!actor || !personOf(ctx.org, actor)) return fail("ACESSO_NEGADO");
  const today = localDay(ctx.now);
  const at = ctx.now.toISOString();

  if (cmd.type === "REGISTRAR_IMPEDIMENTO") return registerImpediment(state, cmd.draft, ctx, today);
  if (cmd.type === "ABRIR") return openPact(state, cmd.draft, ctx, today);

  const pact = state.pacts.find((p) => p.id === cmd.pactId);
  // pacto que a pessoa não vê é "não encontrado" (não revela existência)
  if (!pact || (!isParticipant(ctx.org, pact, actor) && !pact.escalations.some((e) => e.targets.includes(actor)))) return fail("NAO_ENCONTRADO");
  if (ctx.idempotencyKey && pact.events.some((e) => e.idempotencyKey === ctx.idempotencyKey)) return { ok: true, state, id: pact.id, duplicate: true };
  if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== pact.version) return fail("EDICAO_CONCORRENTE", undefined, { version: pact.version });
  const negotiates = (s: Side) => canNegotiate(ctx.org, pact, s, actor);
  const anySide = negotiates("SOLICITANTE") || negotiates("DESTINATARIO");
  const executor = currentAgreement(pact)?.executorId ?? null;
  const party = anySide || executor === actor;
  const update = (patch: Partial<CooperationPact>, m: Mutation) => commit(state, pact, { ...pact, ...patch }, m, ctx);

  switch (cmd.type) {
    case "PROPOR":
    case "RENEGOCIAR": {
      const reneg = cmd.type === "RENEGOCIAR";
      if (reneg ? pact.status !== "COMPROMETIDO" : !["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!negotiates(cmd.side)) return fail("ACESSO_NEGADO");
      const problem = validateCommitments(cmd.commitments, today);
      if (problem) return fail("VALIDACAO", { commitments: problem });
      if (reneg && len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      let executorId = cmd.executorId ?? (reneg ? executor : null);
      if (executorId && !validExecutors(ctx.org, pact).includes(executorId)) return fail("VALIDACAO", { executorId: "INVALIDO" });
      // quem entrega e propõe sem nomear executor: executa quem propôs (se puder); senão precisa nomear alguém da unidade
      if (!executorId && cmd.side === "DESTINATARIO") {
        if (!validExecutors(ctx.org, pact).includes(actor)) return fail("VALIDACAO", { executorId: "OBRIGATORIO" });
        executorId = actor;
      }
      const round = pact.proposals.length + 1;
      const id = `${pact.id}-r${round}`;
      const last = pact.proposals.at(-1);
      const kind = reneg ? "RENEGOCIACAO" : !last ? "PROPOSTA" : last.side !== cmd.side ? "CONTRAPROPOSTA" : "PROPOSTA";
      const self = { userId: actor, at };
      const proposal: Proposal = {
        id, round, kind, side: cmd.side, authorId: actor, at, executorId, note: cmd.note.trim(), reason: reneg ? cmd.reason.trim() : null, status: "ABERTA",
        commitments: cmd.commitments.map((c, i) => ({ id: `${id}-c${i + 1}`, kind: c.kind, side: c.side, description: c.description.trim(), dueDate: c.dueDate || null, status: "PENDENTE" })),
        acceptances: { SOLICITANTE: cmd.side === "SOLICITANTE" ? self : null, DESTINATARIO: cmd.side === "DESTINATARIO" ? self : null, EXECUTOR: cmd.side === "DESTINATARIO" && executorId === actor ? self : null },
      };
      const proposals = [...pact.proposals.map((p) => (p.status === "ABERTA" ? { ...p, status: "SUBSTITUIDA" as const } : p)), proposal];
      return update({ proposals }, { kinds: [reneg ? "RENEGOCIAR" : kind === "CONTRAPROPOSTA" ? "CONTRAPROPOR" : "PROPOR"], to: reneg ? "COMPROMETIDO" : "EM_NEGOCIACAO", reason: reneg ? cmd.reason.trim() : null });
    }

    case "ACEITAR": {
      const prop = pact.proposals.find((p) => p.id === cmd.proposalId);
      if (!prop) return fail("NAO_ENCONTRADO");
      if (prop.status !== "ABERTA") return fail("PROPOSTA_SUPERADA");
      const acc = { ...prop.acceptances };
      let executorId = prop.executorId;
      if (cmd.as === "EXECUTOR") {
        if (!executorId || executorId !== actor) return fail("ACESSO_NEGADO");
        if (acc.EXECUTOR) return { ok: true, state, id: pact.id, duplicate: true };
        acc.EXECUTOR = { userId: actor, at };
      } else {
        if (!negotiates(cmd.as)) return fail("ACESSO_NEGADO");
        if (acc[otherSide(cmd.as)]?.userId === actor) return fail("ACEITE_DUPLO");
        if (acc[cmd.as]) return { ok: true, state, id: pact.id, duplicate: true };
        if (cmd.as === "DESTINATARIO" && !executorId) {
          if (!validExecutors(ctx.org, pact).includes(actor)) return fail("VALIDACAO", { executorId: "OBRIGATORIO" });
          executorId = actor;
        }
        acc[cmd.as] = { userId: actor, at };
        if (cmd.as === "DESTINATARIO" && executorId === actor) acc.EXECUTOR = { userId: actor, at };
      }
      const complete = !!(acc.SOLICITANTE && acc.DESTINATARIO && acc.EXECUTOR);
      const accepted: Proposal = { ...prop, executorId, acceptances: acc, status: complete ? "ACEITA" : "ABERTA" };
      const proposals = pact.proposals.map((p) => (p.id === prop.id ? accepted : p));
      if (!complete) return update({ proposals }, { kinds: ["ACEITAR"], to: pact.status === "SOLICITADO" ? "EM_NEGOCIACAO" : pact.status });
      if (prop.kind !== "RENEGOCIACAO") {
        const cycle = cycleOf(state, pact, ctx);
        if (cycle) return fail("DEPENDENCIA_CIRCULAR", undefined, { path: cycle.join(" → ") });
        const lim = limitCheck(state, pact);
        if (lim.exceeds && !pact.limitException) return fail("LIMITE_COMPROMISSOS", undefined, { count: lim.count, limit: lim.limit ?? 0 });
      }
      const agreement: Agreement = {
        version: pact.agreements.length + 1, proposalId: prop.id, agreedAt: at, executorId: executorId!, agreedDueDate: agreedDueDateOf(prop.commitments)!,
        commitments: prop.commitments.map((c) => ({ ...c, status: "PENDENTE" })), supersededAt: null, supersededBy: null, supersedeReason: null,
      };
      const agreements = [
        ...pact.agreements.map((a) => (a.supersededAt ? a : { ...a, supersededAt: at, supersededBy: prop.authorId, supersedeReason: prop.reason })),
        agreement,
      ];
      return update({ proposals, agreements }, { kinds: ["ACEITAR", "COMPROMETER"], to: "COMPROMETIDO", reason: prop.reason });
    }

    case "PEDIR_ESCLARECIMENTO": {
      if (!["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!negotiates("DESTINATARIO")) return fail("ACESSO_NEGADO");
      if (len(cmd.question) < LIMITS.textMin) return fail("VALIDACAO", { question: "OBRIGATORIO" });
      const clarifications = [...pact.clarifications, { id: `${pact.id}-q${pact.clarifications.length + 1}`, at, by: actor, question: cmd.question.trim(), answer: null }];
      return update({ clarifications }, { kinds: ["PEDIR_ESCLARECIMENTO"], to: "EM_NEGOCIACAO" });
    }

    case "ESCLARECER": {
      const q = pact.clarifications.find((c) => c.id === cmd.clarificationId);
      if (!q) return fail("NAO_ENCONTRADO");
      if (!negotiates("SOLICITANTE")) return fail("ACESSO_NEGADO");
      if (q.answer) return fail("TRANSICAO_INVALIDA");
      if (len(cmd.answer) < LIMITS.shortMin) return fail("VALIDACAO", { answer: "OBRIGATORIO" });
      const clarifications = pact.clarifications.map((c) => (c.id === q.id ? { ...c, answer: { at, by: actor, text: cmd.answer.trim() } } : c));
      return update({ clarifications }, { kinds: ["ESCLARECER"] });
    }

    case "RECUSAR": {
      if (!["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!negotiates("DESTINATARIO")) return fail("ACESSO_NEGADO");
      if (len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      return update(
        { closure: { by: actor, at, reason: cmd.reason.trim() }, proposals: pact.proposals.map((p) => (p.status === "ABERTA" ? { ...p, status: "SUBSTITUIDA" as const } : p)) },
        { kinds: ["RECUSAR"], to: "RECUSADO", reason: cmd.reason.trim() },
      );
    }

    case "CANCELAR": {
      const allowed = pact.status === "COMPROMETIDO" ? anySide : ["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status) ? negotiates("SOLICITANTE") : false;
      if (!["SOLICITADO", "EM_NEGOCIACAO", "COMPROMETIDO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!allowed) return fail("ACESSO_NEGADO");
      if (len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      return update(
        { closure: { by: actor, at, reason: cmd.reason.trim() }, proposals: pact.proposals.map((p) => (p.status === "ABERTA" ? { ...p, status: "SUBSTITUIDA" as const } : p)) },
        { kinds: ["CANCELAR"], to: "CANCELADO", reason: cmd.reason.trim() },
      );
    }

    case "EXCECAO_LIMITE": {
      if (!["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (headOf(ctx.org, pact.target.departmentId) !== actor) return fail("ACESSO_NEGADO");
      if (len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      return update({ limitException: { by: actor, at, reason: cmd.reason.trim() } }, { kinds: ["EXCECAO_LIMITE"], reason: cmd.reason.trim() });
    }

    case "ENTREGAR": {
      if (pact.status !== "COMPROMETIDO") return fail("TRANSICAO_INVALIDA");
      if (executor !== actor) return fail("ACESSO_NEGADO");
      if (len(cmd.evidence) < LIMITS.shortMin) return fail("VALIDACAO", { evidence: "OBRIGATORIO" });
      if (!len(cmd.resourceVersion)) return fail("VALIDACAO", { resourceVersion: "OBRIGATORIO" });
      if (!evidenceReadableByAll(pact, cmd.evidenceClass)) return fail("EVIDENCIA_INACESSIVEL");
      const deliveries = [...pact.deliveries, { attempt: pact.deliveries.length + 1, at, by: actor, evidence: cmd.evidence.trim(), evidenceClass: cmd.evidenceClass, resourceVersion: cmd.resourceVersion.trim(), returned: null }];
      return update({ deliveries }, { kinds: ["ENTREGAR"], to: "ENTREGUE" });
    }

    case "DEVOLVER": {
      if (pact.status !== "ENTREGUE") return fail("TRANSICAO_INVALIDA");
      if (!negotiates("SOLICITANTE")) return fail("ACESSO_NEGADO");
      if (len(cmd.unmetCriterion) < LIMITS.shortMin) return fail("VALIDACAO", { unmetCriterion: "OBRIGATORIO" });
      if (len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      const deliveries = pact.deliveries.map((d, i, all) => (i === all.length - 1 ? { ...d, returned: { at, by: actor, unmetCriterion: cmd.unmetCriterion.trim(), reason: cmd.reason.trim() } } : d));
      return update({ deliveries }, { kinds: ["DEVOLVER"], to: "COMPROMETIDO", reason: cmd.reason.trim() });
    }

    case "VALIDAR": {
      if (pact.status !== "ENTREGUE") return fail("TRANSICAO_INVALIDA");
      if (!negotiates("SOLICITANTE")) return fail("ACESSO_NEGADO");
      const deliveredOn = pact.deliveries.at(-1)!.at.slice(0, 10);
      // prazo do destinatário: cumprido se a entrega aceita chegou até a data combinada (fato verificável, sem julgamento)
      const agreements = pact.agreements.map((a) =>
        a.supersededAt ? a : {
          ...a,
          commitments: a.commitments.map((c) =>
            c.kind === "PRAZO" && c.side === "DESTINATARIO" && c.status === "PENDENTE" && c.dueDate
              ? { ...c, status: deliveredOn <= c.dueDate ? ("CUMPRIDO" as const) : ("DESCUMPRIDO" as const), resolvedAt: at, resolvedBy: actor }
              : c,
          ),
        },
      );
      return update({ agreements, validation: { by: actor, at } }, { kinds: ["VALIDAR"], to: "VALIDADO" });
    }

    case "CONFIRMAR_DESBLOQUEIO": {
      if (pact.status !== "VALIDADO") return fail("TRANSICAO_INVALIDA");
      if (!negotiates("SOLICITANTE")) return fail("ACESSO_NEGADO");
      if (pact.unblock) return { ok: true, state, id: pact.id, duplicate: true };
      return update({ unblock: { by: actor, at } }, { kinds: ["CONFIRMAR_DESBLOQUEIO"] });
    }

    case "RECONHECER": {
      if (pact.status !== "VALIDADO") return fail("TRANSICAO_INVALIDA");
      if (!negotiates("SOLICITANTE")) return fail("ACESSO_NEGADO");
      if (pact.recognition) return { ok: true, state, id: pact.id, duplicate: true };
      if (len(cmd.text) < LIMITS.textMin || len(cmd.text) > LIMITS.textMax) return fail("VALIDACAO", { text: "OBRIGATORIO" });
      return update({ recognition: { by: actor, at, text: cmd.text.trim() } }, { kinds: ["RECONHECER"] });
    }

    case "CHECKIN": {
      if (!["COMPROMETIDO", "ENTREGUE", "VALIDADO"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!party) return fail("ACESSO_NEGADO");
      if (len(cmd.note) < LIMITS.shortMin) return fail("VALIDACAO", { note: "OBRIGATORIO" });
      const current = currentAgreement(pact)!;
      if (cmd.updates.some((u) => !current.commitments.some((c) => c.id === u.commitmentId))) return fail("VALIDACAO", { updates: "INVALIDO" });
      const agreements = pact.agreements.map((a) =>
        a !== current ? a : {
          ...a,
          commitments: a.commitments.map((c) => {
            const u = cmd.updates.find((x) => x.commitmentId === c.id);
            return u ? { ...c, status: u.status, resolvedAt: at, resolvedBy: actor } : c;
          }),
        },
      );
      const checkins = [...pact.checkins, { id: `${pact.id}-k${pact.checkins.length + 1}`, at, by: actor, note: cmd.note.trim(), updates: cmd.updates }];
      return update({ agreements, checkins }, { kinds: ["CHECKIN"] });
    }

    case "MARCO": {
      if (!["COMPROMETIDO", "ENTREGUE"].includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!party) return fail("ACESSO_NEGADO");
      if (len(cmd.title) < LIMITS.shortMin) return fail("VALIDACAO", { title: "OBRIGATORIO" });
      if (!isIsoDay(cmd.dueDate) || cmd.dueDate < today) return fail("VALIDACAO", { dueDate: "DATA" });
      const milestones = [...pact.milestones, { id: `${pact.id}-m${pact.milestones.length + 1}`, title: cmd.title.trim(), dueDate: cmd.dueDate, doneAt: null, doneBy: null }];
      return update({ milestones }, { kinds: ["MARCO"] });
    }

    case "MARCO_CONCLUIDO": {
      const m = pact.milestones.find((x) => x.id === cmd.milestoneId);
      if (!m) return fail("NAO_ENCONTRADO");
      if (!party) return fail("ACESSO_NEGADO");
      if (m.doneAt) return { ok: true, state, id: pact.id, duplicate: true };
      return update({ milestones: pact.milestones.map((x) => (x.id === m.id ? { ...x, doneAt: at, doneBy: actor } : x)) }, { kinds: ["MARCO_CONCLUIDO"] });
    }

    case "ESCALAR": {
      if (!OPEN_PACT_STATES.includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!party) return fail("ACESSO_NEGADO");
      if (len(cmd.reason) < LIMITS.textMin) return fail("VALIDACAO", { reason: "OBRIGATORIO" });
      if (pact.escalations.some((e) => e.status === "ABERTA")) return fail("ESCALONAMENTO_ABERTO");
      const targets = escalationTargets(ctx.org, pact, actor);
      if (!targets.length) return fail("VALIDACAO", { targets: "SEM_CHEFIA" });
      const escalations = [...pact.escalations, { id: `${pact.id}-x${pact.escalations.length + 1}`, at, by: actor, reason: cmd.reason.trim(), targets, status: "ABERTA" as const, resolution: null }];
      return update({ escalations }, { kinds: ["ESCALAR"], reason: cmd.reason.trim(), notifyExtra: targets });
    }

    case "RESOLVER_ESCALONAMENTO": {
      const e = pact.escalations.find((x) => x.id === cmd.escalationId);
      if (!e) return fail("NAO_ENCONTRADO");
      if (!e.targets.includes(actor)) return fail("ACESSO_NEGADO");
      if (e.status !== "ABERTA") return fail("TRANSICAO_INVALIDA");
      if (len(cmd.text) < LIMITS.textMin) return fail("VALIDACAO", { text: "OBRIGATORIO" });
      const escalations = pact.escalations.map((x) => (x.id === e.id ? { ...x, status: "RESOLVIDA" as const, resolution: { at, by: actor, text: cmd.text.trim() } } : x));
      return update({ escalations }, { kinds: ["RESOLVER_ESCALONAMENTO"], reason: cmd.text.trim() });
    }

    case "LEMBRAR": {
      if (!OPEN_PACT_STATES.includes(pact.status)) return fail("TRANSICAO_INVALIDA");
      if (!party) return fail("ACESSO_NEGADO");
      const last = [...pact.events].reverse().find((e) => e.kind === "LEMBRAR" && e.actorId === actor);
      if (last && ctx.now.getTime() - Date.parse(last.at) < REMINDER_MS) return fail("LEMBRETE_FREQUENTE", undefined, { hours: LIMITS.reminderHours });
      const mySides = actingSides(ctx.org, pact, actor);
      const others = mySides.includes("SOLICITANTE") ? [...negotiatorsOf(ctx.org, pact, "DESTINATARIO"), ...(executor ? [executor] : [])] : negotiatorsOf(ctx.org, pact, "SOLICITANTE");
      return update({}, { kinds: ["LEMBRAR"], notifyOnly: others });
    }
  }
}

function cycleOf(state: PactsState, pact: CooperationPact | PactDraft, ctx: CommandContext): string[] | null {
  if (!pact.dependentTaskId || !pact.deliverableTaskId) return null;
  const others = state.pacts.filter((p) => !("id" in pact) || p.id !== pact.id);
  return findCycle([...edgesFromPacts(others), ...(ctx.extraEdges ?? [])], pact.dependentTaskId, pact.deliverableTaskId);
}

function representsRequester(org: OrgDirectory, party: PactParty, actor: string): boolean {
  switch (party.kind) {
    case "PESSOA":
      // a identidade vem da sessão: o userId enviado é ignorado e trocado pelo ator
      return personOf(org, actor)?.departmentId === party.departmentId;
    case "EQUIPE":
      return membersOf(org, party.departmentId).includes(actor);
    case "CHEFIA":
    case "DEPARTAMENTO":
      return headOf(org, party.departmentId) === actor;
  }
}

function openPact(state: PactsState, draft: PactDraft, ctx: CommandContext, today: string): CommandResult {
  const actor = ctx.actorId!;
  if (ctx.idempotencyKey) {
    const dup = state.pacts.find((p) => p.events.some((e) => e.idempotencyKey === ctx.idempotencyKey));
    if (dup) return { ok: true, state, id: dup.id, duplicate: true };
  }
  const reqDept = departmentOf(ctx.org, draft.requester.departmentId);
  if (!reqDept?.active || !representsRequester(ctx.org, draft.requester, actor)) return fail("ACESSO_NEGADO");
  // destino inacessível (outra empresa, inativo, pessoa fora da unidade) = não encontrado, sem revelar existência (RF49.CA01)
  const tgtDept = departmentOf(ctx.org, draft.target.departmentId);
  if (!tgtDept?.active || tgtDept.companyId !== reqDept.companyId) return fail("NAO_ENCONTRADO");
  if (draft.target.kind === "PESSOA" && (!draft.target.userId || personOf(ctx.org, draft.target.userId)?.departmentId !== tgtDept.id)) return fail("NAO_ENCONTRADO");
  const same = draft.requester.departmentId === draft.target.departmentId && draft.requester.kind === draft.target.kind && draft.requester.userId === draft.target.userId;
  const fields: Record<string, string> = {};
  if (same || (draft.target.kind === "PESSOA" && draft.target.userId === actor)) fields.target = "MESMA_PARTE";
  if (len(draft.expectedDelivery) < LIMITS.textMin) fields.expectedDelivery = "OBRIGATORIO";
  if (len(draft.justification) < LIMITS.textMin) fields.justification = "OBRIGATORIO";
  if (len(draft.acceptanceCriterion) < LIMITS.textMin) fields.acceptanceCriterion = "OBRIGATORIO";
  if (!isIsoDay(draft.requestedDueDate) || draft.requestedDueDate < today) fields.requestedDueDate = "DATA";
  const impediment = draft.impedimentId ? state.impediments.find((i) => i.id === draft.impedimentId) : null;
  if (draft.impedimentId && !impediment) fields.impedimentId = "INVALIDO";
  const inherited = impediment?.accessClass;
  const accessClass: AccessClass = draft.accessClass && draft.accessClass !== "PUBLICO" ? draft.accessClass : inherited === "SIGILOSO" || inherited === "RESTRITO" ? inherited : "INTERNO";
  const grants = [...new Set(draft.grants ?? [])];
  if (accessClass === "SIGILOSO" && draft.target.kind !== "PESSOA" && !grants.some((g) => membersOf(ctx.org, draft.target.departmentId).includes(g))) fields.grants = "OBRIGATORIO";
  if (Object.keys(fields).length) return fail("VALIDACAO", fields);
  const cycle = cycleOf(state, { ...draft, dependentTaskId: draft.dependentTaskId ?? impediment?.taskId ?? null }, ctx);
  if (cycle) return fail("DEPENDENCIA_CIRCULAR", undefined, { path: cycle.join(" → ") });
  const at = ctx.now.toISOString();
  const id = ctx.newId ?? `pacto-${state.seq + 1}`;
  if (state.pacts.some((p) => p.id === id)) return fail("VALIDACAO", { id: "DUPLICADO" });
  const pact: CooperationPact = {
    id, version: 0, companyId: companyOfDepartment(ctx.org, reqDept.id)!, impedimentId: impediment?.id ?? null,
    dependentTaskId: draft.dependentTaskId ?? impediment?.taskId ?? null, deliverableTaskId: draft.deliverableTaskId ?? null,
    requester: { ...draft.requester, userId: draft.requester.kind === "PESSOA" ? actor : null },
    target: { ...draft.target, userId: draft.target.kind === "PESSOA" ? draft.target.userId : null },
    requesterId: actor, expectedDelivery: draft.expectedDelivery.trim(), justification: draft.justification.trim(), acceptanceCriterion: draft.acceptanceCriterion.trim(),
    requestedDueDate: draft.requestedDueDate, accessClass, grants, status: "SOLICITADO", createdAt: at, updatedAt: at,
    proposals: [], agreements: [], deliveries: [], milestones: [], checkins: [], escalations: [], clarifications: [],
    limitException: null, validation: null, unblock: null, recognition: null, closure: null, sessionId: null, events: [],
  };
  return commit({ ...state, seq: state.seq + 1 }, null, pact, { kinds: ["SOLICITAR"], to: "SOLICITADO" }, ctx);
}

function registerImpediment(state: PactsState, draft: ImpedimentDraft, ctx: CommandContext, today: string): CommandResult {
  const actor = ctx.actorId!;
  const person = personOf(ctx.org, actor);
  if (!person?.departmentId) return fail("ACESSO_NEGADO");
  const fields: Record<string, string> = {};
  if (len(draft.title) < LIMITS.shortMin) fields.title = "OBRIGATORIO";
  if (len(draft.blockedBy) < LIMITS.shortMin) fields.blockedBy = "OBRIGATORIO";
  if (!isIsoDay(draft.since) || draft.since > today) fields.since = "DATA";
  const dependents = draft.dependents.map((d) => d.trim()).filter(Boolean);
  if (!dependents.length) fields.dependents = "OBRIGATORIO";
  if (Object.keys(fields).length) return fail("VALIDACAO", fields);
  const id = ctx.newId ?? `imp-${state.seq + 1}`;
  const imp: Impediment = {
    id, source: "MANUAL", taskId: draft.taskId ?? null, title: draft.title.trim(), blockedBy: draft.blockedBy.trim(), since: draft.since,
    dependents: dependents.map((label) => ({ label, userId: null })), ownerId: actor, departmentId: person.departmentId,
    accessClass: draft.accessClass ?? "INTERNO", suggestedTarget: null, watchers: [], createdAt: ctx.now.toISOString(),
  };
  return { ok: true, state: { ...state, impediments: [imp, ...state.impediments], seq: state.seq + 1 }, id, duplicate: false };
}

export { partyOf };
