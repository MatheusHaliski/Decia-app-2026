/**
 * Utilidades de texto do Letters (pt-BR): dobra de acentos, maiúsculas, plural seguro e lematização leve. Puras.
 */

/** minúsculas sem acentos ("Ação" → "acao") */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

export const isCapitalized = (s: string) => /^\p{Lu}/u.test(s);
/** sigla ou palavra toda em maiúsculas (≥ 2 letras): ABNT, NBR, ONGs */
export const isAllCaps = (s: string) => /^\p{Lu}[\p{Lu}\d]+s?$/u.test(s) && /\p{Lu}.*\p{Lu}/u.test(s);

/** Mantém a caixa da palavra original na substituição ("A medida" → "À medida"). */
export function matchCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  if (isAllCaps(original) && original.length > 1) return replacement.toUpperCase();
  if (isCapitalized(original)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

const VOWEL_ACCENT = /[áéíóúâêôãõà]/;

/**
 * Plural de substantivo/adjetivo quando a regra é inequívoca; null quando não é (ex.: -ão tem três plurais, -s
 * paroxítono é invariável). Nunca inventa forma duvidosa.
 */
export function pluralize(word: string): string | null {
  const w = word;
  const lw = w.toLowerCase();
  if (lw.length < 2) return null;
  if (/[sx]$/.test(lw)) return null; // lápis, tórax, mês… (invariável ou incerto)
  if (/(ç|s|i)ão$/.test(lw) || /^(questão|gestão|sugestão|digestão)$/.test(lw)) return w.slice(0, -2) + "ões"; // reunião → reuniões, gestão → gestões
  if (/ão$/.test(lw)) return null; // irmãos, pães, leões: incerto
  if (/[aeiouáéíóúâêô]$/.test(lw)) return w + "s";
  if (/[rz]$/.test(lw)) return w + "es";
  if (/m$/.test(lw)) return w.slice(0, -1) + "ns";
  if (/al$/.test(lw)) return w.slice(0, -1) + "is";
  if (/ul$/.test(lw)) return w.slice(0, -1) + "is";
  if (/ol$/.test(lw)) return VOWEL_ACCENT.test(lw.slice(0, -2)) ? null : w.slice(0, -2) + "óis";
  // paroxítona (acento antes): nível → níveis; oxítona: papel → papéis
  if (/el$/.test(lw)) return VOWEL_ACCENT.test(lw.slice(0, -2)) ? w.slice(0, -2) + "eis" : w.slice(0, -2) + "éis";
  // paroxítona: fácil → fáceis; oxítona: funil → funis
  if (/il$/.test(lw)) return VOWEL_ACCENT.test(lw.slice(0, -2)) ? w.slice(0, -2) + "eis" : w.slice(0, -1) + "s";
  return null;
}

/** Remove o plural regular (para comparação), sem garantir a forma do singular. */
export function singularKey(word: string): string {
  const w = fold(word);
  if (w.length <= 3) return w;
  if (/(oes|aes|aos)$/.test(w)) return w.slice(0, -3) + "ao";
  if (/ais$/.test(w)) return w.slice(0, -3) + "al";
  if (/eis$/.test(w)) return w.slice(0, -3) + "el";
  if (/ois$/.test(w)) return w.slice(0, -3) + "ol";
  if (/uis$/.test(w)) return w.slice(0, -3) + "ul";
  if (/(r|z)es$/.test(w)) return w.slice(0, -2);
  if (/ns$/.test(w)) return w.slice(0, -2) + "m";
  if (/s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

/**
 * Lematização leve (para coesão e repetição): sem acento, sem plural, sem vogal temática final e sem -mente.
 * "servidores" → "servidor", "técnica"/"técnico" → "tecnic", "documentos" → "document".
 */
export function lightStem(word: string): string {
  let w = singularKey(word);
  if (w.length > 7 && w.endsWith("mente")) w = w.slice(0, -5);
  if (w.length > 4 && /[aeo]$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Contagem de palavras (tokens com letra ou dígito). */
export function wordCount(text: string): number {
  return (text.match(/[\p{L}\d][\p{L}\p{M}\d'’-]*/gu) ?? []).length;
}

/** Hash curto e estável (FNV-1a 32 bits, base 36) para ids de achados e propostas. */
export function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Trechos entre aspas (“…”, "…", «…»): falas e citações literais não são corrigidas pelas regras de estilo. */
export function quotedSpans(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  const re = /“[^”]*”|«[^»]*»|"[^"\n]*"/g;
  for (const m of text.matchAll(re)) out.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  return out;
}

export const insideSpans = (spans: readonly { start: number; end: number }[], start: number, end: number) =>
  spans.some((s) => start >= s.start && end <= s.end);
