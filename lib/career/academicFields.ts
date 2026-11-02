/**
 * Catálogo de ramos acadêmicos — as opções do campo profissão preferida (RF75.CA19; GUIA_DE_CARREIRA §4.1 b1) no
 * cadastro, em Conta e no guia inicial. Dado versionado em `contracts/career/academic-fields.json` (esquema
 * `contracts/career/academic-field.schema.json`): código estável (slug), rótulos pt-BR/en/es, área CINE Brasil, graus,
 * aliases, famílias CBO e ISCO-08/ESCO, conselho, matrículas (INEP), relevância dos editores e ramos vizinhos. A busca do
 * autocompletar é por rótulo e aliases, sem caixa nem acento (mesma chave de `lib/account/publication.ts`).
 */
import catalog from "@/contracts/career/academic-fields.json";

export const DEGREES = ["bacharelado", "licenciatura", "tecnologo"] as const;
export type Degree = (typeof DEGREES)[number];
export type EditorRelevance = "alta" | "media" | "baixa";

export interface AcademicField {
  code: string;
  label: { "pt-BR": string; en: string; es: string };
  cine: { broad: string; broadName: string; detail: string; detailName: string };
  degrees: Degree[];
  aliases: string[];
  cbo: { code: string; title: string }[];
  isco08: { code: string; title: string }[];
  esco: { uri: string; label: string }[];
  council: { name: string; federal?: string; law?: string; registrationRequired: boolean } | null;
  enrollment: { source: string; matriculas: number; rank: number; year: number; naoConferido: boolean };
  editors: { letters: EditorRelevance; drawings: EditorRelevance };
  sensitiveData: string[];
  neighbors: string[];
  group?: string;
  notes?: string;
}

export interface AcademicFieldCatalog {
  schemaVersion: 1;
  version: string;
  generatedAt: string;
  fields: AcademicField[];
  sources: { title: string; url: string; accessedAt: string }[];
  naoConferido?: string[];
}

export const ACADEMIC_FIELD_CATALOG = catalog as unknown as AcademicFieldCatalog;
export const ACADEMIC_FIELDS: readonly AcademicField[] = ACADEMIC_FIELD_CATALOG.fields;

/** Chave de comparação: sem acento, sem caixa, espaços colapsados. */
export const fieldKey = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export const fieldByCode = (code: string | null | undefined, fields: readonly AcademicField[] = ACADEMIC_FIELDS) =>
  code ? fields.find((f) => f.code === code) : undefined;

/**
 * Autocompletar: rótulo igual primeiro, depois rótulo que começa com a busca, alias igual, alias que começa, e por fim
 * qualquer ocorrência no rótulo ou nos aliases; empates em ordem alfabética pt-BR. Menos de 2 caracteres devolve vazio.
 */
export function searchAcademicFields(query: string, fields: readonly AcademicField[] = ACADEMIC_FIELDS, limit = 8): AcademicField[] {
  const q = fieldKey(query);
  if (q.length < 2) return [];
  const score = (f: AcademicField) => {
    const label = fieldKey(f.label["pt-BR"]);
    const aliases = f.aliases.map(fieldKey);
    if (label === q) return 0;
    if (label.startsWith(q)) return 1;
    if (aliases.some((a) => a === q)) return 2;
    if (aliases.some((a) => a.startsWith(q))) return 3;
    if (label.includes(q) || aliases.some((a) => a.includes(q))) return 4;
    return -1;
  };
  return fields
    .map((f) => [f, score(f)] as const)
    .filter(([, s]) => s >= 0)
    .sort((a, b) => a[1] - b[1] || a[0].label["pt-BR"].localeCompare(b[0].label["pt-BR"], "pt-BR"))
    .slice(0, limit)
    .map(([f]) => f);
}

/** Ramos vizinhos resolvidos (para "Caminhos" e "pessoas semelhantes" por ocupação vizinha, CA19). */
export function neighborsOf(code: string, fields: readonly AcademicField[] = ACADEMIC_FIELDS): AcademicField[] {
  const own = fieldByCode(code, fields);
  return own ? own.neighbors.map((n) => fieldByCode(n, fields)).filter((f): f is AcademicField => f !== undefined) : [];
}
