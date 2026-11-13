/**
 * Papéis na sessão (DECIA_SESSAO_E_MESA §E.1, com os nomes de `lib/ai/autonomy.ts`): PROPRIETARIO = moderador/administrador da
 * sessão (troca o modo da IA, muda o estado); EDITOR = membro que delibera; COMENTADOR = participa com perguntas e reações;
 * LEITOR = observador (só lê). A matriz é a fonte única: a tela desabilita o que o papel não permite e explica o motivo.
 */
import { roleOf } from "@/lib/ai/autonomy";
import type { DeciaSession, SessionRole } from "./types";

export const SESSION_ACTIONS = [
  "LER", "ENVIAR_MENSAGEM", "ENVIAR_EVIDENCIA", "PERGUNTAR", "RESPONDER", "REAGIR", "PERGUNTAR_IA", "EDITAR_MINUTA",
  "DECIDIR_PROPOSTA", "NOVA_REUNIAO", "RATIFICAR_ATA", "CONTESTAR_ATA", "TROCAR_MODO", "MUDAR_ESTADO",
] as const;
export type SessionAction = (typeof SESSION_ACTIONS)[number];

const EDITOR_ACTIONS: readonly SessionAction[] = [
  "LER", "ENVIAR_MENSAGEM", "ENVIAR_EVIDENCIA", "PERGUNTAR", "RESPONDER", "REAGIR", "PERGUNTAR_IA", "EDITAR_MINUTA", "DECIDIR_PROPOSTA",
  "NOVA_REUNIAO", "RATIFICAR_ATA", "CONTESTAR_ATA",
];

export const ROLE_ACTIONS: Readonly<Record<SessionRole, readonly SessionAction[]>> = {
  PROPRIETARIO: SESSION_ACTIONS,
  EDITOR: EDITOR_ACTIONS,
  COMENTADOR: ["LER", "PERGUNTAR", "REAGIR", "PERGUNTAR_IA", "RATIFICAR_ATA", "CONTESTAR_ATA"],
  LEITOR: ["LER"],
};

export const roleCan = (role: SessionRole | null | undefined, action: SessionAction): boolean => !!role && ROLE_ACTIONS[role].includes(action);

export const memberRole = (session: Pick<DeciaSession, "participants">, userId: string): SessionRole | null => roleOf(session.participants, userId);

export const can = (session: Pick<DeciaSession, "participants">, userId: string, action: SessionAction): boolean => roleCan(memberRole(session, userId), action);

export const ownerOf = (session: Pick<DeciaSession, "participants">): string | null => session.participants.find((p) => p.role === "PROPRIETARIO")?.userId ?? null;
