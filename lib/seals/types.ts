/**
 * Chancelas institucionais e de chefia (RF39): vocabulário do README do RF39 — `Seal` (emissor EMPRESA ou CHEFE, tier TAREFA ·
 * PROJETO · PLANO, Excelência, ciclo, limite de uso), `SealPolicy` (AUTO · REVISAO com `SealCriterion`), `SealBond` (item ×
 * emissor, base da concessão, estado), `Benefit` e `BenefitRedemption`. Os critérios são calculados pelo sistema a partir dos fatos
 * do item; a "IA" só sugere e justifica (✦), sempre com os números calculados.
 */
import type { ViewerProfile } from "@/lib/viewer/profiles";

export const SEAL_TIERS = ["TAREFA", "PROJETO", "PLANO"] as const;
export type SealTier = (typeof SEAL_TIERS)[number];

export const SEAL_CRITERIA = ["CONFORMIDADE_MIN", "RASTRO_COMPLETO", "PRAZO_CUMPRIDO", "REACOES_MIN", "REUTILIZACOES_MIN", "DECISAO_VALIDADA", "SEM_PENDENCIA"] as const;
export type SealCriterion = (typeof SEAL_CRITERIA)[number];
/** Critérios com mínimo numérico (os demais são sim/não). */
export const THRESHOLD_CRITERIA: readonly SealCriterion[] = ["CONFORMIDADE_MIN", "REACOES_MIN", "REUTILIZACOES_MIN"];
export const DEFAULT_THRESHOLDS: Partial<Record<SealCriterion, number>> = { CONFORMIDADE_MIN: 80, REACOES_MIN: 3, REUTILIZACOES_MIN: 3 };

export const POLICY_MODES = ["AUTO", "REVISAO"] as const;
export type PolicyMode = (typeof POLICY_MODES)[number];

export const BOND_BASES = ["MODELO_MATCH", "DEPARTAMENTO_MATCH", "PLANO_MATCH", "DECISAO_MATCH", "POLITICA", "INDICACAO", "PREMIACAO"] as const;
export type BondBasis = (typeof BOND_BASES)[number];

export const BOND_STATUSES = ["SUGERIDA", "ACEITA", "EDITADA", "RECUSADA", "EM_REVISAO", "APROVADA", "APROVADA_PRIVADA", "REJEITADA", "REVOGADA", "EXPIRADA"] as const;
export type BondStatus = (typeof BOND_STATUSES)[number];

export const BENEFIT_TYPES = ["PONTOS_BONUS", "CREDITOS_IA", "CERTIFICADO", "CAPACITACAO", "PRIORIDADE_REVISAO", "VITRINE_DIRETA", "MENCAO_RELATORIO"] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

/** Como a chancela é concedida: vínculo sugerido (✦), política de critérios ou premiação. */
export const GRANT_MODES = ["SUGESTAO", "POLITICA", "PREMIACAO"] as const;
export type GrantMode = (typeof GRANT_MODES)[number];

export interface CriterionRule {
  criterion: SealCriterion;
  /** mínimo (CONFORMIDADE_MIN em %, REACOES_MIN e REUTILIZACOES_MIN em quantidade); null nos critérios sim/não */
  threshold: number | null;
}

export interface SealPolicy {
  mode: PolicyMode;
  criteria: CriterionRule[];
}

export interface Seal {
  id: string;
  name: string;
  issuerKind: "EMPRESA" | "CHEFE";
  /** quem emite (a conta da EMPRESA ou o CHEFE) */
  issuerId: string;
  issuerName: string;
  /** departamento do emissor (CHEFE); null = toda a empresa */
  department: string | null;
  tier: SealTier;
  excellence: boolean;
  /** ciclo de concessão (AAAA-MM-DD, inclusive) */
  availableFrom: string;
  availableUntil: string | null;
  /** concessões por ciclo; null = sem limite */
  usageLimit: number | null;
  usageCount: number;
  policy: SealPolicy;
  createdAt: string;
}

export interface Benefit {
  id: string;
  sealId: string;
  type: BenefitType;
  /** créditos de IA (CREDITOS_IA) */
  credits: number | null;
  /** resgates no total; null = sem limite */
  totalQuota: number | null;
  /** resgates por pessoa */
  perUserLimit: number;
  /** último dia para resgatar (AAAA-MM-DD); null = enquanto a chancela valer */
  expiresAt: string | null;
  redeemedCount: number;
  createdAt: string;
}

/** Fatos do item calculados pelo sistema (D-12) — a entrada dos critérios. */
export interface TargetFacts {
  /** % de conformidade */
  conformityPct: number;
  traceComplete: boolean;
  deadlineMet: boolean;
  reactions: number;
  reuses: number;
  decisionValidated: boolean;
  /** pendências abertas */
  pending: number;
}

export interface SealTarget {
  type: SealTier;
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  department: string | null;
  /** colaboradores envolvidos (recebem os benefícios) */
  involvedIds: readonly string[];
  facts: TargetFacts;
}

export interface CriterionResult {
  criterion: SealCriterion;
  threshold: number | null;
  value: number | boolean;
  met: boolean;
}

export interface SealBond {
  id: string;
  sealId: string;
  targetType: SealTier;
  targetId: string;
  targetTitle: string;
  targetOwnerId: string;
  involvedIds: readonly string[];
  issuerId: string;
  basis: BondBasis;
  status: BondStatus;
  /** confiança da sugestão (0–100), só no vínculo sugerido */
  confidence: number | null;
  report: CriterionResult[];
  requestedBy: string;
  autoIssued: boolean;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface BenefitRedemption {
  id: string;
  benefitId: string;
  bondId: string;
  userId: string;
  /** código do resgate (voucher) */
  code: string;
  at: string;
  /** lançamento BENEFICIO_BONUS no razão */
  ledgerEntryId: string | null;
  /** créditos de IA entregues */
  aiCreditEntryId: string | null;
}

/** Quem age nas chancelas (dono do saldo para quem tem; senão o nome de usuário). */
export interface SealActor {
  id: string;
  profile: ViewerProfile;
  name: string;
  department: string | null;
}
