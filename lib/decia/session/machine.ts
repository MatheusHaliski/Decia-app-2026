/**
 * Máquina de estados da sessão (DECIA_SESSAO_E_MESA §A.1/§A.2, `SessionStatusMachine` proposta): 12 estados, transições
 * explícitas e testadas, motivo obrigatório para recusar/cancelar/devolver/encerrar sem decisão. Só o PROPRIETARIO (moderador e
 * revisor da sessão, Q-03/Q-17) muda o estado; cada mudança vira aviso do sistema no chat e entra no `statusLog`.
 */
import { can } from "./roles";
import type { CommandResult, DeciaSession, DeliberationPhase, SessionMessage, SessionStatus, StatusChange } from "./types";

export const SESSION_TRANSITIONS: Readonly<Record<SessionStatus, readonly SessionStatus[]>> = {
  RASCUNHO: ["AGENDADA", "ABERTA", "CANCELADA"],
  AGENDADA: ["ABERTA", "CANCELADA"],
  ABERTA: ["CONVERGINDO", "ENCERRADA"],
  CONVERGINDO: ["DECISAO_PROPOSTA", "ABERTA"],
  DECISAO_PROPOSTA: ["EM_REVISAO", "CONVERGINDO"],
  EM_REVISAO: ["VALIDADA", "DEVOLVIDA"],
  VALIDADA: ["ENCERRADA"],
  DEVOLVIDA: ["REABERTA", "ENCERRADA"],
  REABERTA: ["CONVERGINDO", "ENCERRADA"],
  ENCERRADA: ["ARQUIVADA"],
  ARQUIVADA: [],
  CANCELADA: [],
};

/** Chat aberto a mensagens só em ABERTA/REABERTA; nos demais o chat fica em leitura (409 SESSAO_NAO_ATIVA). */
export const isChatOpen = (s: SessionStatus) => s === "ABERTA" || s === "REABERTA";
/** Reuniões da Ata Viva acontecem com a deliberação em andamento. */
export const acceptsMeetings = (s: SessionStatus) => isChatOpen(s);
export const isTerminal = (s: SessionStatus) => SESSION_TRANSITIONS[s].length === 0;
export const canTransition = (from: SessionStatus, to: SessionStatus) => SESSION_TRANSITIONS[from].includes(to);

/** Recusar/cancelar, devolver e encerrar sem decisão exigem motivo (§A.2: "com motivo"). */
export function reasonRequired(from: SessionStatus, to: SessionStatus): boolean {
  if (to === "CANCELADA" || to === "DEVOLVIDA") return true;
  return to === "ENCERRADA" && from !== "VALIDADA";
}

/** Fase sugerida ao entrar num estado (REABERTA volta a ESCLARECER com o motivo fixado, §A.2). */
function phaseAfter(to: SessionStatus, current: DeliberationPhase): DeliberationPhase {
  if (to === "REABERTA") return "ESCLARECER";
  if (to === "CONVERGINDO" || to === "DECISAO_PROPOSTA") return "DECIDIR";
  if (to === "ABERTA" && current === "DECIDIR") return "CONVERGIR";
  return current;
}

export function transitionSession(
  session: DeciaSession,
  actor: string,
  to: SessionStatus,
  reason: string | null,
  now: Date,
  messageId: string,
): CommandResult<{ session: DeciaSession; message: SessionMessage }> {
  if (!can(session, actor, "MUDAR_ESTADO")) return { ok: false, reason: "SEM_PERMISSAO" };
  const from = session.status;
  if (!canTransition(from, to)) return { ok: false, reason: "TRANSICAO_INVALIDA" };
  const why = reason?.trim() || null;
  if (reasonRequired(from, to) && (!why || why.length < 5)) return { ok: false, reason: "MOTIVO_OBRIGATORIO" };
  const at = now.toISOString();
  const message: SessionMessage = {
    id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {},
    notice: { kind: "ESTADO_ALTERADO", from, to, by: actor, reason: why },
  };
  const change: StatusChange = { from, to, by: actor, at, reason: why };
  return {
    ok: true,
    message,
    session: { ...session, status: to, phase: phaseAfter(to, session.phase), updatedAt: at, messages: [...session.messages, message], statusLog: [...session.statusLog, change] },
  };
}
