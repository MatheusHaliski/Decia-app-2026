/**
 * PERT — estimativa de três pontos com distribuição beta (aula "Processos de planejamento" §3.3; Atividade Formativa 7):
 *   TE = (O + 4·M + P) / 6        σ = (P − O) / 6        variância = σ²
 * No caminho crítico, as médias e as variâncias somam (atividades independentes); a probabilidade de terminar até uma data-alvo
 * usa a aproximação normal: P(T ≤ alvo) = Φ((alvo − TE_caminho) / σ_caminho).
 */
export interface ThreePoint { o: number; m: number; p: number }
export interface PertEstimate { te: number; sd: number; variance: number; valid: boolean; problem?: "PESSIMISTA_MENOR_QUE_OTIMISTA" | "MAIS_PROVAVEL_FORA_DA_FAIXA" | "NEGATIVO" }

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function pert({ o, m, p }: ThreePoint): PertEstimate {
  const te = r4((o + 4 * m + p) / 6);
  const sd = r4(Math.abs(p - o) / 6);
  const variance = r4(sd * sd);
  if (o < 0 || m < 0 || p < 0) return { te, sd, variance, valid: false, problem: "NEGATIVO" };
  if (p < o) return { te, sd, variance, valid: false, problem: "PESSIMISTA_MENOR_QUE_OTIMISTA" };
  if (m < o || m > p) return { te, sd, variance, valid: false, problem: "MAIS_PROVAVEL_FORA_DA_FAIXA" };
  return { te, sd, variance, valid: true };
}

/** Soma de TE e de variâncias ao longo de um caminho. */
export function pathStats(estimates: readonly PertEstimate[]): { te: number; variance: number; sd: number } {
  const te = estimates.reduce((s, e) => s + e.te, 0);
  const variance = estimates.reduce((s, e) => s + e.variance, 0);
  return { te: r4(te), variance: r4(variance), sd: r4(Math.sqrt(variance)) };
}

/** Função de distribuição acumulada da normal padrão (Abramowitz & Stegun 7.1.26; erro < 1,5·10⁻⁷). */
export function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

/** Probabilidade de concluir até `target` dias, dado TE e σ do caminho. σ = 0 ⇒ 0 ou 1. */
export function probabilityByTarget(te: number, sd: number, target: number): number {
  if (sd <= 0) return target >= te ? 1 : 0;
  return Math.max(0, Math.min(1, normalCdf((target - te) / sd)));
}

/** Prazo com a confiança pedida (ex.: 0,9 ⇒ P90) — inversa da normal por busca binária sobre `normalCdf`. */
export function targetForConfidence(te: number, sd: number, confidence: number): number {
  if (sd <= 0) return te;
  let lo = -10;
  let hi = 10;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < confidence) lo = mid; else hi = mid;
  }
  return r4(te + ((lo + hi) / 2) * sd);
}
