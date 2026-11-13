/**
 * Autonomia da IA na sessão (RF51, D-136, D-156). Três camadas, vale sempre a MAIS RESTRITIVA:
 *   1. teto da organização (`OrgAiPolicy.ceiling`, editado por ADMIN ou EMPRESA em /admin › IA);
 *   2. modo da sessão (`DeciaSession.policy`, trocado só pelo PROPRIETARIO com `changeMode` de lib/ai/autonomy);
 *   3. preferência pessoal de quem está vendo (`aiAutonomyDefault`, Configurações › Trabalho).
 * O que a IA faz no espaço compartilhado (sugestões espontâneas, propostas) segue 1+2; o que cada pessoa vê e pode pedir segue
 * 1+2+3. Toda troca (da sessão ou do teto) sobe a versão da política: propostas calculadas antes ficam obsoletas
 * (`proposalValidity`) e todos os membros recebem um aviso do sistema com selo de não lido.
 *
 * Extensões feitas aqui (lib/ai/autonomy.ts não muda): teto da organização (`ACIMA_DO_TETO`), aviso de troca do teto (a pessoa
 * que muda o teto não é membro da sessão, então `changeMode` não serve) e a visibilidade das mensagens da IA por pessoa.
 */
import {
  AUTONOMY_MODES, canChangeMode, changeMode, evaluateAiAction, proposalValidity, type AgentCharter, type AiPolicy, type AutonomyDenial, type AutonomyMode,
} from "@/lib/ai/autonomy";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import type { CommandResult, DeciaSession, OrgAiPolicy, SessionMessage, SessionProposal } from "./types";

export const modeRank = (m: AutonomyMode) => AUTONOMY_MODES.indexOf(m);
export const mostRestrictive = (...modes: readonly AutonomyMode[]): AutonomyMode =>
  modes.reduce((a, b) => (modeRank(b) < modeRank(a) ? b : a), "AGENTE" as AutonomyMode);
export const exceeds = (mode: AutonomyMode, ceiling: AutonomyMode) => modeRank(mode) > modeRank(ceiling);

/** Política efetiva da sessão: o modo configurado limitado pelo teto; o mandato só vale se o efetivo ainda for AGENTE. */
export function effectivePolicy(session: Pick<DeciaSession, "policy">, org: Pick<OrgAiPolicy, "ceiling">): AiPolicy {
  const mode = mostRestrictive(session.policy.mode, org.ceiling);
  return { ...session.policy, mode, charter: mode === "AGENTE" ? session.policy.charter : null };
}

export type ModeSource = "ORGANIZACAO" | "SESSAO" | "PESSOAL";
export interface ViewerMode {
  mode: AutonomyMode;
  /** camadas que fixam o modo efetivo (as que estão no nível mais restritivo) */
  limitedBy: ModeSource[];
  policy: AiPolicy;
}

/** Modo efetivo para quem está vendo (D-156): o mais restritivo entre organização, sessão e preferência pessoal. */
export function viewerMode(session: Pick<DeciaSession, "policy">, org: Pick<OrgAiPolicy, "ceiling">, personal: AutonomyMode): ViewerMode {
  const layers: [ModeSource, AutonomyMode][] = [["ORGANIZACAO", org.ceiling], ["SESSAO", session.policy.mode], ["PESSOAL", personal]];
  const mode = mostRestrictive(...layers.map(([, m]) => m));
  const eff = effectivePolicy(session, org);
  return { mode, limitedBy: layers.filter(([, m]) => m === mode).map(([s]) => s), policy: { ...eff, mode, charter: mode === "AGENTE" ? eff.charter : null } };
}

/** Política inicial de uma sessão nova: o padrão da organização, nunca acima do teto. */
export function initialSessionPolicy(org: Pick<OrgAiPolicy, "ceiling" | "defaultMode">, actor: string, now: Date): AiPolicy {
  return { mode: mostRestrictive(org.defaultMode, org.ceiling), version: 1, changedBy: actor, changedAt: now.toISOString(), charter: null };
}

/* ── Propostas ───────────────────────────────────────────────────────────────────────────────────────────── */

export type ProposalView =
  | { state: "PENDENTE" }
  | { state: "OBSOLETA"; reason: AutonomyDenial }
  | { state: "ACEITA" | "EDITADA_E_ACEITA" | "REJEITADA" };

export const MINUTA_TARGET = "minuta";

/** Estado de uma proposta agora: pendente só se a política e a revisão da minuta ainda são as da geração. */
export function proposalView(session: Pick<DeciaSession, "policy" | "minuta">, org: Pick<OrgAiPolicy, "ceiling">, p: SessionProposal): ProposalView {
  if (p.status !== "PENDENTE") return { state: p.status };
  const v = proposalValidity(effectivePolicy(session, org), p, session.minuta.revision, new Set([MINUTA_TARGET]));
  return v.ok ? { state: "PENDENTE" } : { state: "OBSOLETA", reason: v.reason };
}

export const pendingValid = (session: Pick<DeciaSession, "policy" | "minuta" | "proposals">, org: Pick<OrgAiPolicy, "ceiling">) =>
  session.proposals.filter((p) => proposalView(session, org, p).state === "PENDENTE");

/* ── Troca de modo pela pessoa proprietária ──────────────────────────────────────────────────────────────── */

function noticeUnread(session: DeciaSession, notify: readonly string[], messageId: string): Record<string, string[]> {
  const unread = { ...session.unread };
  for (const id of notify) unread[id] = [...(unread[id] ?? []), messageId];
  return unread;
}

export function changeSessionMode(
  session: DeciaSession,
  org: Pick<OrgAiPolicy, "ceiling">,
  actor: string,
  to: AutonomyMode,
  now: Date,
  charter: AgentCharter | null,
  messageId: string,
): CommandResult<{ session: DeciaSession; message: SessionMessage; invalidated: number }> {
  if (!canChangeMode(session.participants, actor)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (exceeds(to, org.ceiling)) return { ok: false, reason: "ACIMA_DO_TETO" };
  if (to === session.policy.mode && to !== "AGENTE") return { ok: false, reason: "SEM_ALTERACAO" };
  const r = changeMode(session.policy, session.participants, actor, to, now, charter);
  if (!r.ok) return r;
  const invalidated = pendingValid(session, org).length;
  const message: SessionMessage = {
    id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at: r.notice.at, text: "", reactions: {},
    notice: { kind: "MODO_ALTERADO", from: r.notice.from, to: r.notice.to, by: actor, policyVersion: r.notice.policyVersion, invalidated },
  };
  return {
    ok: true,
    invalidated,
    message,
    session: { ...session, policy: r.policy, updatedAt: r.notice.at, messages: [...session.messages, message], unread: noticeUnread(session, r.notice.notify, messageId) },
  };
}

/* ── Política da organização (teto e padrão) ─────────────────────────────────────────────────────────────── */

/** Quem edita a política da organização: ADMIN (sistema) e EMPRESA (dona da organização). */
export const canEditOrgPolicy = (profile: ViewerProfile) => profile === "ADMIN" || profile === "EMPRESA";

export function validateOrgPolicy(next: { ceiling: AutonomyMode; defaultMode: AutonomyMode }): { ok: true } | { ok: false; reason: "PADRAO_ACIMA_DO_TETO" | "PADRAO_AGENTE_PROIBIDO" } {
  // sessão nova nunca nasce como agente: o modo AGENTE exige um mandato dado pela pessoa proprietária (D-136)
  if (next.defaultMode === "AGENTE") return { ok: false, reason: "PADRAO_AGENTE_PROIBIDO" };
  if (exceeds(next.defaultMode, next.ceiling)) return { ok: false, reason: "PADRAO_ACIMA_DO_TETO" };
  return { ok: true };
}

export function changeOrgPolicy(
  org: OrgAiPolicy,
  profile: ViewerProfile,
  actorLabel: string,
  next: { ceiling: AutonomyMode; defaultMode: AutonomyMode },
  now: Date,
): CommandResult<{ org: OrgAiPolicy; ceilingChanged: boolean }> {
  if (!canEditOrgPolicy(profile)) return { ok: false, reason: "SEM_PERMISSAO" };
  const v = validateOrgPolicy(next);
  if (!v.ok) return v;
  if (next.ceiling === org.ceiling && next.defaultMode === org.defaultMode) return { ok: false, reason: "SEM_ALTERACAO" };
  const at = now.toISOString();
  const entry = { ceiling: next.ceiling, defaultMode: next.defaultMode, version: org.version + 1, changedBy: actorLabel, changedAt: at };
  return { ok: true, ceilingChanged: next.ceiling !== org.ceiling, org: { ...entry, history: [...org.history, entry] } };
}

/**
 * Aplica um teto novo a uma sessão: a versão da política sobe (as propostas pendentes ficam obsoletas e um agente em execução
 * para), o modo configurado é mantido (volta a valer se o teto subir de novo) e TODOS os membros recebem o aviso.
 */
export function applyOrgCeiling(
  session: DeciaSession,
  before: Pick<OrgAiPolicy, "ceiling">,
  after: Pick<OrgAiPolicy, "ceiling">,
  actorLabel: string,
  now: Date,
  messageId: string,
): { session: DeciaSession; message: SessionMessage; invalidated: number } {
  const at = now.toISOString();
  const invalidated = pendingValid(session, before).length;
  const policy: AiPolicy = { ...session.policy, version: session.policy.version + 1, changedBy: actorLabel, changedAt: at };
  const message: SessionMessage = {
    id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {},
    notice: {
      kind: "TETO_ALTERADO", ceiling: after.ceiling, before: effectivePolicy(session, before).mode, after: mostRestrictive(session.policy.mode, after.ceiling),
      by: actorLabel, policyVersion: policy.version, invalidated,
    },
  };
  const notify = session.participants.map((p) => p.userId);
  return { invalidated, message, session: { ...session, policy, updatedAt: at, messages: [...session.messages, message], unread: noticeUnread(session, notify, messageId) } };
}

/* ── O que cada pessoa vê da IA ──────────────────────────────────────────────────────────────────────────── */

export type AiVisibility = "VISIVEL" | "SOB_PEDIDO" | "OCULTA";

/**
 * Mensagem ou proposta da IA para quem está vendo: visível se o modo da pessoa permite iniciativa da IA ou se foi ela quem pediu;
 * "sob pedido" (aparece ao clicar "mostrar") se o modo só responde a pedidos; oculta no modo Manual.
 */
export function aiVisibility(viewer: AiPolicy, requestedBy: string | null | undefined, viewerId: string): AiVisibility {
  if (evaluateAiAction(viewer, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok) return "VISIVEL";
  if (!evaluateAiAction(viewer, "RESPONDER", { requestedByUser: true }).ok) return "OCULTA";
  return requestedBy === viewerId ? "VISIVEL" : "SOB_PEDIDO";
}
