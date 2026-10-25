/**
 * Pessoas (RF16, RF17; auditoria 17/10/2026): cliente da API `/api/people` tipado pelo contrato OpenAPI gerado (`lib/api/schema.d.ts`).
 * Regras do servidor: a busca só devolve contas ativas da empresa de quem pergunta, sem a própria pessoa, até 20 resultados, e uma
 * consulta com menos de 2 caracteres volta vazia; perfil inexistente ou não visível responde 404 (recusa uniforme, sem enumerar
 * contas). Nunca há e-mail nem telefone nestas visões.
 */
import { api, qs } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { TaskView } from "@/lib/tasks/client";

export type PersonView = components["schemas"]["PersonView"];
export type PublicProfileView = components["schemas"]["PublicProfileView"];
export type FollowView = components["schemas"]["FollowView"];

/** Mínimo de caracteres para buscar (abaixo disso o servidor devolve vazio; o front nem chama). */
export const PEOPLE_MIN_QUERY = 2;
/** Teto de resultados do servidor. */
export const PEOPLE_MAX_RESULTS = 20;
/** Tarefas do perfil de terceiros (Acervo Digital). */
export const PROFILE_TASKS_LIMIT = 50;

/** Consulta normalizada (sem espaços nas pontas) e se ela já vale uma busca. */
export function normalizeQuery(raw: string | null | undefined): { q: string; searchable: boolean } {
  const q = (raw ?? "").trim();
  return { q, searchable: q.length >= PEOPLE_MIN_QUERY };
}

export const peopleApi = {
  search: (q: string, limit = PEOPLE_MAX_RESULTS, signal?: AbortSignal) =>
    api.get<PersonView[]>(`/api/people${qs({ q, limit })}`, { signal }),
  byUsername: (username: string, signal?: AbortSignal) =>
    api.get<PublicProfileView>(`/api/people/by-username/${encodeURIComponent(username)}`, { signal }),
  tasksOf: (id: string, limit = PROFILE_TASKS_LIMIT, signal?: AbortSignal) =>
    api.get<TaskView[]>(`/api/people/${encodeURIComponent(id)}/tasks${qs({ limit })}`, { signal }),
  /** RF16.CA01: sigo esta pessoa? Quantos a seguem e quantas ela segue. */
  followStatus: (id: string, signal?: AbortSignal) => api.get<FollowView>(`/api/people/${encodeURIComponent(id)}/follow`, { signal }),
  follow: (id: string) => api.put<FollowView>(`/api/people/${encodeURIComponent(id)}/follow`, {}),
  unfollow: (id: string) => api.delete<FollowView>(`/api/people/${encodeURIComponent(id)}/follow`),
};
