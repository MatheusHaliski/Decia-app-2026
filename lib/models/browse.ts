/**
 * Prateleiras, busca e filtros do Balcão de Modelos (RF40.CA02): só ofertas ATIVAS; busca sem acento por título, descrição, autor e
 * departamento; filtros por tipo (tarefa, projeto, kit), área, departamento de origem e preço; ordenação por reutilizações,
 * recentes ou título. Funções puras.
 */
import type { WorkArea } from "@/lib/tasks/client";
import type { ModelKind, ModelOffer, Shelf } from "./types";

export const MODEL_SORTS = ["reutilizacoes", "recentes", "titulo"] as const;
export type ModelSort = (typeof MODEL_SORTS)[number];
export const PRICE_FILTERS = ["TODOS", "GRATIS", "PAGOS"] as const;
export type PriceFilter = (typeof PRICE_FILTERS)[number];

export interface ModelFilters {
  q: string;
  kind: ModelKind | "TODOS";
  area: WorkArea | "TODAS";
  department: string;
  price: PriceFilter;
}

export const EMPTY_FILTERS: ModelFilters = { q: "", kind: "TODOS", area: "TODAS", department: "TODOS", price: "TODOS" };

export const normalizeText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function browseModels(offers: readonly ModelOffer[], shelf: Shelf | "TODAS", filters: ModelFilters, sort: ModelSort = "reutilizacoes"): ModelOffer[] {
  const terms = normalizeText(filters.q).split(/\s+/).filter(Boolean);
  const list = offers.filter((o) => {
    if (o.status !== "ATIVA") return false;
    if (shelf !== "TODAS" && o.shelf !== shelf) return false;
    if (filters.kind !== "TODOS" && o.kind !== filters.kind) return false;
    if (filters.area !== "TODAS" && o.area !== filters.area) return false;
    if (filters.department !== "TODOS" && (o.department ?? "") !== filters.department) return false;
    if (filters.price === "GRATIS" && o.pricePoints > 0) return false;
    if (filters.price === "PAGOS" && o.pricePoints === 0) return false;
    if (terms.length) {
      const hay = normalizeText([o.title, o.usageDescription, o.authorName, o.department ?? "", o.sealName ?? ""].join(" "));
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const byTitle = (a: ModelOffer, b: ModelOffer) => a.title.localeCompare(b.title, "pt-BR");
  if (sort === "titulo") return list.sort(byTitle);
  if (sort === "recentes") return list.sort((a, b) => (a.createdAt === b.createdAt ? byTitle(a, b) : a.createdAt < b.createdAt ? 1 : -1));
  return list.sort((a, b) => b.reuseCount - a.reuseCount || byTitle(a, b));
}

/** Departamentos de origem com ofertas ativas (para o filtro). */
export function departmentsOf(offers: readonly ModelOffer[]): string[] {
  return [...new Set(offers.filter((o) => o.status === "ATIVA" && o.department).map((o) => o.department!))].sort();
}

/** Ofertas do autor (todas, inclusive retiradas), da mais nova para a mais antiga. */
export function myOffers(offers: readonly ModelOffer[], authorId: string): ModelOffer[] {
  return offers.filter((o) => o.authorId === authorId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
