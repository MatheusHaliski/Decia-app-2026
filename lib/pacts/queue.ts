/**
 * Fila de cooperação (RF49.CA11) e "Quem eu posso destravar hoje?": só pactos que a pessoa pode ver (vínculos e permissões
 * ATUAIS), com filtros por caixa (recebidos/enviados), unidade, estado e prazo, e paginação. A ordem é por prazo vigente e idade
 * do pedido — nunca por pessoa, cargo ou desempenho individual.
 */
import { actingSides, canNegotiate, canSeePact, currentAgreement } from "./access";
import type { OrgDirectory } from "./org";
import { localDay } from "./rules";
import { OPEN_PACT_STATES, otherSide, type CooperationPact, type PactsState, type PactStatus } from "./types";

export type QueueBox = "TODOS" | "RECEBIDOS" | "ENVIADOS";
export type QueueDue = "TODOS" | "VENCIDOS" | "SETE_DIAS";
export interface QueueFilter {
  box: QueueBox;
  departmentId: string | null;
  status: PactStatus | "ABERTOS" | "TODOS";
  due: QueueDue;
}
export const DEFAULT_QUEUE_FILTER: QueueFilter = { box: "TODOS", departmentId: null, status: "ABERTOS", due: "TODOS" };
export const QUEUE_PAGE_SIZE = 5;

const DAY = 86_400_000;

/** Prazo vigente: a data acordada; sem acordo, o maior PRAZO do destinatário na proposta aberta; senão o prazo pedido. */
export function currentDueDate(pact: CooperationPact): string {
  const agreed = currentAgreement(pact)?.agreedDueDate;
  if (agreed) return agreed;
  const open = [...pact.proposals].reverse().find((p) => p.status === "ABERTA");
  const proposed = open?.commitments.filter((c) => c.kind === "PRAZO" && c.side === "DESTINATARIO" && c.dueDate).map((c) => c.dueDate!).sort().at(-1);
  return proposed ?? pact.requestedDueDate;
}

/** Vencido = ainda depende de alguém agir (antes da entrega) e o prazo vigente já passou. */
export const isOverdue = (pact: CooperationPact, now: Date) =>
  (["SOLICITADO", "EM_NEGOCIACAO", "COMPROMETIDO"] as PactStatus[]).includes(pact.status) && currentDueDate(pact) < localDay(now);

/** Dias inteiros desde o pedido (a idade nunca é reiniciada por renegociação). */
export const waitingDays = (pact: CooperationPact, now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(pact.createdAt)) / DAY));

export function boxesOf(org: OrgDirectory, pact: CooperationPact, userId: string | null): { received: boolean; sent: boolean } {
  if (!userId) return { received: false, sent: false };
  const executor = currentAgreement(pact)?.executorId === userId || pact.proposals.some((p) => p.status === "ABERTA" && p.executorId === userId);
  return {
    received: canNegotiate(org, pact, "DESTINATARIO", userId) || executor,
    sent: userId === pact.requesterId || canNegotiate(org, pact, "SOLICITANTE", userId),
  };
}

export interface QueuePage {
  items: readonly CooperationPact[];
  total: number;
  page: number;
  pages: number;
}

export function cooperationQueue(state: PactsState, org: OrgDirectory, userId: string | null, filter: QueueFilter, now: Date, page = 1, pageSize = QUEUE_PAGE_SIZE): QueuePage {
  const today = localDay(now);
  const in7 = localDay(new Date(now.getTime() + 7 * DAY));
  const rows = state.pacts
    .filter((p) => canSeePact(org, p, userId))
    .filter((p) => {
      const box = boxesOf(org, p, userId);
      if (filter.box === "RECEBIDOS" && !box.received) return false;
      if (filter.box === "ENVIADOS" && !box.sent) return false;
      if (filter.departmentId && p.requester.departmentId !== filter.departmentId && p.target.departmentId !== filter.departmentId) return false;
      if (filter.status === "ABERTOS" && !OPEN_PACT_STATES.includes(p.status)) return false;
      if (filter.status !== "ABERTOS" && filter.status !== "TODOS" && p.status !== filter.status) return false;
      if (filter.due === "VENCIDOS" && !isOverdue(p, now)) return false;
      if (filter.due === "SETE_DIAS" && !(OPEN_PACT_STATES.includes(p.status) && currentDueDate(p) >= today && currentDueDate(p) <= in7)) return false;
      return true;
    })
    .sort((a, b) => (currentDueDate(a) < currentDueDate(b) ? -1 : currentDueDate(a) > currentDueDate(b) ? 1 : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(Math.max(1, Math.floor(page)), pages);
  return { items: rows.slice((p - 1) * pageSize, p * pageSize), total: rows.length, page: p, pages };
}

export type PactAction =
  | "RESPONDER" | "ACEITAR_PROPOSTA" | "ACEITAR_COMO_EXECUTOR" | "ESCLARECER" | "ENTREGAR" | "AVALIAR_ENTREGA" | "CONFIRMAR_DESBLOQUEIO"
  | "RESOLVER_ESCALONAMENTO" | "ACEITAR_RENEGOCIACAO";

/** O que a pessoa pode (e precisa) fazer agora neste pacto — base dos botões e da fila "destravar hoje". */
export function pendingActions(org: OrgDirectory, pact: CooperationPact, userId: string | null): PactAction[] {
  if (!userId) return [];
  const out: PactAction[] = [];
  if (pact.escalations.some((e) => e.status === "ABERTA" && e.targets.includes(userId))) out.push("RESOLVER_ESCALONAMENTO");
  const sides = actingSides(org, pact, userId);
  const open = [...pact.proposals].reverse().find((p) => p.status === "ABERTA");
  if (pact.status === "SOLICITADO" && sides.includes("DESTINATARIO")) out.push("RESPONDER");
  if (open) {
    const mine = sides.filter((s) => !open.acceptances[s] && open.acceptances[otherSide(s)]?.userId !== userId);
    if (mine.length) out.push(open.kind === "RENEGOCIACAO" ? "ACEITAR_RENEGOCIACAO" : "ACEITAR_PROPOSTA");
    if (open.executorId === userId && !open.acceptances.EXECUTOR) out.push("ACEITAR_COMO_EXECUTOR");
  }
  if (sides.includes("SOLICITANTE") && pact.clarifications.some((c) => !c.answer) && ["SOLICITADO", "EM_NEGOCIACAO"].includes(pact.status)) out.push("ESCLARECER");
  if (pact.status === "COMPROMETIDO" && currentAgreement(pact)?.executorId === userId) out.push("ENTREGAR");
  if (pact.status === "ENTREGUE" && sides.includes("SOLICITANTE")) out.push("AVALIAR_ENTREGA");
  if (pact.status === "VALIDADO" && sides.includes("SOLICITANTE") && !pact.unblock) out.push("CONFIRMAR_DESBLOQUEIO");
  return out;
}

/** Ações de quem DESTRAVA o trabalho de outra pessoa (lado destinatário, execução ou decisão de conflito). */
const UNBLOCKING: readonly PactAction[] = ["RESPONDER", "ACEITAR_COMO_EXECUTOR", "ENTREGAR", "RESOLVER_ESCALONAMENTO"];

export interface UnblockItem {
  pact: CooperationPact;
  actions: PactAction[];
  waitingDays: number;
  overdue: boolean;
}

/** "Quem eu posso destravar hoje?" — mais antigo primeiro. */
export function unblockToday(state: PactsState, org: OrgDirectory, userId: string | null, now: Date): UnblockItem[] {
  return state.pacts
    .filter((p) => canSeePact(org, p, userId) && OPEN_PACT_STATES.includes(p.status))
    .map((pact) => {
      const all = pendingActions(org, pact, userId);
      const open = [...pact.proposals].reverse().find((p) => p.status === "ABERTA");
      // aceitar proposta só conta como "destravar" quando falta o aceite do DESTINATÁRIO e a pessoa pode dá-lo
      const acceptsForTarget = !!open && !open.acceptances.DESTINATARIO && open.acceptances.SOLICITANTE?.userId !== userId && actingSides(org, pact, userId).includes("DESTINATARIO");
      const actions = all.filter((a) => UNBLOCKING.includes(a) || ((a === "ACEITAR_PROPOSTA" || a === "ACEITAR_RENEGOCIACAO") && acceptsForTarget));
      return { pact, actions, waitingDays: waitingDays(pact, now), overdue: isOverdue(pact, now) };
    })
    .filter((x) => x.actions.length > 0)
    .sort((a, b) => (a.pact.createdAt < b.pact.createdAt ? -1 : a.pact.createdAt > b.pact.createdAt ? 1 : a.pact.id < b.pact.id ? -1 : 1));
}

/** "O que precisamos receber e o que prometemos entregar?" — visão da chefia sobre a unidade (só pactos abertos que ela vê). */
export function departmentLedger(state: PactsState, org: OrgDirectory, userId: string | null, departmentId: string, now: Date) {
  const open = state.pacts.filter((p) => OPEN_PACT_STATES.includes(p.status) && canSeePact(org, p, userId));
  const toReceive = open.filter((p) => p.requester.departmentId === departmentId);
  const toDeliver = open.filter((p) => p.target.departmentId === departmentId);
  return {
    toReceive,
    toDeliver,
    overdueToReceive: toReceive.filter((p) => isOverdue(p, now)).length,
    overdueToDeliver: toDeliver.filter((p) => isOverdue(p, now)).length,
  };
}
