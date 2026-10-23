/**
 * Estados de tarefa como o usuário os entende (auditoria de 17/10/2026). O enum de domínio `TaskState` mistura três
 * eixos: execução (RASCUNHO…CONCLUIDA), publicação (MODELO_PUBLICO, OFERECIDA) e arquivo (ARQUIVADA). Cards, filtros e
 * contagens usam o eixo de execução padronizado — A realizar, Em andamento, Bloqueado, Concluído — e mostram publicação
 * à parte. As transições espelham `TaskState.java` (o backend valida; o teste lê o Java para não divergir).
 */
import type { TaskState } from "@/lib/social/types";

export const WORK_STATUSES = ["A_REALIZAR", "EM_ANDAMENTO", "BLOQUEADO", "CONCLUIDO", "ARQUIVADO"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  RASCUNHO: ["DISPONIVEL", "ARQUIVADA"],
  DISPONIVEL: ["EM_USO", "BLOQUEADA", "CONCLUIDA", "ARQUIVADA", "MODELO_PUBLICO", "OFERECIDA"],
  EM_USO: ["DISPONIVEL", "BLOQUEADA", "CONCLUIDA"],
  BLOQUEADA: ["EM_USO", "DISPONIVEL"],
  CONCLUIDA: ["EM_USO", "DISPONIVEL", "ARQUIVADA", "MODELO_PUBLICO", "OFERECIDA"],
  ARQUIVADA: ["DISPONIVEL", "OFERECIDA"],
  MODELO_PUBLICO: ["DISPONIVEL", "ARQUIVADA", "OFERECIDA"],
  OFERECIDA: ["DISPONIVEL", "MODELO_PUBLICO"],
};

/**
 * Estado de execução. MODELO_PUBLICO e OFERECIDA são publicação, não execução: chegam de DISPONIVEL ou de CONCLUIDA,
 * e o enum não guarda de qual — por isso o card exibe "Publicado como modelo" e não inventa progresso.
 */
export function workStatusOf(state: TaskState): WorkStatus | null {
  switch (state) {
    case "RASCUNHO":
    case "DISPONIVEL":
      return "A_REALIZAR";
    case "EM_USO":
      return "EM_ANDAMENTO";
    case "BLOQUEADA":
      return "BLOQUEADO";
    case "CONCLUIDA":
      return "CONCLUIDO";
    case "ARQUIVADA":
      return "ARQUIVADO";
    case "MODELO_PUBLICO":
    case "OFERECIDA":
      return null;
  }
}

export type PublicationStatus = "MODELO_PUBLICO" | "OFERECIDA";
export const publicationOf = (state: TaskState): PublicationStatus | null => (state === "MODELO_PUBLICO" || state === "OFERECIDA" ? state : null);

export type TransitionDenial = "TAREFA_TRANSICAO_INVALIDA" | "TAREFA_BLOQUEIO_SEM_CAUSA";

/** Mesma regra do backend: tabela de transições e bloqueio sempre com causa (TaskItem.block). */
export function canTransitionTask(from: TaskState, to: TaskState, blockReason?: string | null): { ok: true } | { ok: false; reason: TransitionDenial } {
  if (!TASK_TRANSITIONS[from].includes(to)) return { ok: false, reason: "TAREFA_TRANSICAO_INVALIDA" };
  if (to === "BLOQUEADA" && !blockReason?.trim()) return { ok: false, reason: "TAREFA_BLOQUEIO_SEM_CAUSA" };
  return { ok: true };
}

/** Próxima ação sugerida pelo estado de execução (card de tarefa: "o que fazer agora"). */
export function nextActionOf(state: TaskState): "INICIAR" | "CONCLUIR" | "DESBLOQUEAR" | "REVISAR" | null {
  switch (workStatusOf(state)) {
    case "A_REALIZAR":
      return state === "RASCUNHO" ? "REVISAR" : "INICIAR";
    case "EM_ANDAMENTO":
      return "CONCLUIR";
    case "BLOQUEADO":
      return "DESBLOQUEAR";
    default:
      return null;
  }
}
