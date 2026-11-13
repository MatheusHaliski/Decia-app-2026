/**
 * Fluxo do Dossiê de Transição (RF36 §4, máquina de estados) — comandos PUROS sobre o dossiê; cada um devolve o novo dossiê (versão
 * +1, evento na história) ou o erro, sem mudar nada:
 *   GERADO ──enviar ao(s) sucessor(es)──▶ AGUARDANDO_SUCESSOR ──ciência de todos──▶ TRANSFERIDO
 *     │                                       │ recusa com motivo ──▶ RECUSADO ──novo sucessor + enviar──▶ AGUARDANDO_SUCESSOR
 *     └──────────── cancelar com motivo ──────┴──────────────────────────────────▶ CANCELADO
 * Plano de transferência: sucessor por item transferível (projeto, tarefa, decisão, risco, mudança, comunicação), com um sucessor
 * padrão para preencher os vazios; checklist com itens calculados e itens marcados à mão; ciência de cada sucessor (RF36.CA03).
 */
import { pendenciesOf, type Collected } from "./collect";
import type { CheckId, Fact, HandoffDossier, HandoffItem, HandoffReason, HandoffStatus } from "./types";
import type { ViewerProfile } from "@/lib/viewer/profiles";

export type HandoffError =
  | "ESTADO_INVALIDO"
  | "ITEM_NAO_ENCONTRADO"
  | "ITEM_NAO_TRANSFERIVEL"
  | "SUCESSOR_IGUAL_AO_TITULAR"
  | "SEM_SUCESSOR"
  | "NAO_E_SUCESSOR"
  | "MOTIVO_OBRIGATORIO";

export type HandoffResult = { ok: true; dossier: HandoffDossier } | { ok: false; error: HandoffError; vars?: Record<string, string | number> };

export interface NewDossierInput {
  id: string;
  subject: { id: string; name: string };
  reason: HandoffReason;
  effectiveDate: string;
  today: string;
  requestedBy: { id: string; name: string; profile: ViewerProfile };
  consentForPrivateItems: boolean;
  defaultSuccessorId: string | null;
  collected: Collected;
  now: string;
}

const EDITABLE: readonly HandoffStatus[] = ["GERADO", "RECUSADO"];

/** Novo dossiê (GERADO) com os itens coletados; o sucessor padrão, se houver, já preenche os itens transferíveis. */
export function createDossier(input: NewDossierInput): HandoffDossier {
  const successor = input.defaultSuccessorId && input.defaultSuccessorId !== input.subject.id ? input.defaultSuccessorId : null;
  return {
    id: input.id,
    version: 1,
    subjectId: input.subject.id,
    subjectName: input.subject.name,
    reason: input.reason,
    effectiveDate: input.effectiveDate,
    collectedOn: input.today,
    requestedById: input.requestedBy.id,
    requestedByName: input.requestedBy.name,
    requestedByProfile: input.requestedBy.profile,
    createdAt: input.now,
    updatedAt: input.now,
    status: "GERADO",
    defaultSuccessorId: successor,
    consentForPrivateItems: input.consentForPrivateItems,
    privateExcluded: input.collected.privateExcluded,
    items: input.collected.items.map((i) => ({ ...i, successorId: i.transferable ? successor : null })),
    manualChecks: {},
    acknowledgments: [],
    refusal: null,
    cancellation: null,
    sources: input.collected.sources,
    history: [{ at: input.now, actorId: input.requestedBy.id, kind: "GERADO", vars: { items: input.collected.items.length } }],
  };
}

const bump = (d: HandoffDossier, patch: Partial<HandoffDossier>, event: HandoffDossier["history"][number]): HandoffDossier => ({
  ...d, ...patch, version: d.version + 1, updatedAt: event.at, history: [...d.history, event],
});

/** Sucessor de um item transferível (ou `null` para limpar). Só enquanto o dossiê pode ser editado (GERADO ou RECUSADO). */
export function assignSuccessor(d: HandoffDossier, itemId: string, successorId: string | null, actorId: string, now: string): HandoffResult {
  if (!EDITABLE.includes(d.status)) return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  const item = d.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, error: "ITEM_NAO_ENCONTRADO" };
  if (!item.transferable) return { ok: false, error: "ITEM_NAO_TRANSFERIVEL" };
  if (successorId && successorId === d.subjectId) return { ok: false, error: "SUCESSOR_IGUAL_AO_TITULAR" };
  return {
    ok: true,
    dossier: bump(d, { items: d.items.map((i) => (i.id === itemId ? { ...i, successorId } : i)) }, { at: now, actorId, kind: "SUCESSOR", vars: { item: itemId } }),
  };
}

/** Sucessor padrão: preenche os itens transferíveis ainda sem sucessor (ou todos, com `overwrite`). */
export function assignDefaultSuccessor(d: HandoffDossier, successorId: string, actorId: string, now: string, overwrite = false): HandoffResult {
  if (!EDITABLE.includes(d.status)) return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  if (successorId === d.subjectId) return { ok: false, error: "SUCESSOR_IGUAL_AO_TITULAR" };
  const items = d.items.map((i) => (i.transferable && (overwrite || !i.successorId) ? { ...i, successorId } : i));
  return { ok: true, dossier: bump(d, { items, defaultSuccessorId: successorId }, { at: now, actorId, kind: "SUCESSOR", vars: { item: "*" } }) };
}

/** Anotação curta do item para o sucessor (contexto: onde parou, o que falta). */
export function setItemNote(d: HandoffDossier, itemId: string, note: string, now: string): HandoffResult {
  if (!EDITABLE.includes(d.status)) return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  if (!d.items.some((i) => i.id === itemId)) return { ok: false, error: "ITEM_NAO_ENCONTRADO" };
  // a anotação muda a cada tecla: não entra na história (só a versão sobe)
  return { ok: true, dossier: { ...d, version: d.version + 1, updatedAt: now, items: d.items.map((i) => (i.id === itemId ? { ...i, note: note.slice(0, 500) } : i)) } };
}

export const transferableItems = (d: HandoffDossier): HandoffItem[] => d.items.filter((i) => i.transferable);
export const unassigned = (d: HandoffDossier): HandoffItem[] => transferableItems(d).filter((i) => !i.successorId);
/** Sucessores distintos indicados no plano. */
export const successorsOf = (d: HandoffDossier): string[] => [...new Set(transferableItems(d).map((i) => i.successorId).filter((x): x is string => !!x))];

/** Envia o dossiê ao(s) sucessor(es): todo item transferível precisa de sucessor. */
export function sendToSuccessors(d: HandoffDossier, actorId: string, now: string): HandoffResult {
  if (!EDITABLE.includes(d.status)) return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  const missing = unassigned(d).length;
  if (missing) return { ok: false, error: "SEM_SUCESSOR", vars: { n: missing } };
  return { ok: true, dossier: bump(d, { status: "AGUARDANDO_SUCESSOR", refusal: null, acknowledgments: [] }, { at: now, actorId, kind: "ENVIADO", vars: { successors: successorsOf(d).length } }) };
}

/** Ciência de um sucessor; com a de todos, o dossiê fica TRANSFERIDO. */
export function acknowledge(d: HandoffDossier, successorId: string, now: string): HandoffResult {
  if (d.status !== "AGUARDANDO_SUCESSOR") return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  if (!successorsOf(d).includes(successorId)) return { ok: false, error: "NAO_E_SUCESSOR" };
  const acknowledgments = d.acknowledgments.some((a) => a.successorId === successorId) ? d.acknowledgments : [...d.acknowledgments, { successorId, at: now }];
  const all = successorsOf(d).every((s) => acknowledgments.some((a) => a.successorId === s));
  return { ok: true, dossier: bump(d, { acknowledgments, status: all ? "TRANSFERIDO" : d.status }, { at: now, actorId: successorId, kind: "CIENCIA" }) };
}

/** Recusa com motivo (obrigatório): volta para RECUSADO e os itens desse sucessor ficam sem sucessor, para o chefe indicar outro. */
export function refuse(d: HandoffDossier, successorId: string, reason: string, now: string): HandoffResult {
  if (d.status !== "AGUARDANDO_SUCESSOR") return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  if (!successorsOf(d).includes(successorId)) return { ok: false, error: "NAO_E_SUCESSOR" };
  const why = reason.trim();
  if (!why) return { ok: false, error: "MOTIVO_OBRIGATORIO" };
  return {
    ok: true,
    dossier: bump(d, {
      status: "RECUSADO",
      refusal: { successorId, at: now, reason: why.slice(0, 500) },
      acknowledgments: [],
      items: d.items.map((i) => (i.successorId === successorId ? { ...i, successorId: null } : i)),
    }, { at: now, actorId: successorId, kind: "RECUSA" }),
  };
}

/** Cancela com motivo (obrigatório) antes da transferência. */
export function cancel(d: HandoffDossier, reason: string, actorId: string, now: string): HandoffResult {
  if (d.status === "TRANSFERIDO" || d.status === "CANCELADO") return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  const why = reason.trim();
  if (!why) return { ok: false, error: "MOTIVO_OBRIGATORIO" };
  return { ok: true, dossier: bump(d, { status: "CANCELADO", cancellation: { at: now, reason: why.slice(0, 500) } }, { at: now, actorId, kind: "CANCELADO" }) };
}

/** Marca/desmarca um item manual do checklist. */
export function toggleCheck(d: HandoffDossier, id: CheckId, done: boolean, actorId: string, now: string): HandoffResult {
  if (d.status === "CANCELADO" || d.status === "TRANSFERIDO") return { ok: false, error: "ESTADO_INVALIDO", vars: { status: d.status } };
  return { ok: true, dossier: bump(d, { manualChecks: { ...d.manualChecks, [id]: done } }, { at: now, actorId, kind: "CHECK", vars: { check: id } }) };
}

export interface ChecklistEntry {
  id: CheckId;
  /** calculado pelo sistema (não se marca à mão) */
  auto: boolean;
  done: boolean;
  /** chave i18n do texto e variáveis */
  label: Fact;
}

/** Checklist da transição: os itens calculados vêm do dossiê; os manuais, do que a pessoa marcou. */
export function checklist(d: HandoffDossier): ChecklistEntry[] {
  const total = transferableItems(d).length;
  const missing = unassigned(d).length;
  const pend = pendenciesOf(d.items).length;
  const contacts = d.items.filter((i) => i.section === "CONTATOS").length;
  const sources = d.items.filter((i) => i.section === "FONTES").length;
  const successors = successorsOf(d);
  const acked = successors.filter((s) => d.acknowledgments.some((a) => a.successorId === s)).length;
  const manual = (id: CheckId) => d.manualChecks[id] === true;
  return [
    { id: "SUCESSORES", auto: true, done: total > 0 && missing === 0, label: { key: "handoff.check.SUCESSORES", vars: { done: total - missing, total } } },
    pend ? { id: "PENDENCIAS", auto: false, done: manual("PENDENCIAS"), label: { key: "handoff.check.PENDENCIAS", vars: { n: pend } } }
      : { id: "PENDENCIAS", auto: true, done: true, label: { key: "handoff.check.PENDENCIAS_NONE" } },
    { id: "PRIVADOS", auto: true, done: true, label: d.consentForPrivateItems ? { key: "handoff.check.PRIVADOS_CONSENT" } : { key: "handoff.check.PRIVADOS", vars: { n: d.privateExcluded } } },
    { id: "CONTATOS", auto: false, done: manual("CONTATOS"), label: { key: "handoff.check.CONTATOS", vars: { n: contacts } } },
    { id: "FONTES", auto: false, done: manual("FONTES"), label: { key: "handoff.check.FONTES", vars: { n: sources } } },
    { id: "PRESERVACAO", auto: true, done: true, label: { key: `handoff.check.PRESERVACAO_${d.reason}` } },
    { id: "CIENCIA", auto: true, done: successors.length > 0 && acked === successors.length, label: { key: "handoff.check.CIENCIA", vars: { done: acked, total: successors.length } } },
  ];
}

/**
 * Resumo do dossiê em frases curtas, montado SÓ a partir das contagens dos itens (D-12: a "IA" do app não cita número fora delas).
 * A tela marca o bloco com ✦.
 */
export function summarize(d: HandoffDossier): Fact[] {
  const count = (s: HandoffItem["section"]) => d.items.filter((i) => i.section === s).length;
  const pend = pendenciesOf(d.items);
  const byKind = (kind: NonNullable<HandoffItem["pendency"]>) => pend.filter((i) => i.pendency === kind).length;
  const lines: Fact[] = [
    { key: "handoff.summary.scope", vars: { name: d.subjectName, projects: count("PROJETOS"), tasks: count("TAREFAS"), decisions: count("DECISOES") } },
  ];
  if (pend.length) lines.push({ key: "handoff.summary.pendencies", vars: { n: pend.length, legal: byKind("PRAZO_LEGAL"), overdue: byKind("VENCIDA") + byKind("DECISAO_ATRASADA"), blocked: byKind("BLOQUEADA") } });
  else lines.push({ key: "handoff.summary.noPendencies" });
  if (count("RISCOS")) lines.push({ key: "handoff.summary.risks", vars: { n: count("RISCOS") } });
  lines.push({ key: "handoff.summary.knowledge", vars: { contacts: count("CONTATOS"), sources: count("FONTES") } });
  if (d.privateExcluded) lines.push({ key: "handoff.summary.private", vars: { n: d.privateExcluded } });
  const missing = unassigned(d).length;
  lines.push(missing ? { key: "handoff.summary.missing", vars: { n: missing } } : { key: "handoff.summary.allAssigned", vars: { n: successorsOf(d).length } });
  return lines;
}
