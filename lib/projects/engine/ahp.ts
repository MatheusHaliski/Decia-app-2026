/**
 * AHP — Analytic Hierarchy Process (Saaty) para seleção de projetos e pesos de critérios (aula "Processos de iniciação" §2.4;
 * Atividade Formativa 10). Comparações par a par na escala 1–9 (1 = igual importância … 9 = importância extrema; recíprocos
 * 1/2…1/9); pesos = autovetor principal normalizado; λmax, índice de consistência IC = (λmax − n)/(n − 1) e razão de
 * consistência RC = IC / IA (índice aleatório de Saaty). Os julgamentos só são aceitos com RC < 0,10.
 * Também o modelo de pontuação ponderada (scoring model), base do AHP na calculadora da aula.
 */
export const SAATY_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** Índice aleatório (IA/RI) de Saaty por ordem da matriz (n = 1…10). */
export const RANDOM_INDEX = [0, 0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49] as const;
export const CR_LIMIT = 0.1;

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export interface AhpResult {
  weights: number[];
  lambdaMax: number;
  ci: number;
  cr: number;
  consistent: boolean;
  problems: string[];
}

/** Monta a matriz recíproca a partir dos julgamentos acima da diagonal (`value` = quanto i é mais importante que j). */
export function pairwiseMatrix(n: number, judgments: readonly { i: number; j: number; value: number }[]): number[][] {
  const a = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 1)));
  for (const { i, j, value } of judgments) {
    if (i === j || value <= 0) continue;
    a[i]![j] = value;
    a[j]![i] = 1 / value;
  }
  return a;
}

export function validateMatrix(a: readonly (readonly number[])[]): string[] {
  const n = a.length;
  const problems: string[] = [];
  for (let i = 0; i < n; i++) {
    if (a[i]!.length !== n) problems.push(`linha ${i + 1} com ${a[i]!.length} colunas`);
    if (Math.abs(a[i]![i]! - 1) > 1e-9) problems.push(`diagonal ${i + 1} ≠ 1`);
    for (let j = 0; j < n; j++) {
      const v = a[i]![j]!;
      if (!(v > 0)) problems.push(`a[${i + 1}][${j + 1}] não positivo`);
      else if (Math.abs(v * a[j]![i]! - 1) > 1e-6) problems.push(`a[${i + 1}][${j + 1}] não é recíproco`);
    }
  }
  return problems;
}

/** Pesos pelo método da potência (autovetor principal), λmax e consistência. */
export function ahp(a: readonly (readonly number[])[]): AhpResult {
  const n = a.length;
  const problems = validateMatrix(a);
  if (n === 0) return { weights: [], lambdaMax: 0, ci: 0, cr: 0, consistent: true, problems };
  let w = Array.from({ length: n }, () => 1 / n);
  for (let it = 0; it < 200; it++) {
    const next = a.map((row) => row.reduce((s, v, j) => s + v * w[j]!, 0));
    const sum = next.reduce((s, v) => s + v, 0);
    const norm = next.map((v) => v / sum);
    const delta = norm.reduce((s, v, i) => s + Math.abs(v - w[i]!), 0);
    w = norm;
    if (delta < 1e-12) break;
  }
  const aw = a.map((row) => row.reduce((s, v, j) => s + v * w[j]!, 0));
  const lambdaMax = aw.reduce((s, v, i) => s + v / w[i]!, 0) / n;
  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const ri = RANDOM_INDEX[Math.min(n, RANDOM_INDEX.length - 1)] ?? 1.49;
  const cr = ri > 0 ? ci / ri : 0;
  return { weights: w.map(r4), lambdaMax: r4(lambdaMax), ci: r4(Math.max(0, ci)), cr: r4(Math.max(0, cr)), consistent: cr < CR_LIMIT && problems.length === 0, problems };
}

export interface ScoredAlternative { id: string; score: number; rank: number }

/** Modelo de pontuação ponderada: pesos normalizados (soma 1) × notas (0–10) por critério; ranking decrescente estável. */
export function weightedScoring(weights: readonly number[], alternatives: readonly { id: string; scores: readonly number[] }[]): ScoredAlternative[] {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  const norm = weights.map((w) => (total > 0 ? Math.max(0, w) / total : 0));
  const scored = alternatives.map((alt, idx) => ({ id: alt.id, idx, score: r4(norm.reduce((s, w, j) => s + w * (alt.scores[j] ?? 0), 0)) }));
  scored.sort((x, y) => y.score - x.score || x.idx - y.idx);
  return scored.map((s, i) => ({ id: s.id, score: s.score, rank: i + 1 }));
}
