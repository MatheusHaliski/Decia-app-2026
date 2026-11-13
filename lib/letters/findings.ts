/**
 * Montagem dos achados: completa cada achado bruto de uma regra com categoria, aba e gravidade do catálogo, trecho,
 * id único e chave estável (regra + bloco + trecho + ocorrência) para "ignorar com motivo" entre revisões.
 */
import { ruleInfo } from "./rules";
import { fold, shortHash } from "./text";
import type { Anchor, Certainty, Finding, LetterBlock, Severity, TaggedSentence, TaggedToken, TextGenre } from "./types";

export interface Span {
  start: number;
  end: number;
}

export interface RawFinding {
  ruleId: string;
  start: number;
  end: number;
  replacement?: string | null;
  suggestions?: string[];
  vars?: Record<string, string | number>;
  confidence: number;
  certainty?: Certainty;
  related?: Anchor[];
  severity?: Severity;
}

/** Contexto de análise de um bloco. */
export interface BlockCtx {
  block: LetterBlock;
  text: string;
  tokens: TaggedToken[];
  sentences: TaggedSentence[];
  /** trechos entre aspas (falas e citações literais) */
  quoted: Span[];
  genre: TextGenre;
}

export function toFindings(raw: readonly RawFinding[], blockId: string | null, text: string): Finding[] {
  const occurrences = new Map<string, number>();
  const sorted = [...raw].sort((a, b) => a.start - b.start || a.end - b.end || a.ruleId.localeCompare(b.ruleId));
  return sorted.map((r) => {
    const info = ruleInfo(r.ruleId);
    const excerpt = text.slice(r.start, r.end);
    const base = `${r.ruleId}|${blockId ?? "doc"}|${fold(excerpt).trim()}`;
    const occ = occurrences.get(base) ?? 0;
    occurrences.set(base, occ + 1);
    const replacement = r.replacement ?? null;
    const suggestions = [...new Set([...(replacement !== null ? [replacement] : []), ...(r.suggestions ?? [])])];
    return {
      id: `${r.ruleId}@${blockId ?? "doc"}:${r.start}-${r.end}:${shortHash(excerpt)}`,
      key: `${base}|${occ}`,
      ruleId: r.ruleId,
      category: info.category,
      tab: info.tab,
      severity: r.severity ?? info.severity,
      blockId,
      start: r.start,
      end: r.end,
      excerpt,
      replacement,
      suggestions,
      vars: r.vars ?? {},
      confidence: Math.round(r.confidence * 100) / 100,
      certainty: r.certainty ?? "HIPOTESE",
      origin: "HEURISTICA",
      related: r.related,
    } satisfies Finding;
  });
}

/** Remove achados sobrepostos da mesma regra (fica o primeiro). */
export function dedupe(raw: RawFinding[]): RawFinding[] {
  const out: RawFinding[] = [];
  for (const r of raw) {
    if (out.some((o) => o.ruleId === r.ruleId && r.start < o.end && o.start < r.end)) continue;
    out.push(r);
  }
  return out;
}
