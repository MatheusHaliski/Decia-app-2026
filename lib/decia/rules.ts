/**
 * DECIA — regras de cálculo (docs/decia/03_MODELO_FUNCIONAL.md §6). Funções puras; as do "formato oráculo"
 * (scoreMatrix, divergence, dominance, sensitivity, evidenceStrength, riskSeverity, decisionRisk, confidenceBand,
 * brier, canonicalJson, sha256Hex) reproduzem contracts/decia/gerar_vetores.py linha a linha e são verificadas contra
 * contracts/decia/vetores.json (rules.test.ts). As demais (prontidão, saúde, guarda, frescor, snapshot) recebem o
 * agregado do domínio e reutilizam as primeiras por meio dos adaptadores `toScoringInput`/`toEvidenceInput`.
 */
import type {
  DecisionAggregate, DecisionComplexity, DecisionLevel, IsoDate, Likelihood, RelevanceLevel,
} from "./types";
import { DECISION_LEVEL, LIKELIHOOD } from "./types";

export const MODEL_VERSION = "decia-scoring-v1";
const EPS = 1e-9;

/** Arredondamento meio-para-cima em 2 casas (§6.1). */
export const r2 = (x: number): number => Math.floor(x * 100 + 0.5 + EPS) / 100;

export function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

/* ------------------------------------------------------------------------------------------------
 * Formato oráculo (o mesmo dos vetores)
 * ------------------------------------------------------------------------------------------------ */
export interface ScoringInput {
  weightingEnabled: boolean;
  criteria: readonly { key: string; weightPct?: number | null }[];
  alternatives: readonly { key: string; status?: "ATIVA" | "DESCARTADA" }[];
  assessments: readonly { alt: string; crit: string; score: number; by?: string }[];
}

export interface RankingRow { alt: string; score: number; contributions: Record<string, number> }
export interface ScoreResult {
  valid: boolean;
  reason: "SEM_CRITERIOS" | "PESO_INVALIDO" | "PESOS_NAO_SOMAM_100" | null;
  weightSum: number | null;
  ranking: RankingRow[];
  incomplete: string[];
  leader: string | null;
}

const activeKeys = (inp: ScoringInput) => inp.alternatives.filter((a) => (a.status ?? "ATIVA") === "ATIVA").map((a) => a.key);

/** {alt: {crit: mediana}} só para células com avaliação. */
export function consensus(inp: ScoringInput, alts: readonly string[] = activeKeys(inp)): Record<string, Record<string, number>> {
  const crits = inp.criteria.map((c) => c.key);
  const out: Record<string, Record<string, number>> = {};
  for (const a of alts) {
    out[a] = {};
    for (const c of crits) {
      const vals = inp.assessments.filter((x) => x.alt === a && x.crit === c).map((x) => x.score);
      if (vals.length) out[a]![c] = median(vals);
    }
  }
  return out;
}

/** Pontuação ponderada (§6.1). `weightsOverride` é usado pela sensibilidade. */
export function scoreMatrix(inp: ScoringInput, weightsOverride?: Record<string, number>): ScoreResult {
  const crits = inp.criteria.map((c) => c.key);
  const alts = activeKeys(inp);
  if (!crits.length) return { valid: false, reason: "SEM_CRITERIOS", weightSum: null, ranking: [], incomplete: [], leader: null };
  let w: Record<string, number>;
  if (inp.weightingEnabled) {
    const raw: Record<string, number | null | undefined> = weightsOverride ?? Object.fromEntries(inp.criteria.map((c) => [c.key, c.weightPct]));
    if (Object.values(raw).some((v) => v === null || v === undefined || Number.isNaN(v) || v < 0 || v > 100)) {
      return { valid: false, reason: "PESO_INVALIDO", weightSum: null, ranking: [], incomplete: [], leader: null };
    }
    w = raw as Record<string, number>;
    const total = Object.values(w).reduce((s, v) => s + v, 0);
    if (Math.abs(total - 100) > 0.01) {
      return { valid: false, reason: "PESOS_NAO_SOMAM_100", weightSum: r2(total), ranking: [], incomplete: [], leader: null };
    }
  } else {
    w = Object.fromEntries(crits.map((c) => [c, 1]));
  }
  const cons = consensus(inp, alts);
  const sw = crits.reduce((s, c) => s + w[c]!, 0);
  const ranking: RankingRow[] = [];
  const incomplete: string[] = [];
  for (const a of alts) {
    if (Object.keys(cons[a]!).length < crits.length) {
      incomplete.push(a);
      continue;
    }
    const contributions: Record<string, number> = {};
    for (const c of crits) contributions[c] = r2((cons[a]![c]! * w[c]!) / sw);
    const total = r2(crits.reduce((s, c) => s + cons[a]![c]! * w[c]!, 0) / sw);
    ranking.push({ alt: a, score: total, contributions });
  }
  ranking.sort((x, y) => y.score - x.score || (x.alt < y.alt ? -1 : x.alt > y.alt ? 1 : 0));
  let leader: string | null = null;
  if (ranking.length && (ranking.length === 1 || ranking[0]!.score - ranking[1]!.score >= 0.05 - EPS)) leader = ranking[0]!.alt;
  return { valid: true, reason: null, weightSum: inp.weightingEnabled ? 100 : null, ranking, incomplete, leader };
}

export type DivergenceLevel = "ALTA" | "MODERADA" | "BAIXA";
export interface DivergenceRow { alt: string; crit: string; range: number; level: DivergenceLevel }

/** Divergência entre avaliadores (§6.2) — todas as alternativas, inclusive descartadas (como o oráculo). */
export function divergence(inp: ScoringInput): DivergenceRow[] {
  const out: DivergenceRow[] = [];
  for (const a of inp.alternatives.map((x) => x.key)) {
    for (const c of inp.criteria.map((x) => x.key)) {
      const vals = inp.assessments.filter((x) => x.alt === a && x.crit === c).map((x) => x.score);
      if (vals.length >= 2) {
        const range = Math.max(...vals) - Math.min(...vals);
        out.push({ alt: a, crit: c, range, level: range >= 3 ? "ALTA" : range === 2 ? "MODERADA" : "BAIXA" });
      }
    }
  }
  return out;
}

export interface DominanceRow { dominant: string; dominated: string; betterOn: string[] }

/** Dominância de Pareto (§6.3) sobre as notas de consenso das alternativas ativas e completas. */
export function dominance(inp: ScoringInput): DominanceRow[] {
  const crits = inp.criteria.map((c) => c.key);
  const alts = activeKeys(inp);
  const cons = consensus(inp, alts);
  const full = alts.filter((a) => Object.keys(cons[a]!).length === crits.length);
  const out: DominanceRow[] = [];
  for (const a of full) {
    for (const b of full) {
      if (a === b) continue;
      const A = cons[a]!, B = cons[b]!;
      if (crits.every((c) => A[c]! >= B[c]!) && crits.some((c) => A[c]! > B[c]!)) {
        out.push({ dominant: a, dominated: b, betterOn: crits.filter((c) => A[c]! > B[c]!) });
      }
    }
  }
  return out;
}

export interface SensitivityFlip { criterion: string; fromPct: number; toPct: number; delta: number; newLeader: string }
export interface SensitivityResult { applicable: boolean; flips: SensitivityFlip[]; robust: boolean | null; sensitive?: boolean }

/** Sensibilidade dos pesos (§6.4): menor novo peso (passo 1 pp, tenta w−d e depois w+d) que inverte a liderança. */
export function sensitivity(inp: ScoringInput): SensitivityResult {
  const base = scoreMatrix(inp);
  if (!inp.weightingEnabled || !base.valid || base.leader === null) return { applicable: false, flips: [], robust: null };
  const leader = base.leader;
  const weights: Record<string, number> = Object.fromEntries(inp.criteria.map((c) => [c.key, c.weightPct as number]));
  const challengers = base.ranking.map((r) => r.alt).filter((a) => a !== leader);
  const flips: (SensitivityFlip & { pos: number })[] = [];
  inp.criteria.forEach(({ key: c }, pos) => {
    const wc = weights[c]!;
    if (wc >= 100) return;
    for (const x of challengers) {
      let found: number | null = null;
      for (let d = 1; d <= 100 && found === null; d++) {
        for (const cand of [wc - d, wc + d]) {
          if (cand < 0 || cand > 100 || cand === wc) continue;
          const nw: Record<string, number> = {};
          for (const [k, v] of Object.entries(weights)) nw[k] = k === c ? cand : (v * (100 - cand)) / (100 - wc);
          if (scoreMatrix(inp, nw).leader === x) {
            found = cand;
            break;
          }
        }
      }
      if (found !== null) flips.push({ criterion: c, fromPct: wc, toPct: found, delta: Math.abs(found - wc), newLeader: x, pos });
    }
  });
  flips.sort((a, b) => a.delta - b.delta || a.pos - b.pos || (a.newLeader < b.newLeader ? -1 : a.newLeader > b.newLeader ? 1 : 0));
  const clean = flips.map(({ pos: _pos, ...f }) => f); // eslint-disable-line @typescript-eslint/no-unused-vars
  return { applicable: true, flips: clean, robust: clean.length === 0, sensitive: clean.some((f) => f.delta <= 10) };
}

/* ---- Força da evidência (§6.5) ---- */
export type EvidenceLevel = "FRACA" | "MODERADA" | "FORTE";
export interface EvidenceInput {
  alt: string;
  evidence: readonly {
    nature: "FATO" | "EVIDENCIA" | "OPINIAO";
    reliability: RelevanceLevel;
    source: string;
    superseded?: boolean;
    links: readonly { alt: string; stance: "SUSTENTA" | "CONTRADIZ" | "CONTEXTO" }[];
  }[];
}
export interface EvidenceStrength { level: EvidenceLevel; support: number; contra: number; reason: "SEM_EVIDENCIA" | null }

const REL: Record<RelevanceLevel, number> = { ALTA: 3, MEDIA: 2, BAIXA: 1 };

export function evidenceStrength(inp: EvidenceInput): EvidenceStrength {
  let sup = 0, con = 0;
  const sources = new Set<string>();
  for (const e of inp.evidence) {
    if (e.superseded) continue;
    for (const link of e.links) {
      if (link.alt !== inp.alt) continue;
      const wgt = REL[e.reliability] * (e.nature === "OPINIAO" ? 0.5 : 1);
      if (link.stance === "SUSTENTA") {
        sup += wgt;
        sources.add(e.source);
      } else if (link.stance === "CONTRADIZ") con += wgt;
    }
  }
  if (sup === 0 && con === 0) return { level: "FRACA", support: 0, contra: 0, reason: "SEM_EVIDENCIA" };
  const level: EvidenceLevel = sup >= 6 && sources.size >= 2 && con < sup / 2 ? "FORTE" : sup >= 3 && con < sup ? "MODERADA" : "FRACA";
  return { level, support: sup, contra: con, reason: null };
}

/* ---- Risco (§6.6) ---- */
export type RiskLevel = DecisionLevel;
export type DecisionRiskLevel = RiskLevel | "NAO_AVALIADO";
const MATRIX: RiskLevel[][] = [
  ["BAIXO", "BAIXO", "MEDIO", "ALTO"],
  ["BAIXO", "MEDIO", "ALTO", "ALTO"],
  ["MEDIO", "ALTO", "ALTO", "CRITICO"],
  ["MEDIO", "ALTO", "CRITICO", "CRITICO"],
];
export const riskSeverity = (likelihood: Likelihood, impact: DecisionLevel): RiskLevel => MATRIX[LIKELIHOOD.indexOf(likelihood)]![DECISION_LEVEL.indexOf(impact)]!;

export interface DecisionRiskInput {
  alt: string | null;
  risks: readonly { likelihood: Likelihood; impact: DecisionLevel; status: string; alt?: string | null }[];
  assumptions?: readonly { importance: DecisionLevel; status: string }[];
}

export function decisionRisk(inp: DecisionRiskInput): DecisionRiskLevel {
  const sevs = inp.risks
    .filter((r) => r.status === "ABERTO" && (r.alt === undefined || r.alt === null || r.alt === inp.alt))
    .map((r) => riskSeverity(r.likelihood, r.impact));
  if ((inp.assumptions ?? []).some((a) => a.importance === "CRITICO" && a.status === "INVALIDADA")) sevs.push("ALTO");
  if (!sevs.length) return "NAO_AVALIADO";
  return sevs.reduce((m, s) => (DECISION_LEVEL.indexOf(s) > DECISION_LEVEL.indexOf(m) ? s : m));
}

/* ---- Confiança, previsões e calibração (§6.9) ---- */
export type ConfidenceBand = "BAIXA" | "MEDIA" | "ALTA";
export const confidenceBand = (pct: number): ConfidenceBand => (pct < 40 ? "BAIXA" : pct < 70 ? "MEDIA" : "ALTA");
/** Normaliza a confiança humana para 0–100 em passos de 5 (G11). */
export const snapConfidence = (pct: number): number => Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
/** Normaliza a probabilidade de uma previsão para 5–95 em passos de 5. */
export const snapProbability = (pct: number): number => Math.max(5, Math.min(95, Math.round(pct / 5) * 5));

export interface BrierResult { n: number; brier: number | null }
export function brier(forecasts: readonly { probabilityPct: number; resolution: string }[]): BrierResult {
  const res = forecasts.filter((f) => f.resolution === "OCORREU" || f.resolution === "NAO_OCORREU");
  if (!res.length) return { n: 0, brier: null };
  const v = res.reduce((s, f) => s + (f.probabilityPct / 100 - (f.resolution === "OCORREU" ? 1 : 0)) ** 2, 0) / res.length;
  return { n: res.length, brier: Math.round(v * 1e4) / 1e4 };
}

/** Buckets de calibração (§6.9): frequência observada × média declarada. Só exibir com n ≥ 10. */
export const CALIBRATION_BUCKETS = [[5, 15], [20, 35], [40, 60], [65, 80], [85, 95]] as const;
export const CALIBRATION_MIN_N = 10;
export function calibration(forecasts: readonly { probabilityPct: number; resolution: string }[]) {
  const res = forecasts.filter((f) => f.resolution === "OCORREU" || f.resolution === "NAO_OCORREU");
  return CALIBRATION_BUCKETS.map(([lo, hi]) => {
    const inB = res.filter((f) => f.probabilityPct >= lo && f.probabilityPct <= hi);
    return {
      range: [lo, hi] as const,
      n: inB.length,
      declared: inB.length ? inB.reduce((s, f) => s + f.probabilityPct, 0) / inB.length / 100 : null,
      observed: inB.length ? inB.filter((f) => f.resolution === "OCORREU").length / inB.length : null,
    };
  });
}

/* ---- JSON canônico + SHA-256 (§6.12) ---- */
/** Chaves ordenadas, sem espaços, UTF-8 cru (= json.dumps(sort_keys=True, separators=(",", ":"), ensure_ascii=False)). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * SHA-256 síncrono (FIPS 180-4) em TypeScript puro — o snapshot é gravado no mesmo tick da ação "Decidir" e o mock do
 * repositório não é assíncrono. `sha256HexAsync` (Web Crypto) dá o mesmo resultado; os dois são testados contra o vetor.
 */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15]!, 7) ^ rotr(W[i - 15]!, 18) ^ (W[i - 15]! >>> 3);
      const s1 = rotr(W[i - 2]!, 17) ^ rotr(W[i - 2]!, 19) ^ (W[i - 2]! >>> 10);
      W[i] = (W[i - 16]! + s0 + W[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H as unknown as number[];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e!, 6) ^ rotr(e!, 11) ^ rotr(e!, 25);
      const ch = (e! & f!) ^ (~e! & g!);
      const t1 = (h! + S1 + ch + K[i]! + W[i]!) >>> 0;
      const S0 = rotr(a!, 2) ^ rotr(a!, 13) ^ rotr(a!, 22);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d! + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0]! + a!) >>> 0; H[1] = (H[1]! + b!) >>> 0; H[2] = (H[2]! + c!) >>> 0; H[3] = (H[3]! + d!) >>> 0;
    H[4] = (H[4]! + e!) >>> 0; H[5] = (H[5]! + f!) >>> 0; H[6] = (H[6]! + g!) >>> 0; H[7] = (H[7]! + h!) >>> 0;
  }
  return Array.from(H, (x) => x.toString(16).padStart(8, "0")).join("");
}

/** SHA-256 pela Web Crypto (`crypto.subtle`, navegador em contexto seguro e Node ≥ 20). */
export async function sha256HexAsync(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------------------------------------
 * Adaptadores: agregado do domínio → formato oráculo
 * ------------------------------------------------------------------------------------------------ */
export function toScoringInput(agg: DecisionAggregate): ScoringInput {
  return {
    weightingEnabled: agg.decision.weightingEnabled,
    criteria: [...agg.criteria].sort((a, b) => a.position - b.position).map((c) => ({ key: c.id, weightPct: c.weightPct })),
    alternatives: [...agg.alternatives].sort((a, b) => a.position - b.position).map((a) => ({ key: a.id, status: a.status })),
    assessments: agg.assessments.map((x) => ({ alt: x.alternativeId, crit: x.criterionId, score: x.score, by: x.assessorUserId })),
  };
}

/** Evidências ligadas a uma alternativa — direto (ALTERNATIVA) ou por uma avaliação dela (AVALIACAO). */
export function toEvidenceInput(agg: DecisionAggregate, altId: string): EvidenceInput {
  const assessmentAlt = new Map(agg.assessments.map((a) => [a.id, a.alternativeId]));
  return {
    alt: altId,
    evidence: agg.evidence.map((e) => ({
      nature: e.nature,
      reliability: e.reliability,
      source: e.sourceLabel,
      superseded: !!e.supersededAt,
      links: agg.evidenceLinks
        .filter((l) => l.evidenceId === e.id && (l.targetType === "ALTERNATIVA" || l.targetType === "AVALIACAO"))
        .map((l) => ({ alt: l.targetType === "ALTERNATIVA" ? l.targetId : assessmentAlt.get(l.targetId) ?? "", stance: l.stance })),
    })),
  };
}

export const scoreOf = (agg: DecisionAggregate) => scoreMatrix(toScoringInput(agg));

/** Alternativa de referência: a selecionada (estado atual) ou a líder da matriz. */
export function focusAlternativeId(agg: DecisionAggregate, score: ScoreResult = scoreOf(agg)): string | null {
  return agg.decision.selectedAlternativeId ?? score.leader;
}

export function evidenceStrengthOf(agg: DecisionAggregate, altId: string | null): EvidenceStrength {
  if (!altId) return { level: "FRACA", support: 0, contra: 0, reason: "SEM_EVIDENCIA" };
  return evidenceStrength(toEvidenceInput(agg, altId));
}

export function decisionRiskOf(agg: DecisionAggregate, altId: string | null): DecisionRiskLevel {
  return decisionRisk({
    alt: altId,
    risks: agg.risks.map((r) => ({ likelihood: r.likelihood, impact: r.impact, status: r.status, alt: r.alternativeId ?? null })),
    assumptions: agg.assumptions.map((a) => ({ importance: a.importance, status: a.validationStatus })),
  });
}

export const highDivergenceOf = (agg: DecisionAggregate) => {
  const active = new Set(agg.alternatives.filter((a) => a.status === "ATIVA").map((a) => a.id));
  return divergence(toScoringInput(agg)).filter((d) => d.level === "ALTA" && active.has(d.alt));
};

/* ---- Prontidão (§6.7) ---- */
export type CheckState = "OK" | "ALERTA" | "FALTA";
export type ReadinessKey = "question" | "owner" | "alternatives" | "criteria" | "matrix" | "evidence" | "assumptions" | "risks";
export type ReadinessLevel = "NAO_PRONTA" | "PRECISA_DE_EVIDENCIA" | "PRONTA_PARA_REVISAO" | "PRONTA_PARA_DECIDIR";
export interface ReadinessCheckItem { key: ReadinessKey; state: CheckState }
export interface Readiness { level: ReadinessLevel; checks: ReadinessCheckItem[] }

const isCriticalAssumption = (importance: DecisionLevel) => importance === "CRITICO";

export function readiness(agg: DecisionAggregate, score: ScoreResult = scoreOf(agg)): Readiness {
  const d = agg.decision;
  const cx: DecisionComplexity = d.complexity;
  const checks: ReadinessCheckItem[] = [];
  const q = d.question.trim();
  checks.push({ key: "question", state: q.length >= 15 && q.endsWith("?") ? "OK" : "FALTA" });
  checks.push({ key: "owner", state: d.ownerUserId ? "OK" : "FALTA" });
  checks.push({ key: "alternatives", state: agg.alternatives.filter((a) => a.status === "ATIVA").length >= 2 ? "OK" : "FALTA" });
  const nCrit = agg.criteria.length;
  const critOk = cx === "RAPIDA" ? nCrit >= 1 : cx === "PADRAO" ? nCrit >= 2 : nCrit >= 2 && d.weightingEnabled && score.valid;
  checks.push({ key: "criteria", state: critOk ? "OK" : "FALTA" });
  if (cx !== "RAPIDA") {
    const matrixOk = nCrit > 0 && score.valid && score.incomplete.length === 0 && score.ranking.length > 0;
    checks.push({ key: "matrix", state: matrixOk ? "OK" : "FALTA" });
    const soft: CheckState = cx === "PADRAO" ? "ALERTA" : "FALTA";
    const focus = focusAlternativeId(agg, score);
    const ev = evidenceStrengthOf(agg, focus);
    checks.push({ key: "evidence", state: ev.level !== "FRACA" ? "OK" : soft });
    const critical = agg.assumptions.filter((a) => isCriticalAssumption(a.importance));
    const assumptionsOk = critical.every((a) => a.validationStatus === "VALIDADA" || a.validationStatus === "EM_VALIDACAO");
    checks.push({ key: "assumptions", state: assumptionsOk ? "OK" : soft });
    const risksOk = !!focus && agg.risks.some((r) => !r.alternativeId || r.alternativeId === focus);
    checks.push({ key: "risks", state: risksOk ? "OK" : soft });
  }
  const falta = (k: ReadinessKey) => checks.some((c) => c.key === k && c.state === "FALTA");
  let level: ReadinessLevel;
  if (checks.some((c) => c.state === "FALTA" && c.key !== "evidence")) level = "NAO_PRONTA";
  else if (falta("evidence")) level = "PRECISA_DE_EVIDENCIA";
  else if (checks.some((c) => c.state === "ALERTA")) level = "PRONTA_PARA_REVISAO";
  else level = "PRONTA_PARA_DECIDIR";
  return { level, checks };
}

/* ---- Frescor (§6.11) ---- */
export type Freshness = "FRESCA" | "REVISAO_DEVIDA" | "VENCIDA";
const DAY = 86_400_000;
const ts = (d?: IsoDate) => (d ? Date.parse(d) : NaN);

export function freshness(agg: DecisionAggregate, now: Date): Freshness | null {
  const d = agg.decision;
  if (!["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA"].includes(d.status)) return null;
  const decidedAt = ts(d.decidedAt);
  const lastDecisionSnap = agg.snapshots.filter((s) => s.kind === "DECISAO").sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const treated = (firedAt: number) => agg.checkpoints.some((c) => c.status === "CONCLUIDO" && ts(c.completedAt) >= firedAt);
  if (agg.checkpoints.some((c) => c.status === "PERDIDO")) return "VENCIDA";
  if (agg.triggers.some((t) => t.status === "DISPARADO" && !treated(ts(t.firedAt)))) return "VENCIDA";
  if (agg.assumptions.some((a) => a.importance === "CRITICO" && a.validationStatus === "INVALIDADA" && ts(a.validatedAt) > decidedAt)) return "VENCIDA";
  const t = now.getTime();
  if (agg.checkpoints.some((c) => c.status === "AGENDADO" && ts(c.dueAt) - t <= 7 * DAY)) return "REVISAO_DEVIDA";
  if (lastDecisionSnap) {
    const snapAt = ts(lastDecisionSnap.takenAt);
    // só evidência LIGADA à decisão depois do snapshot conta (uma referência solta não move a decisão para revisão — Codex P2, PR #31)
    const live = new Set(agg.evidence.filter((e) => !e.supersededAt).map((e) => e.id));
    if (agg.evidenceLinks.some((l) => live.has(l.evidenceId) && l.createdAt && ts(l.createdAt) > snapAt)) return "REVISAO_DEVIDA";
  }
  if (d.reviewEveryDays) {
    const lastReview = Math.max(decidedAt || 0, ...agg.checkpoints.filter((c) => c.status === "CONCLUIDO").map((c) => ts(c.completedAt) || 0));
    if (lastReview && t - lastReview > d.reviewEveryDays * DAY) return "REVISAO_DEVIDA";
  }
  return "FRESCA";
}

/* ---- Saúde (§6.8) — componentes, sem total ---- */
export type HealthState = "OK" | "ATENCAO" | "FALTA";
export type HealthKey = "evidenceCoverage" | "assumptionValidation" | "alternativeCoverage" | "stakeholderAlignment" | "freshness";
export interface HealthComponent { key: HealthKey; state: HealthState; ratio: number | null; applicable: boolean }

const byRatio = (r: number): HealthState => (r >= 0.8 ? "OK" : r >= 0.5 ? "ATENCAO" : "FALTA");

export function health(agg: DecisionAggregate, now: Date): HealthComponent[] {
  const live = new Set(agg.evidence.filter((e) => !e.supersededAt).map((e) => e.id));
  const covered = agg.criteria.filter((c) => agg.evidenceLinks.some((l) => l.targetType === "CRITERIO" && l.targetId === c.id && live.has(l.evidenceId)));
  const evRatio = agg.criteria.length ? covered.length / agg.criteria.length : 0;
  const critical = agg.assumptions.filter((a) => isCriticalAssumption(a.importance));
  const asRatio = critical.length ? critical.filter((a) => a.validationStatus === "VALIDADA").length / critical.length : null;
  const active = agg.alternatives.filter((a) => a.status === "ATIVA").length;
  const doNothing = agg.alternatives.some((a) => a.doNothing);
  const fresh = freshness(agg, now);
  return [
    { key: "evidenceCoverage", state: agg.criteria.length ? byRatio(evRatio) : "FALTA", ratio: agg.criteria.length ? evRatio : null, applicable: true },
    { key: "assumptionValidation", state: asRatio === null ? "OK" : byRatio(asRatio), ratio: asRatio, applicable: asRatio !== null },
    { key: "alternativeCoverage", state: active >= 2 && doNothing ? "OK" : active >= 2 ? "ATENCAO" : "FALTA", ratio: null, applicable: true },
    { key: "stakeholderAlignment", state: highDivergenceOf(agg).length ? "ATENCAO" : "OK", ratio: null, applicable: true },
    { key: "freshness", state: fresh === null || fresh === "FRESCA" ? "OK" : fresh === "REVISAO_DEVIDA" ? "ATENCAO" : "FALTA", ratio: null, applicable: fresh !== null },
  ];
}

/* ---- Guarda pré-decisão (§6.10) ---- */
/** Mesmos nomes do Java `PreDecisionGuard.Block`/`Warning` (D-53). */
export type GuardBlock = "SEM_ALTERNATIVA_SELECIONADA" | "SEM_RESPONSAVEL" | "MOTIVO_VAZIO" | "ALTERNATIVA_DESCARTADA";
export type GuardWarning = "PRONTIDAO_INCOMPLETA" | "RISCO_CRITICO_ABERTO" | "DIVERGENCIA_ALTA_ABERTA" | "PREMISSA_CRITICA_NAO_VALIDADA" | "CONFIANCA_ACIMA_DA_EVIDENCIA";
export interface DecisionDraft { selectedAlternativeId?: string | null; rationale: string; confidencePct?: number | null }
export interface GuardResult { code: "DECISAO_INCOMPLETA" | null; blocking: GuardBlock[]; warnings: GuardWarning[] }

export function preDecisionGuard(agg: DecisionAggregate, draft: DecisionDraft): GuardResult {
  const d = agg.decision;
  const blocking: GuardBlock[] = [];
  const alt = draft.selectedAlternativeId ? agg.alternatives.find((a) => a.id === draft.selectedAlternativeId) : undefined;
  if (!alt) blocking.push("SEM_ALTERNATIVA_SELECIONADA");
  else if (alt.status === "DESCARTADA") blocking.push("ALTERNATIVA_DESCARTADA");
  if (!d.ownerUserId) blocking.push("SEM_RESPONSAVEL");
  if (draft.rationale.trim().length < 10) blocking.push("MOTIVO_VAZIO");
  const warnings: GuardWarning[] = [];
  const altId = alt?.id ?? null;
  // a prontidão é avaliada com a alternativa escolhida como foco
  const probe: DecisionAggregate = altId ? { ...agg, decision: { ...d, selectedAlternativeId: altId } } : agg;
  if (d.complexity !== "RAPIDA" && readiness(probe).level !== "PRONTA_PARA_DECIDIR") warnings.push("PRONTIDAO_INCOMPLETA");
  // como no Java: qualquer risco ABERTO com severidade CRÍTICA (§6.6)
  if (agg.risks.some((r) => r.status === "ABERTO" && riskSeverity(r.likelihood, r.impact) === "CRITICO")) warnings.push("RISCO_CRITICO_ABERTO");
  if (highDivergenceOf(agg).length) warnings.push("DIVERGENCIA_ALTA_ABERTA");
  if (agg.assumptions.some((a) => a.importance === "CRITICO" && a.validationStatus === "NAO_VALIDADA")) warnings.push("PREMISSA_CRITICA_NAO_VALIDADA");
  if (d.complexity !== "RAPIDA" && draft.confidencePct != null && confidenceBand(draft.confidencePct) === "ALTA" && evidenceStrengthOf(agg, altId).level === "FRACA") warnings.push("CONFIANCA_ACIMA_DA_EVIDENCIA");
  return { code: blocking.length ? "DECISAO_INCOMPLETA" : null, blocking, warnings };
}

/* ---- Complexidade sugerida (§4.4, DESIGN PROPOSAL) ---- */
export function suggestComplexity(input: { impact: DecisionLevel; participants?: number; alternatives?: number }): DecisionComplexity {
  if (input.impact === "ALTO" || input.impact === "CRITICO" || (input.participants ?? 0) >= 5) return "PROFUNDA";
  if (input.impact === "MEDIO" || (input.alternatives ?? 0) >= 3) return "PADRAO";
  return "RAPIDA";
}

/* ---- Snapshot (§6.12) ---- */
export function buildSnapshotContent(agg: DecisionAggregate, draft: DecisionDraft & { decidedByUserId: string }) {
  const sc = scoreOf(agg);
  const probe: DecisionAggregate = { ...agg, decision: { ...agg.decision, selectedAlternativeId: draft.selectedAlternativeId ?? undefined } };
  const rec = agg.recommendations.find((r) => r.status !== "DESCARTADA");
  return {
    alternatives: agg.alternatives.map((a) => ({ id: a.id, label: a.label, title: a.title, doNothing: a.doNothing, status: a.status })),
    criteria: agg.criteria.map((c) => ({ id: c.id, name: c.name, weightPct: c.weightPct })),
    assessments: agg.assessments.map((a) => ({ alt: a.alternativeId, crit: a.criterionId, by: a.assessorUserId, score: a.score })),
    consensus: consensus(toScoringInput(agg)),
    ranking: sc.ranking.map((r) => ({ alt: r.alt, score: r.score })),
    evidence: agg.evidence.map((e) => ({ id: e.id, title: e.title, nature: e.nature, reliability: e.reliability, source: e.sourceLabel, retrievedAt: e.retrievedAt ?? null })),
    links: agg.evidenceLinks.map((l) => ({ evidence: l.evidenceId, target: l.targetId, type: l.targetType, stance: l.stance })),
    assumptions: agg.assumptions.map((a) => ({ id: a.id, statement: a.statement, status: a.validationStatus, confidencePct: a.confidencePct ?? null })),
    risks: agg.risks.map((r) => ({ id: r.id, title: r.title, likelihood: r.likelihood, impact: r.impact, status: r.status })),
    forecasts: agg.forecasts.map((f) => ({ id: f.id, statement: f.statement, probabilityPct: f.probabilityPct, resolveBy: f.resolveBy })),
    recommendation: rec ? { source: rec.source, alternativeId: rec.alternativeId ?? null } : null,
    readiness: readiness(probe).level,
    owner: agg.decision.ownerUserId,
    participants: agg.participants.map((p) => ({ userId: p.userId, role: p.role })),
    selected: draft.selectedAlternativeId ?? null,
    rationale: draft.rationale,
    confidencePct: draft.confidencePct ?? null,
    decidedBy: draft.decidedByUserId,
    modelVersion: MODEL_VERSION,
  };
}

/** §7: recomendação sem `supporting` **e** `contradicting` (≥ 1 item cada) é rejeitada pelo domínio. */
export const isValidRecommendation = (r: { supporting: readonly string[]; contradicting: readonly string[] }) => r.supporting.length > 0 && r.contradicting.length > 0;

/** Re-hash do conteúdo: diferente do gravado = adulteração (teste-guarda). */
export const verifySnapshot = (s: { contentJson: string; contentSha256: string }) => sha256Hex(s.contentJson) === s.contentSha256;
