/**
 * Tarefas persistidas (RF4, RF12, RF41; auditoria 17/10/2026): cliente da API `/api/tasks` tipado pelo contrato OpenAPI gerado
 * (`lib/api/schema.d.ts`), extensões opcionais por área profissional e o cálculo explícito de progresso pelos critérios.
 */
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type TaskView = components["schemas"]["TaskView"];
export type TaskRequest = components["schemas"]["TaskRequest"];
export type WorkArea = NonNullable<TaskRequest["area"]>;
export type TaskTypeName = NonNullable<TaskRequest["type"]>;
export type PriorityName = NonNullable<TaskRequest["priority"]>;
export type AccessClassName = NonNullable<TaskRequest["accessClass"]>;
export type VisibilityName = NonNullable<TaskRequest["visibility"]>;
export type TaskStateName = NonNullable<TaskView["state"]>;
export interface Criterion { text: string; done: boolean }
export interface Deliverable { text: string }
export interface Reference { label: string; url: string }

export const WORK_AREAS: readonly WorkArea[] = ["SOFTWARE", "ADMINISTRACAO", "DESIGN", "PESQUISA", "MARKETING", "PLANEJAMENTO", "ENGENHARIA", "JURIDICO", "OUTRA"];
export const TASK_TYPE_NAMES: readonly TaskTypeName[] = [
  "DOCUMENTO", "TEXTO_MANUAL", "PLANILHA", "IMAGEM_EDITADA", "DESENHO_TECNICO", "CRONOGRAMA", "FORMULARIO", "ATA_REGISTRO", "EMAIL", "LINK",
  "PASTA", "PROTOCOLO", "ESTUDO_TECNICO_PRELIMINAR", "IMAGEM_WEB", "TEXTO_IA",
];
export const PRIORITIES: readonly PriorityName[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
export const ACCESS_CLASSES: readonly AccessClassName[] = ["PUBLICO", "INTERNO", "RESTRITO", "SIGILOSO"];
export const VISIBILITIES: readonly VisibilityName[] = ["PRIVADA", "DEPARTAMENTO", "EMPRESA", "PUBLICA"];

/**
 * Campos opcionais por área: só os da área escolhida aparecem, e nenhum é obrigatório. As chaves seguem a regra do servidor
 * (`^[a-z][a-zA-Z0-9]{1,30}$`, até 12 campos, 500 caracteres cada).
 */
export const AREA_EXTENSIONS: Record<WorkArea, readonly string[]> = {
  SOFTWARE: ["repository", "branch", "environment"],
  ADMINISTRACAO: ["process", "costCenter"],
  DESIGN: ["format", "dimensions", "brandGuide"],
  PESQUISA: ["question", "method", "sample"],
  MARKETING: ["audience", "channel", "indicator"],
  PLANEJAMENTO: ["horizon", "milestone"],
  ENGENHARIA: ["discipline", "standard"],
  JURIDICO: ["caseNumber", "legalBasis"],
  OUTRA: [],
};

/**
 * Progresso declarado pelos critérios de conclusão: atendidos ÷ total. Sem critérios, não há percentual (nunca decorativo). Concluída
 * sem critérios não ganha 100 %: o estado já diz que acabou.
 */
export function criteriaProgress(criteria: readonly Criterion[] | undefined): { done: number; total: number; percent: number | null } {
  const total = criteria?.length ?? 0;
  const done = criteria?.filter((c) => c.done).length ?? 0;
  return { done, total, percent: total ? Math.round((done / total) * 100) : null };
}

/** Corpo de PUT a partir da visão atual (para mudanças pontuais, como marcar um critério), preservando todo o resto. */
export function requestFromView(v: TaskView, patch: Partial<TaskRequest> = {}): TaskRequest {
  return {
    title: v.title, descriptionMd: v.descriptionMd, type: v.type, category: v.category, priority: v.priority, dueAt: v.dueAt,
    responsibleId: v.responsibleId, accessClass: v.accessClass, visibility: v.visibility, objective: v.objective, area: v.area,
    deliverables: v.deliverables, acceptanceCriteria: v.acceptanceCriteria, references: v.references, extensions: v.extensions,
    version: v.version, ...patch,
  };
}

export const isPersistedTaskId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const tasksApi = {
  mine: (limit = 50) => api.get<TaskView[]>(`/api/tasks?limit=${limit}`),
  get: (id: string) => api.get<TaskView>(`/api/tasks/${encodeURIComponent(id)}`),
  create: (body: TaskRequest) => api.post<TaskView>("/api/tasks", body),
  update: (id: string, body: TaskRequest) => api.put<TaskView>(`/api/tasks/${encodeURIComponent(id)}`, body),
  transition: (id: string, body: { to: TaskStateName; reason?: string; blockedByTaskId?: string; blockedByUserId?: string; version: number }) =>
    api.post<TaskView>(`/api/tasks/${encodeURIComponent(id)}/transitions`, body),
};
