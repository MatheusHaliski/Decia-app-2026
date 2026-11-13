/**
 * Diferença por PALAVRA entre duas versões (antes × depois) — LCS sobre tokens (palavras, espaços e pontuação), com trechos
 * iguais, removidos e inseridos agrupados. A tela mostra removido/inserido com marca e texto (<del>/<ins> + rótulo), nunca só
 * com cor. Textos enormes não travam a aba: acima do limite, a comparação vira "tudo removido / tudo inserido" e avisa.
 */

export type DiffOp = "IGUAL" | "REMOVIDO" | "INSERIDO";
export interface DiffPart { op: DiffOp; text: string }
export interface DiffResult { parts: DiffPart[]; removedWords: number; insertedWords: number; truncated: boolean; identical: boolean }

/** Produto máximo de tokens (≈ 2 000 × 2 000) para o LCS em memória. */
export const MAX_DIFF_CELLS = 4_000_000;

export function tokenize(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu) ?? [];
}

const isWord = (t: string) => /[\p{L}\p{N}]/u.test(t);
const same = (a: string, b: string) => a === b || (/^\s+$/.test(a) && /^\s+$/.test(b));

function merge(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  for (const p of parts) {
    const last = out.at(-1);
    if (last && last.op === p.op) last.text += p.text;
    else out.push({ ...p });
  }
  return out;
}

export function diffWords(before: string, after: string): DiffResult {
  const a = tokenize(before);
  const b = tokenize(after);
  const count = (parts: DiffPart[], op: DiffOp) => parts.filter((p) => p.op === op).reduce((n, p) => n + tokenize(p.text).filter(isWord).length, 0);
  if (before === after) return { parts: before ? [{ op: "IGUAL", text: before }] : [], removedWords: 0, insertedWords: 0, truncated: false, identical: true };
  if (a.length * b.length > MAX_DIFF_CELLS) {
    const parts = merge([...(before ? [{ op: "REMOVIDO" as const, text: before }] : []), ...(after ? [{ op: "INSERIDO" as const, text: after }] : [])]);
    return { parts, removedWords: count(parts, "REMOVIDO"), insertedWords: count(parts, "INSERIDO"), truncated: true, identical: false };
  }
  // tabela LCS (sufixos) em um vetor plano
  const n = a.length;
  const m = b.length;
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = same(a[i]!, b[j]!) ? lcs[(i + 1) * w + j + 1]! + 1 : Math.max(lcs[(i + 1) * w + j]!, lcs[i * w + j + 1]!);
    }
  }
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(a[i]!, b[j]!)) {
      parts.push({ op: "IGUAL", text: b[j]! });
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j]! >= lcs[i * w + j + 1]!) parts.push({ op: "REMOVIDO", text: a[i++]! });
    else parts.push({ op: "INSERIDO", text: b[j++]! });
  }
  while (i < n) parts.push({ op: "REMOVIDO", text: a[i++]! });
  while (j < m) parts.push({ op: "INSERIDO", text: b[j++]! });
  const merged = merge(parts);
  return { parts: merged, removedWords: count(merged, "REMOVIDO"), insertedWords: count(merged, "INSERIDO"), truncated: false, identical: false };
}
