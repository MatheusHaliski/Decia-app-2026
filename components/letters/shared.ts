/**
 * Apoio das telas do Letters: cores por token do design system para as classes de palavras (sempre com o nome em
 * texto junto), tons de gravidade e de calor, variáveis traduzidas dos achados e o contexto do trecho.
 */
import type { Tone } from "@/components/ui";
import type { HeatLevel } from "@/lib/letters/score";
import type { Finding, PartOfSpeech, Severity } from "@/lib/letters/types";

/** Fundo + tinta por classe (tokens --ws-*); a cor nunca é o único sinal: a abreviatura aparece junto. */
export const POS_CLASS: Readonly<Record<PartOfSpeech, string>> = {
  SUBSTANTIVO: "bg-ws-node-blue-soft text-ws-node-blue-ink",
  VERBO: "bg-ws-node-red-soft text-ws-node-red-ink",
  ADJETIVO: "bg-ws-node-green-soft text-ws-node-green-ink",
  ADVERBIO: "bg-ws-node-orange-soft text-ws-node-orange-ink",
  PRONOME: "bg-ws-node-yellow-soft text-ws-node-yellow-ink",
  ARTIGO: "bg-ws-node-brown-soft text-ws-node-brown-ink",
  PREPOSICAO: "bg-ws-info-soft text-ws-info-ink",
  CONJUNCAO: "bg-ws-accent-soft text-ws-accent-ink",
  NUMERAL: "bg-ws-success-soft text-ws-success-ink",
  INTERJEICAO: "bg-ws-warning-soft text-ws-warning-ink",
};
export const AMBIGUOUS_CLASS = "bg-ws-surface-2 text-ws-text border border-dashed border-ws-border-strong";

export const SEVERITY_TONE: Readonly<Record<Severity, Tone>> = { ERRO: "danger", AVISO: "warning", SUGESTAO: "info" };
export const SEVERITY_ORDER: readonly Severity[] = ["ERRO", "AVISO", "SUGESTAO"];

export const HEAT_TONE: Readonly<Record<HeatLevel, Tone>> = { 0: "success", 1: "info", 2: "yellow", 3: "orange", 4: "danger" };
export const HEAT_CELL: Readonly<Record<HeatLevel, string>> = {
  0: "bg-ws-success-soft text-ws-success-ink",
  1: "bg-ws-info-soft text-ws-info-ink",
  2: "bg-ws-node-yellow-soft text-ws-node-yellow-ink",
  3: "bg-ws-node-orange-soft text-ws-node-orange-ink",
  4: "bg-ws-danger-soft text-ws-danger-ink",
};

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Variáveis do achado com os códigos traduzidos (seção, elemento, relação, tempo verbal, gênero…). */
export function displayVars(f: Finding, t: T): Record<string, string | number> {
  const out: Record<string, string | number> = { ...f.vars };
  const map: Record<string, string> = { section: "letters.section", after: "letters.section", element: "letters.oficio", relation: "letters.relation", dominant: "letters.tenseGroup", found: "letters.tenseGroup", genre: "letters.genre", docType: "letters.docType" };
  for (const [k, prefix] of Object.entries(map)) if (typeof out[k] === "string") out[k] = t(`${prefix}.${out[k]}`);
  return out;
}

/** Trecho com até `radius` caracteres de contexto de cada lado. */
export function excerptContext(text: string, start: number, end: number, radius = 40) {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  return { before: (from > 0 ? "…" : "") + text.slice(from, start), match: text.slice(start, end), after: text.slice(end, to) + (to < text.length ? "…" : "") };
}

export const pct = (p: number, intl: string) => new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 0 }).format(p);
