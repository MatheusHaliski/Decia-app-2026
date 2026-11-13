/**
 * Busca determinística de palavras-chave nos textos do projeto (Espelho de Conformidade, RF32, e seletores do Simulador, RF31).
 * Normaliza (minúsculas, sem acento, só letras e números separados por espaço) e casa a palavra ou expressão INTEIRA; uma
 * palavra terminada em "*" casa pelo começo ("contrat*" acha "contratação", "contratada", "contrato"). Nada de IA: a mesma
 * entrada dá sempre o mesmo resultado (D-12).
 */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** A palavra-chave aparece no texto já normalizado? */
export function hasKeyword(normalized: string, keyword: string): boolean {
  const prefix = keyword.trim().endsWith("*");
  const kw = normalizeText(prefix ? keyword.trim().slice(0, -1) : keyword);
  if (!kw) return false;
  const hay = ` ${normalized} `;
  return prefix ? hay.includes(` ${kw}`) : hay.includes(` ${kw} `);
}

/** Primeira palavra-chave que aparece no texto (ou `null`). */
export function firstKeyword(text: string, keywords: readonly string[]): string | null {
  const n = normalizeText(text);
  for (const k of keywords) if (hasKeyword(n, k)) return k;
  return null;
}

/** Palavras-chave digitadas numa linha ("ETP, estudo técnico; termo de referência") → lista limpa, sem repetição. */
export function parseKeywords(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,;\n]/)) {
    const k = raw.replace(/\s+/g, " ").trim();
    if (k && !out.some((x) => normalizeText(x) === normalizeText(k) && x.endsWith("*") === k.endsWith("*"))) out.push(k);
  }
  return out;
}
