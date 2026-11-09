/**
 * Simulação de Monte Carlo do cronograma (complemento do PERT, aula de projetos Tema 3): em vez de olhar só o caminho crítico
 * determinístico, sorteia a duração de cada atividade com estimativa de três pontos (distribuição Beta-PERT, a mesma do
 * TE = (O + 4M + P) / 6) e recalcula a rede milhares de vezes. Mostra o que o PERT analítico esconde:
 *  • o viés de fusão (merge bias): caminhos quase críticos que, sorteados, viram críticos — o prazo real tende a ser MAIOR;
 *  • o índice de criticidade: em quantos cenários cada atividade esteve no caminho crítico.
 * Determinística com semente (mesma entrada → mesmo resultado), para o feedback ser reproduzível.
 */
import { schedule, type SchedDep } from "./schedule";

/** Gerador pseudoaleatório com semente (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rnd: () => number): number {
  // Box–Muller
  const u = Math.max(rnd(), 1e-12);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Gamma(k, 1) para k ≥ 1 (Marsaglia–Tsang). */
function gamma(k: number, rnd: () => number): number {
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = normal(rnd);
    const v = (1 + c * x) ** 3;
    if (v <= 0) continue;
    const u = rnd();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Amostra Beta-PERT (λ = 4): média = (O + 4M + P) / 6. */
export function samplePert(o: number, m: number, p: number, rnd: () => number): number {
  if (!(p > o)) return m;
  const alpha = 1 + (4 * (m - o)) / (p - o);
  const beta = 1 + (4 * (p - m)) / (p - o);
  const x = gamma(alpha, rnd);
  const y = gamma(beta, rnd);
  return o + (x / (x + y)) * (p - o);
}

export interface MonteCarloTask { id: string; duration: number; pert?: { o: number; m: number; p: number } }
export interface MonteCarloResult {
  runs: number;
  mean: number;
  sd: number;
  min: number;
  max: number;
  p50: number;
  p80: number;
  p95: number;
  /** fração dos cenários em que cada atividade esteve no caminho crítico (0–1) */
  criticality: Record<string, number>;
  histogram: { from: number; to: number; count: number }[];
  /** términos ordenados (para P(término ≤ prazo)) */
  finishes: number[];
}

const quantile = (sorted: readonly number[], q: number) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
};
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Probabilidade (empírica) de terminar até `target` dias. */
export function probabilityWithin(result: Pick<MonteCarloResult, "finishes">, target: number): number {
  const f = result.finishes;
  if (!f.length) return 0;
  let lo = 0;
  let hi = f.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (f[mid]! <= target + 1e-9) lo = mid + 1;
    else hi = mid;
  }
  return lo / f.length;
}

export function monteCarlo(tasks: readonly MonteCarloTask[], deps: readonly SchedDep[], opts: { runs?: number; seed?: number; bins?: number } = {}): MonteCarloResult | { error: "CICLO" } {
  const runs = Math.max(1, Math.min(20_000, Math.round(opts.runs ?? 2000)));
  const rnd = mulberry32(opts.seed ?? 42);
  const finishes: number[] = [];
  const critical = new Map<string, number>(tasks.map((t) => [t.id, 0]));
  for (let i = 0; i < runs; i++) {
    const sampled = tasks.map((t) => {
      const p = t.pert;
      const valid = p && p.o >= 0 && p.o <= p.m && p.m <= p.p;
      return { id: t.id, duration: valid ? samplePert(p.o, p.m, p.p, rnd) : t.duration };
    });
    const s = schedule(sampled, deps);
    if (!s.ok) return { error: "CICLO" };
    finishes.push(s.finish);
    for (const id of s.criticalPath) critical.set(id, (critical.get(id) ?? 0) + 1);
  }
  finishes.sort((a, b) => a - b);
  const mean = finishes.reduce((a, b) => a + b, 0) / runs;
  const sd = Math.sqrt(finishes.reduce((a, b) => a + (b - mean) ** 2, 0) / runs);
  const min = finishes[0]!;
  const max = finishes[finishes.length - 1]!;
  const bins = Math.max(1, opts.bins ?? 12);
  const width = (max - min) / bins || 1;
  const histogram = Array.from({ length: max > min ? bins : 1 }, (_, k) => ({ from: r2(min + k * width), to: r2(min + (k + 1) * width), count: 0 }));
  for (const f of finishes) histogram[Math.min(histogram.length - 1, Math.floor((f - min) / width))]!.count += 1;
  return {
    runs, mean: r2(mean), sd: r2(sd), min: r2(min), max: r2(max),
    p50: r2(quantile(finishes, 0.5)), p80: r2(quantile(finishes, 0.8)), p95: r2(quantile(finishes, 0.95)),
    criticality: Object.fromEntries([...critical.entries()].map(([id, n]) => [id, r2(n / runs)])),
    histogram,
    finishes,
  };
}
