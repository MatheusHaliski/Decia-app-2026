/**
 * Explorador da Memória (RF33.CA04): contagens por unidade, tipo e exercício SÓ dos documentos que a pessoa pode ler (o filtro
 * de acesso vem antes — a contagem nunca revela que existe documento restrito). Cada faceta conta com os OUTROS filtros ativos
 * (busca facetada clássica), para a pessoa ver o que sobra ao combinar unidade × exercício × tipo.
 */
import { docAllowed } from "./engine";
import type { MemoryKind } from "./search";
import type { MemoryDocument, MemoryQueryOptions } from "./types";

export interface FacetSelection {
  kind?: MemoryKind | null;
  department?: string | null;
  year?: number | null;
}

export interface MemoryFacets {
  /** documentos legíveis com todos os filtros ativos */
  total: number;
  byKind: readonly { kind: MemoryKind; count: number }[];
  byDepartment: readonly { department: string | null; count: number }[];
  byYear: readonly { year: number | null; count: number }[];
  /** grade unidade × exercício (com o filtro de tipo ativo) */
  grid: { departments: readonly (string | null)[]; years: readonly (number | null)[]; count: (department: string | null, year: number | null) => number; max: number };
}

const byKey = <T extends string | number>(a: T | null, b: T | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1);

export function memoryFacets(docs: readonly MemoryDocument[], access: MemoryQueryOptions, sel: FacetSelection = {}): MemoryFacets {
  const readable = docs.filter((d) => docAllowed(d, { readable: access.readable, restrictedTo: access.restrictedTo, viewerId: access.viewerId }));
  const match = (d: MemoryDocument, skip: keyof FacetSelection | null) =>
    (skip === "kind" || !sel.kind || d.kind === sel.kind) &&
    (skip === "department" || sel.department == null || d.department === sel.department) &&
    (skip === "year" || sel.year == null || d.year === sel.year);
  const count = <K>(skip: keyof FacetSelection, key: (d: MemoryDocument) => K) => {
    const m = new Map<K, number>();
    for (const d of readable) if (match(d, skip)) m.set(key(d), (m.get(key(d)) ?? 0) + 1);
    return m;
  };
  const kinds = count("kind", (d) => d.kind);
  const depts = count("department", (d) => d.department);
  const years = count("year", (d) => d.year);
  // grade: só o filtro de tipo; unidades e exercícios de todo o acervo legível
  const gridDocs = readable.filter((d) => !sel.kind || d.kind === sel.kind);
  const gridDepts = [...new Set(readable.map((d) => d.department))].sort(byKey);
  const gridYears = [...new Set(readable.map((d) => d.year))].sort(byKey);
  const cells = new Map<string, number>();
  for (const d of gridDocs) {
    const k = `${d.department ?? ""}|${d.year ?? ""}`;
    cells.set(k, (cells.get(k) ?? 0) + 1);
  }
  return {
    total: readable.filter((d) => match(d, null)).length,
    byKind: [...kinds].map(([kind, c]) => ({ kind, count: c })).sort((a, b) => b.count - a.count || byKey(a.kind, b.kind)),
    byDepartment: [...depts].map(([department, c]) => ({ department, count: c })).sort((a, b) => byKey(a.department, b.department)),
    byYear: [...years].map(([year, c]) => ({ year, count: c })).sort((a, b) => byKey(a.year, b.year)),
    grid: {
      departments: gridDepts,
      years: gridYears,
      count: (department, year) => cells.get(`${department ?? ""}|${year ?? ""}`) ?? 0,
      max: Math.max(0, ...cells.values()),
    },
  };
}
