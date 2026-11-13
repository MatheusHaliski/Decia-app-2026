/**
 * Acervo de Tarefas na URL (RF41.CA09): sub-filtros, ordenação e página em `/tasks?filtro=&categoria=&prioridade=&prazo=&ordem=&page=`
 * (compartilhável), com os valores em minúsculas e hífen na URL e o enum da API (`GET /api/tasks`, `GET /api/tasks/summary`) na chamada.
 * Valor desconhecido na URL é ignorado (a lista não quebra por um link antigo). As regras de prazo espelham `AcervoQueries.java`.
 */
import type { PriorityName, TaskCategoryName, TaskStateName } from "./client";

export const WORK_FILTERS = ["A_REALIZAR", "EM_ANDAMENTO", "BLOQUEADO", "CONCLUIDO", "ARQUIVADO", "PUBLICADO"] as const;
export type WorkFilter = (typeof WORK_FILTERS)[number];
export const DEADLINE_FILTERS = ["COM_PRAZO_LEGAL", "VENCE_7_DIAS", "ATRASADAS"] as const;
export type DeadlineFilter = (typeof DEADLINE_FILTERS)[number];
/** Ordens oferecidas na tela (a API também aceita CRIACAO, o padrão da lista antiga). */
export const SORT_ORDERS = ["ATUALIZACAO", "PRAZO", "PRIORIDADE", "CRIACAO"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];
export const DEFAULT_ORDER: SortOrder = "ATUALIZACAO";
export const PRIORITY_FILTERS: readonly PriorityName[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];
export const TASK_CATEGORIES: readonly TaskCategoryName[] = [
  "OFICIO_MEMORANDO", "PARECER_TECNICO", "ETP", "TERMO_REFERENCIA", "PLANILHA_ORCAMENTARIA", "PROJETO_BASICO_EXECUTIVO", "CRONOGRAMA", "ATA",
  "PORTARIA_RESOLUCAO", "CONTRATO_CONVENIO", "VISTORIA_RELATORIO_FOTOGRAFICO", "LICENCA_ANUENCIA", "MAPA_GEORREFERENCIA", "FORMULARIO", "OUTRO",
];
/** 20 por página (RF41.CA09). */
export const PAGE_SIZE = 20;

export interface AcervoParams {
  filtro: WorkFilter | null;
  categoria: TaskCategoryName | null;
  prioridade: PriorityName | null;
  prazo: DeadlineFilter | null;
  ordem: SortOrder;
  page: number;
}

export const EMPTY_PARAMS: AcervoParams = { filtro: null, categoria: null, prioridade: null, prazo: null, ordem: DEFAULT_ORDER, page: 1 };

/** `EM_ANDAMENTO` ↔ `em-andamento`. */
export const toSlug = (v: string) => v.toLowerCase().replace(/_/g, "-");
const fromSlug = (s: string) => s.trim().toUpperCase().replace(/-/g, "_");

function pick<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  if (!raw) return null;
  const v = fromSlug(raw);
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

interface ReadableParams { get(name: string): string | null }

export function parseAcervoParams(sp: ReadableParams): AcervoParams {
  const page = Number(sp.get("page"));
  return {
    filtro: pick(sp.get("filtro"), WORK_FILTERS),
    categoria: pick(sp.get("categoria"), TASK_CATEGORIES),
    prioridade: pick(sp.get("prioridade"), PRIORITY_FILTERS),
    prazo: pick(sp.get("prazo"), DEADLINE_FILTERS),
    ordem: pick(sp.get("ordem"), SORT_ORDERS) ?? DEFAULT_ORDER,
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Querystring da página (`?filtro=em-andamento&…`), sem os valores padrão; vazia quando nada está escolhido. */
export function acervoSearch(p: AcervoParams): string {
  const q = new URLSearchParams();
  if (p.filtro) q.set("filtro", toSlug(p.filtro));
  if (p.categoria) q.set("categoria", toSlug(p.categoria));
  if (p.prioridade) q.set("prioridade", toSlug(p.prioridade));
  if (p.prazo) q.set("prazo", toSlug(p.prazo));
  if (p.ordem !== DEFAULT_ORDER) q.set("ordem", toSlug(p.ordem));
  if (p.page > 1) q.set("page", String(p.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Troca um filtro: qualquer mudança que não seja a própria página volta para a página 1. */
export function withParams(p: AcervoParams, patch: Partial<AcervoParams>): AcervoParams {
  const next = { ...p, ...patch };
  return "page" in patch ? next : { ...next, page: 1 };
}

/** Parâmetros da lista na API (enum em maiúsculas, página e tamanho). */
export function listQuery(p: AcervoParams): Record<string, string | number> {
  return { ...summaryQuery(p), ordem: p.ordem, page: p.page, size: PAGE_SIZE };
}

/** Parâmetros do resumo (contadores e alertas): só os filtros. */
export function summaryQuery(p: AcervoParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.filtro) out.filtro = p.filtro;
  if (p.categoria) out.categoria = p.categoria;
  if (p.prioridade) out.prioridade = p.prioridade;
  if (p.prazo) out.prazo = p.prazo;
  return out;
}

export const activeFilters = (p: AcervoParams) => [p.filtro, p.categoria, p.prioridade, p.prazo].filter(Boolean).length;

export const totalPages = (total: number, size = PAGE_SIZE) => Math.max(1, Math.ceil(Math.max(0, total) / size));

/** Rascunho, a realizar, em andamento ou bloqueada: só essas cobram prazo (igual a `AcervoQueries.open`). */
export const isOpenState = (s: TaskStateName | undefined | null) => s === "RASCUNHO" || s === "DISPONIVEL" || s === "EM_USO" || s === "BLOQUEADA";

/** Prazo efetivo = o mais próximo entre o prazo da tarefa e o prazo legal. */
export function effectiveDueOf(dueAt: string | null | undefined, legalDueAt: string | null | undefined): string | null {
  const due = dueAt ? dueAt.slice(0, 10) : null;
  const legal = legalDueAt ? legalDueAt.slice(0, 10) : null;
  if (!due) return legal;
  if (!legal) return due;
  return legal < due ? legal : due;
}
