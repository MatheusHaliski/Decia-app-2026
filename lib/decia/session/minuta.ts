/**
 * Minuta da sessão e propostas da IA ✦ (RF51.CA02/CA05; §D Minuta Coletiva, versão mínima). A IA só PROPÕE um texto novo,
 * calculado a partir dos fatos da sessão (D-12); uma pessoa aceita, edita e aceita, ou rejeita — e pode reverter depois (ponto
 * de restauração). A proposta guarda a versão da política e a revisão da minuta em que foi calculada: trocar o modo, mudar o teto
 * da organização ou editar a minuta a deixa obsoleta (`proposalValidity`), sem perder o rascunho. Cada decisão humana devolve a
 * intenção de auditoria (antes · proposta · depois) que o repositório grava no livro somente-acréscimo.
 */
import { evaluateAiAction, proposalValidity, type AiPolicy } from "@/lib/ai/autonomy";
import type { AuditInput } from "@/lib/decia/audit/types";
import { evidenceMessages, openQuestions } from "./chat";
import { effectivePolicy, MINUTA_TARGET } from "./policy";
import { can, memberRole } from "./roles";
import type { CommandResult, DateOnly, DeciaSession, OrgAiPolicy, PeopleDirectory, SessionMessage, SessionProposal, SessionStatus } from "./types";

export const MAX_MINUTA_CHARS = 20_000;

/** A minuta muda até a decisão ir à revisão; validada/encerrada fica somente leitura (§D.3-1, correção só por errata). */
export const MINUTA_EDITABLE: readonly SessionStatus[] = ["RASCUNHO", "AGENDADA", "ABERTA", "CONVERGINDO", "DECISAO_PROPOSTA", "DEVOLVIDA", "REABERTA"];
export const isMinutaEditable = (s: SessionStatus) => MINUTA_EDITABLE.includes(s);

export interface MinutaLabels {
  heading: string;
  evidence: (n: number) => string;
  questions: (n: number) => string;
  decisions: (n: number) => string;
  followUps: (open: number, done: number) => string;
  none: string;
  formatDate: (d: DateOnly) => string;
}

const nameOf = (people: PeopleDirectory, id: string) => people[id]?.name ?? id;
const author = (m: SessionMessage, people: PeopleDirectory) => (m.author.kind === "PESSOA" ? nameOf(people, m.author.userId) : "IA");

/** Texto proposto pela IA: só o que a sessão registrou (evidências, perguntas abertas, decisões em ata, encaminhamentos). */
export function composeMinutaProposal(session: DeciaSession, labels: MinutaLabels, people: PeopleDirectory): string {
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : `- ${labels.none}`);
  const ev = evidenceMessages(session);
  const qs = openQuestions(session);
  const decisions = session.meetings.filter((m) => m.status === "CONFIRMADA" || m.status === "CONTESTADA").flatMap((m) => m.draft?.decisions ?? []);
  const open = session.followUps.filter((f) => f.status === "ABERTO");
  const done = session.followUps.filter((f) => f.status === "CUMPRIDO");
  return [
    labels.heading,
    "",
    labels.evidence(ev.length),
    list(ev.map((m) => `${author(m, people)}: ${m.text}${m.reference ? ` (${m.reference.label})` : ""}`)),
    "",
    labels.questions(qs.length),
    list(qs.map((m) => `${author(m, people)}: ${m.text}`)),
    "",
    labels.decisions(decisions.length),
    list(decisions.map((d) => d.text)),
    "",
    labels.followUps(open.length, done.length),
    list(session.followUps.map((f) => `${f.action} — ${nameOf(people, f.responsibleId)} · ${labels.formatDate(f.dueDate)}${f.status === "CUMPRIDO" ? " ✓" : ""}`)),
  ].join("\n");
}

const firstLine = (s: string) => (s.split("\n").find((l) => l.trim()) ?? "").trim().slice(0, 120);

/**
 * Pede à IA uma proposta para a minuta (ou, com `requestedBy = null`, a IA propõe por iniciativa própria — só nos modos que
 * permitem). Grava a proposta e uma mensagem PROPOSTA_IA no chat apontando para ela.
 */
export function requestProposal(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  requestedBy: string | null,
  viewerPolicy: AiPolicy,
  text: string,
  now: Date,
  ids: { proposal: string; message: string },
): CommandResult<{ session: DeciaSession; proposal: SessionProposal }> {
  if (requestedBy !== null) {
    if (!memberRole(session, requestedBy)) return { ok: false, reason: "NAO_PARTICIPA" };
    if (!can(session, requestedBy, "EDITAR_MINUTA")) return { ok: false, reason: "SEM_PERMISSAO" };
  }
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  const eff = effectivePolicy(session, org);
  const verdict = requestedBy === null
    ? evaluateAiAction(eff, "SUGESTAO_ESPONTANEA", { requestedByUser: false })
    : evaluateAiAction(viewerPolicy, "PROPOR_ALTERACAO", { requestedByUser: true });
  if (!verdict.ok) return verdict;
  if (text.trim() === session.minuta.text.trim()) return { ok: false, reason: "SEM_ALTERACAO" };
  const at = now.toISOString();
  const proposal: SessionProposal = {
    id: ids.proposal, kind: "MINUTA", policyVersion: eff.version, baseRevision: session.minuta.revision, targetIds: [MINUTA_TARGET], reviewedBy: null,
    createdAt: at, mode: eff.mode, requestedBy, baseText: session.minuta.text, text: text.slice(0, MAX_MINUTA_CHARS), status: "PENDENTE",
  };
  const message: SessionMessage = { id: ids.message, kind: "PROPOSTA_IA", author: { kind: "IA" }, at, text: "", proposalId: proposal.id, requestedBy, reactions: {} };
  return { ok: true, proposal, session: { ...session, updatedAt: at, proposals: [...session.proposals, proposal], messages: [...session.messages, message] } };
}

export type ProposalDecision = { kind: "ACEITAR" } | { kind: "EDITAR_E_ACEITAR"; text: string } | { kind: "REJEITAR"; reason: string };

const policyOf = (p: AiPolicy) => ({ mode: p.mode, version: p.version });

export function resolveProposal(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  actor: string,
  proposalId: string,
  decision: ProposalDecision,
  now: Date,
): CommandResult<{ session: DeciaSession; audit: AuditInput }> {
  if (!can(session, actor, "DECIDIR_PROPOSTA")) return { ok: false, reason: "SEM_PERMISSAO" };
  const p = session.proposals.find((x) => x.id === proposalId);
  if (!p) return { ok: false, reason: "PROPOSTA_INEXISTENTE" };
  if (p.status !== "PENDENTE") return { ok: false, reason: "PROPOSTA_JA_RESOLVIDA" };
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  const eff = effectivePolicy(session, org);
  const validity = proposalValidity(eff, { ...p, reviewedBy: actor }, session.minuta.revision, new Set([MINUTA_TARGET]));
  if (!validity.ok) return validity;
  const at = now.toISOString();
  const current = session.minuta.text;
  const base = { at, actorId: actor, source: "SESSAO" as const, sessionId: session.id, decisionId: session.decisionId, contextTitle: session.title, policy: policyOf(eff), proposed: p.text, before: current };
  const target = { kind: "PROPOSTA_MINUTA" as const, id: p.id, label: firstLine(p.text) };
  if (decision.kind === "REJEITAR") {
    const reason = decision.reason.trim();
    if (reason.length < 5) return { ok: false, reason: "MOTIVO_OBRIGATORIO" };
    const proposals = session.proposals.map((x) => (x.id === p.id ? { ...x, status: "REJEITADA" as const, reviewedBy: actor, resolvedBy: actor, resolvedAt: at, reason } : x));
    return { ok: true, session: { ...session, updatedAt: at, proposals }, audit: { ...base, action: "REJEITOU", target, reason, after: current } };
  }
  const edited = decision.kind === "EDITAR_E_ACEITAR" && decision.text.trim() !== p.text.trim();
  const text = edited ? (decision as { text: string }).text.trim().slice(0, MAX_MINUTA_CHARS) : p.text;
  if (!text.trim()) return { ok: false, reason: "TEXTO_VAZIO" };
  const revision = session.minuta.revision + 1;
  const minuta = {
    revision, text,
    history: [...session.minuta.history, { revision, text, by: actor, at, origin: edited ? ("PROPOSTA_IA_EDITADA" as const) : ("PROPOSTA_IA" as const), proposalId: p.id }],
  };
  const status = edited ? ("EDITADA_E_ACEITA" as const) : ("ACEITA" as const);
  const proposals = session.proposals.map((x) => (x.id === p.id ? { ...x, status, reviewedBy: actor, resolvedBy: actor, resolvedAt: at, appliedRevision: revision, reason: null } : x));
  return { ok: true, session: { ...session, updatedAt: at, minuta, proposals }, audit: { ...base, action: edited ? "EDITOU_E_ACEITOU" : "ACEITOU", target, reason: null, after: text } };
}

/**
 * Reverte uma proposta aplicada (ponto de restauração): volta ao texto anterior a ela numa revisão NOVA (nada é apagado). Só
 * enquanto ninguém mudou a minuta depois; senão a reversão desfaria trabalho de outra pessoa.
 */
export function revertProposal(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  actor: string,
  proposalId: string,
  reason: string,
  now: Date,
): CommandResult<{ session: DeciaSession; audit: AuditInput }> {
  if (!can(session, actor, "DECIDIR_PROPOSTA")) return { ok: false, reason: "SEM_PERMISSAO" };
  const p = session.proposals.find((x) => x.id === proposalId);
  if (!p) return { ok: false, reason: "PROPOSTA_INEXISTENTE" };
  if ((p.status !== "ACEITA" && p.status !== "EDITADA_E_ACEITA") || p.revertedAt || p.appliedRevision == null) return { ok: false, reason: "NADA_A_REVERTER" };
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  if (session.minuta.revision !== p.appliedRevision) return { ok: false, reason: "MINUTA_MUDOU_DEPOIS" };
  const why = reason.trim();
  if (why.length < 5) return { ok: false, reason: "MOTIVO_OBRIGATORIO" };
  const previous = session.minuta.history.find((h) => h.revision === p.appliedRevision! - 1);
  if (!previous) return { ok: false, reason: "REVISAO_INEXISTENTE" };
  const at = now.toISOString();
  const revision = session.minuta.revision + 1;
  const minuta = {
    revision, text: previous.text,
    history: [...session.minuta.history, { revision, text: previous.text, by: actor, at, origin: "REVERSAO" as const, proposalId: p.id, revertedFrom: p.appliedRevision }],
  };
  const proposals = session.proposals.map((x) => (x.id === p.id ? { ...x, revertedAt: at } : x));
  const eff = effectivePolicy(session, org);
  return {
    ok: true,
    session: { ...session, updatedAt: at, minuta, proposals },
    audit: {
      at, actorId: actor, action: "REVERTEU", source: "SESSAO", sessionId: session.id, decisionId: session.decisionId, contextTitle: session.title,
      target: { kind: "PROPOSTA_MINUTA", id: p.id, label: firstLine(p.text) }, policy: policyOf(eff), reason: why, before: session.minuta.text, proposed: null, after: previous.text,
    },
  };
}

/** Edição humana direta da minuta (revisão nova). Deixa obsoletas as propostas calculadas sobre o texto anterior. */
export function editMinuta(session: DeciaSession, actor: string, text: string, now: Date): CommandResult<{ session: DeciaSession }> {
  if (!can(session, actor, "EDITAR_MINUTA")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (!isMinutaEditable(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  const next = text.slice(0, MAX_MINUTA_CHARS);
  if (next.trim() === session.minuta.text.trim()) return { ok: false, reason: "SEM_ALTERACAO" };
  const at = now.toISOString();
  const revision = session.minuta.revision + 1;
  return {
    ok: true,
    session: { ...session, updatedAt: at, minuta: { revision, text: next, history: [...session.minuta.history, { revision, text: next, by: actor, at, origin: "HUMANO" }] } },
  };
}
