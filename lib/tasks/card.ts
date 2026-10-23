/**
 * Adaptador puro `TaskView` (API real, `/api/tasks`) → view model do card de tarefa (ANATOMIA_CARDS §0 card 3 e §9). A tarefa
 * real usa a mesma anatomia do `TaskSchemeCard` (tipo, arte da família, estado, prazo, classificação), com as mesmas regras do
 * DEMO (`TASK_TYPE_META`, `TASK_STATE_TONE`, `dueKindOf`). O que a API não tem fica de fora, nunca zerado nem inventado:
 * curtidas, comentários, remixes, selos, chancelas, crédito e delegação (sem barra social: `social: false`); nome de autor e
 * responsável (a API só traz ids); nome e cor do departamento (só `departmentId`).
 */
import { TASK_STATE_TONE, TASK_TYPE_META, dueKindOf, type PlainTaskCardViewModel, type TaskCardVariant } from "@/lib/social/view-model";
import type { TaskView } from "./client";
import { workStatusOf } from "./status";

export interface ApiCardOptions {
  /** quem olha: marca a variação ATRIBUIDA quando a tarefa de outra pessoa está sob a responsabilidade do viewer */
  viewerId?: string | null;
  /** relógio da tela, para o tipo de prazo (em dia · vence em breve · atrasado) */
  now: Date;
}

/** Valores ausentes seguem os padrões do servidor (`TaskService.validate`: INTERNO, PRIVADA; estado inicial RASCUNHO). */
export function toTaskCardViewModelFromApi(task: TaskView, { viewerId = null, now }: ApiCardOptions): PlainTaskCardViewModel {
  const id = task.id ?? "";
  const type = task.type ?? "DOCUMENTO";
  const state = task.state ?? "RASCUNHO";
  const meta = TASK_TYPE_META[type];
  const dueAt = task.dueAt ? task.dueAt.slice(0, 10) : null;
  const variants = new Set<TaskCardVariant>([state]);
  if (viewerId && task.responsibleId === viewerId && task.ownerId !== viewerId) variants.add("ATRIBUIDA");
  return {
    kind: "TASK",
    social: false,
    id,
    ref: { type: "TASK", id },
    href: `/tasks/${id}`,
    title: task.title ?? "",
    summary: task.objective?.trim() || null,
    type,
    typeSymbol: meta.symbol,
    typeTone: meta.tone,
    family: meta.family,
    category: task.category ?? null,
    format: null,
    state,
    stateTone: TASK_STATE_TONE[state],
    workStatus: workStatusOf(state),
    visibility: task.visibility ?? "PRIVADA",
    accessClass: task.accessClass ?? "INTERNO",
    author: null,
    department: null,
    responsible: null,
    dueAt,
    dueKind: dueKindOf(dueAt, now),
    legal: false,
    aiGenerated: false,
    authorship: null,
    seals: [],
    blockReason: state === "BLOQUEADA" ? task.blockReason?.trim() || null : null,
    credit: null,
    delegation: null,
    variants,
  };
}
