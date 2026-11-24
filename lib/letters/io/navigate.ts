/**
 * Navegação em documento longo (RF52.CA03): sumário derivado dos títulos e busca dentro da peça, sem diferenciar
 * maiúsculas nem acentos ("acao" acha "Ação"), com posições [start, end) no texto ORIGINAL do bloco — para selecionar
 * exatamente o trecho no editor.
 */
import type { LetterBlock } from "../types";

export interface OutlineEntry {
  blockId: string;
  level: 1 | 2 | 3;
  text: string;
}

export function outline(blocks: readonly LetterBlock[]): OutlineEntry[] {
  return blocks.filter((b) => b.kind === "TITULO" && b.text.trim()).map((b) => ({ blockId: b.id, level: b.level ?? 2, text: b.text.replace(/\s+/g, " ").trim() }));
}

export interface SearchMatch {
  blockId: string;
  start: number;
  end: number;
}

/** Texto dobrado (minúsculas, sem diacríticos) e, para cada posição dobrada, a posição no original. */
export function fold(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
    i += ch.length;
  }
  map.push(i);
  return { folded, map };
}

export const SEARCH_LIMIT = 1_000;

export function searchBlocks(blocks: readonly LetterBlock[], query: string, limit = SEARCH_LIMIT): SearchMatch[] {
  const q = fold(query.trim()).folded;
  if (!q) return [];
  const out: SearchMatch[] = [];
  for (const b of blocks) {
    const { folded, map } = fold(b.text);
    let from = 0;
    for (;;) {
      const at = folded.indexOf(q, from);
      if (at < 0) break;
      out.push({ blockId: b.id, start: map[at]!, end: map[at + q.length] ?? b.text.length });
      if (out.length >= limit) return out;
      from = at + q.length;
    }
  }
  return out;
}

/** Índice do próximo resultado a partir do atual (circular). */
export const stepMatch = (current: number, total: number, dir: 1 | -1) => (total ? (((current + dir) % total) + total) % total : -1);
