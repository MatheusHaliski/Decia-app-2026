/**
 * Autoria de peças (Drawings/Letters): cadeia de eventos com hash e cálculo determinístico do percentual de IA.
 * Funções puras; o servidor é a fonte de verdade (o cliente nunca informa o percentual).
 */
export const AUTHORSHIP_RULE_VERSION = "1.0.0";
/** Fração de modificação humana a partir da qual uma unidade de IA passa a humana. */
export const HUMAN_TAKEOVER_THRESHOLD = 0.5;

export const AUTHORSHIP_CATEGORIES = ["HUMAN", "HUMAN_ASSISTED", "HYBRID", "AI_DIRECTED", "AI_FULL", "UNVERIFIED", "IMPORTED"] as const;
export type AuthorshipCategory = (typeof AUTHORSHIP_CATEGORIES)[number];

export const CONTRIBUTION_ORIGINS = ["MANUAL", "AI_PROPOSAL_ACCEPTED", "AI_AUTO_APPLIED", "IMPORT"] as const;
export type ContributionOrigin = (typeof CONTRIBUTION_ORIGINS)[number];

export const AUTHORSHIP_DISPLAYS = ["FULL", "CATEGORY_ONLY", "HIDDEN"] as const;
export type AuthorshipDisplay = (typeof AUTHORSHIP_DISPLAYS)[number];

export interface ContributionEvent {
  id: string;
  pieceId: string;
  revisionId: string;
  actorId: string;
  origin: ContributionOrigin;
  inferenceId?: string;
  provider?: string;
  model?: string;
  /** ids estáveis das unidades (objetos/blocos) afetadas */
  scope: readonly string[];
  acceptedAt: string;
  prevHash: string | null;
  hash: string;
}

export type NewContributionEvent = Omit<ContributionEvent, "prevHash" | "hash">;

async function sha256Hex(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function canonical(e: NewContributionEvent, prevHash: string | null): string {
  return JSON.stringify([prevHash, e.id, e.pieceId, e.revisionId, e.actorId, e.origin, e.inferenceId ?? null, e.provider ?? null, e.model ?? null, [...e.scope], e.acceptedAt]);
}

export async function appendEvent(chain: readonly ContributionEvent[], e: NewContributionEvent): Promise<ContributionEvent[]> {
  const prevHash = chain.length ? chain[chain.length - 1]!.hash : null;
  return [...chain, { ...e, prevHash, hash: await sha256Hex(canonical(e, prevHash)) }];
}

/** Índice do primeiro evento inválido, ou -1 se a cadeia estiver íntegra. */
export async function verifyChain(chain: readonly ContributionEvent[]): Promise<number> {
  let prev: string | null = null;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i]!;
    if (e.prevHash !== prev || e.hash !== (await sha256Hex(canonical(e, prev)))) return i;
    prev = e.hash;
  }
  return -1;
}

/** Unidade presente na versão final (objeto/bloco), com peso (área, nós de path, caracteres…). */
export interface FinalUnit {
  id: string;
  weight: number;
}

export interface AuthorshipInput {
  finalUnits: readonly FinalUnit[];
  /** Eventos válidos em ordem cronológica; unidade ausente da versão final é ignorada. */
  events: readonly ContributionEvent[];
  /** Fração (0..1) do conteúdo da unidade alterada por humano após a última aplicação de IA. */
  humanModification?: Readonly<Record<string, number>>;
  /** Houve apenas diagnóstico (Advisory) da IA. */
  advisoryOnly?: boolean;
  /** Logs incompletos ou ausentes. */
  logsIncomplete?: boolean;
}

export interface AuthorshipResult {
  category: AuthorshipCategory;
  /** 0..1; null quando não verificável */
  aiShare: number | null;
  ruleVersion: string;
}

const AI_ORIGINS: ReadonlySet<ContributionOrigin> = new Set(["AI_PROPOSAL_ACCEPTED", "AI_AUTO_APPLIED"]);

export function computeAuthorship(input: AuthorshipInput): AuthorshipResult {
  const ruleVersion = AUTHORSHIP_RULE_VERSION;
  if (input.logsIncomplete || input.finalUnits.length === 0 || input.events.length === 0) {
    return { category: "UNVERIFIED", aiShare: null, ruleVersion };
  }
  const last = new Map<string, ContributionOrigin>();
  for (const e of input.events) for (const id of e.scope) last.set(id, e.origin);
  let total = 0;
  let ai = 0;
  let imported = 0;
  let unknown = 0;
  for (const u of input.finalUnits) {
    const w = Math.max(0, u.weight);
    total += w;
    const origin = last.get(u.id);
    if (!origin) unknown += w;
    else if (origin === "IMPORT") imported += w;
    else if (AI_ORIGINS.has(origin) && (input.humanModification?.[u.id] ?? 0) < HUMAN_TAKEOVER_THRESHOLD) ai += w;
  }
  if (total === 0) return { category: "UNVERIFIED", aiShare: null, ruleVersion };
  if (unknown > 0 || imported > 0) return { category: imported > 0 && unknown === 0 ? "IMPORTED" : "UNVERIFIED", aiShare: null, ruleVersion };
  const aiShare = ai / total;
  const automatic = input.events.some((e) => e.origin === "AI_AUTO_APPLIED");
  let category: AuthorshipCategory;
  if (aiShare === 0) category = input.advisoryOnly ? "HUMAN_ASSISTED" : "HUMAN";
  else if (aiShare >= 0.9) category = "AI_FULL";
  else if (aiShare >= 0.5) category = automatic ? "AI_DIRECTED" : "HYBRID";
  else category = "HYBRID";
  return { category, aiShare, ruleVersion };
}

/** Faixa visual (passos de 25%) para evitar falsa precisão em ícones sem texto. */
export function aiShareBand(aiShare: number): 0 | 25 | 50 | 75 | 100 {
  if (aiShare <= 0) return 0;
  if (aiShare >= 1) return 100;
  return (Math.min(75, Math.max(25, Math.round(aiShare * 4) * 25)) as 25 | 50 | 75);
}

export interface AuthorshipClaim {
  category: AuthorshipCategory;
  overrideReason?: string;
}

/**
 * Declaração do dono vs. medição: rebaixar (declarar mais IA) é livre; elevar a autoria humana exige `overrideReason`
 * e resulta em UNVERIFIED (“declarado”).
 */
export function resolveClaim(measured: AuthorshipResult, claim: AuthorshipClaim): { category: AuthorshipCategory; declared: boolean; ok: boolean } {
  const rank: Record<AuthorshipCategory, number> = { HUMAN: 0, HUMAN_ASSISTED: 1, HYBRID: 2, AI_DIRECTED: 3, AI_FULL: 4, UNVERIFIED: 5, IMPORTED: 5 };
  if (claim.category === measured.category) return { category: measured.category, declared: false, ok: true };
  const moreAi = rank[claim.category] > rank[measured.category] && rank[measured.category] < 5;
  if (moreAi) return { category: claim.category, declared: true, ok: true };
  if (claim.overrideReason?.trim()) return { category: "UNVERIFIED", declared: true, ok: true };
  return { category: measured.category, declared: false, ok: false };
}

/** Visão pública reduzida: nenhum log, prompt ou modelo. */
export function publicAuthorship(r: AuthorshipResult, display: AuthorshipDisplay): { category: AuthorshipCategory | "NOT_DISCLOSED"; aiShare: number | null } {
  if (display === "HIDDEN") return { category: "NOT_DISCLOSED", aiShare: null };
  return { category: r.category, aiShare: display === "FULL" ? r.aiShare : null };
}
