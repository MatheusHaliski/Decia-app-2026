/**
 * Chancelas — repositório em memória (DEMO). A API (`POST /api/seals`, `POST /api/seal-bonds/{id}/review`,
 * `POST /api/benefits/{id}/redeem`…) ainda não existe e não é presumida: `SealsRepository` é o contrato que o cliente HTTP real
 * implementará (`SealService`, `SealBondService`, `BenefitService` do README do RF39). Regras: só EMPRESA/CHEFE criam (403 para os
 * demais) e o ciclo não pode terminar antes de começar (PERIODO_INVALIDO); um vínculo ativo por item e emissor
 * (CHANCELA_DUPLICADA); limite de uso por ciclo (LIMITE_ESGOTADO); vínculo sugerido vai para a fila; política AUTO com critérios
 * atendidos aprova sozinha (autoIssued), REVISAO vai para a fila e critério não atendido não concede; premiação aprova; a fila
 * aprova ou recusa com motivo obrigatório; benefícios valem para os colaboradores envolvidos no item com chancela APROVADA (senão
 * CHANCELA_INVALIDA), com cota e limite por pessoa, e o resgate é idempotente — bônus em DECIA Points pelo `award`
 * BENEFICIO_BONUS e créditos de IA no saldo da Loja. Os dados vivem só nesta aba do navegador.
 */
import type { PointsLedger } from "@/lib/points/ledger";
import type { StoreRepository } from "@/lib/store/repository";
import { evaluatePolicy, sealOpen, suggestionBasis } from "./criteria";
import { canAwardSeal, canCreateSeal, canGrantSeal, canPublishBenefit, canRedeemBenefits, canReviewSeal, conflictOfInterest } from "./permissions";
import type { Benefit, BenefitRedemption, BenefitType, CriterionRule, GrantMode, PolicyMode, Seal, SealActor, SealBond, SealTarget, SealTier } from "./types";
import { BENEFIT_TYPES, POLICY_MODES, SEAL_CRITERIA, SEAL_TIERS, THRESHOLD_CRITERIA } from "./types";

export type SealError =
  | "ACESSO_NEGADO" | "VALIDACAO" | "PERIODO_INVALIDO" | "NAO_ENCONTRADO" | "FORA_DO_CICLO" | "TIER_INCOMPATIVEL" | "CHANCELA_DUPLICADA"
  | "LIMITE_ESGOTADO" | "CRITERIOS_NAO_ATENDIDOS" | "ESTADO_INVALIDO" | "MOTIVO_OBRIGATORIO" | "CONFLITO_DE_INTERESSE" | "CHANCELA_INVALIDA"
  | "BENEFICIO_EXPIRADO" | "BENEFICIO_INDISPONIVEL";

/** Campo do formulário que causou o erro de validação (422 `details`). */
export type SealField = "name" | "period" | "usageLimit" | "criteria" | "benefits";
export type Fail = { ok: false; reason: SealError; field?: SealField };

export const SEAL_NAME_MAX = 80;
export const REVIEW_REASON_MAX = 300;
export const BENEFIT_CREDITS_MAX = 100;
export const MAX_BENEFITS_PER_SEAL = 4;

export interface BenefitForm {
  type: BenefitType;
  credits?: number | null;
  totalQuota: number | null;
  perUserLimit?: number;
  expiresAt?: string | null;
}

export interface SealForm {
  name: string;
  tier: SealTier;
  excellence: boolean;
  availableFrom: string;
  availableUntil: string | null;
  usageLimit: number | null;
  mode: PolicyMode;
  criteria: CriterionRule[];
  benefits: BenefitForm[];
}

export interface GrantInput {
  sealId: string;
  target: SealTarget;
  mode: GrantMode;
  /** confiança da sugestão (0–100), quando o vínculo vem da sugestão ✦ */
  confidence?: number | null;
}

export type BenefitState = "DISPONIVEL" | "RESGATADO" | "ESGOTADO" | "EXPIRADO";
export interface BenefitOffer {
  benefit: Benefit;
  seal: Seal;
  bond: SealBond;
  state: BenefitState;
}

export interface SealsRepository {
  readonly source: "DEMO" | "API";
  seals(): readonly Seal[];
  seal(id: string): Seal | undefined;
  benefitsOf(sealId: string): readonly Benefit[];
  allBenefits(): readonly Benefit[];
  bonds(): readonly SealBond[];
  bond(id: string): SealBond | undefined;
  /** vínculos EM_REVISAO que a pessoa pode revisar (ADMIN vê todos, só leitura) */
  reviewQueue(actor: SealActor): readonly SealBond[];
  /** vínculos recusados das chancelas que a pessoa emite (ADMIN vê todos) */
  rejected(actor: SealActor): readonly SealBond[];
  /** benefícios liberados à pessoa (envolvida em item com chancela APROVADA) */
  benefitsFor(userId: string, now?: Date): readonly BenefitOffer[];
  redemptions(userId: string): readonly BenefitRedemption[];
  createSeal(actor: SealActor, form: SealForm, now?: Date): { ok: true; seal: Seal; benefits: Benefit[] } | Fail;
  publishBenefit(actor: SealActor, sealId: string, form: BenefitForm, now?: Date): { ok: true; benefit: Benefit } | Fail;
  grant(actor: SealActor, input: GrantInput, now?: Date): { ok: true; bond: SealBond } | Fail;
  review(actor: SealActor, bondId: string, decision: "APROVAR" | "RECUSAR", reason?: string, now?: Date): { ok: true; bond: SealBond } | Fail;
  redeem(actor: SealActor, input: { benefitId: string; bondId: string; idempotencyKey: string }, now?: Date): { ok: true; redemption: BenefitRedemption; replay: boolean } | Fail;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

export interface SealsDeps {
  ledger: PointsLedger;
  /** créditos de IA dos benefícios entram no saldo da Loja */
  store: Pick<StoreRepository, "grantAiCredits">;
  /** efeito da aprovação fora do módulo (ex.: o Balcão põe o modelo na prateleira Chancelados) */
  onApproved?: (bond: SealBond, seal: Seal) => void;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE: readonly SealBond["status"][] = ["SUGERIDA", "ACEITA", "EDITADA", "EM_REVISAO", "APROVADA", "APROVADA_PRIVADA"];
const today = (now: Date) => now.toISOString().slice(0, 10);

/** Código do resgate (voucher): estável para o mesmo resgate. */
export function redemptionCode(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return `CH-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
}

function validateBenefit(b: BenefitForm, now: Date): SealError | null {
  if (!(BENEFIT_TYPES as readonly string[]).includes(b.type)) return "VALIDACAO";
  if (b.type === "CREDITOS_IA" && (!Number.isInteger(b.credits) || (b.credits ?? 0) < 1 || (b.credits ?? 0) > BENEFIT_CREDITS_MAX)) return "VALIDACAO";
  if (b.totalQuota !== null && (!Number.isInteger(b.totalQuota) || b.totalQuota < 1)) return "VALIDACAO";
  const per = b.perUserLimit ?? 1;
  if (!Number.isInteger(per) || per < 1) return "VALIDACAO";
  if (b.expiresAt && (!ISO_DAY.test(b.expiresAt) || b.expiresAt < today(now))) return "PERIODO_INVALIDO";
  return null;
}

export function createMemorySealsRepository(deps: SealsDeps, seed: { seals?: readonly Seal[]; benefits?: readonly Benefit[]; bonds?: readonly SealBond[] } = {}): SealsRepository {
  const seals = new Map((seed.seals ?? []).map((s) => [s.id, { ...s }]));
  const benefits = new Map((seed.benefits ?? []).map((b) => [b.id, { ...b }]));
  const bonds = new Map((seed.bonds ?? []).map((b) => [b.id, { ...b }]));
  const redemptions: BenefitRedemption[] = [];
  const listeners = new Set<() => void>();
  let tick = 0;
  let seq = 0;
  const emit = () => {
    tick++;
    listeners.forEach((l) => l());
  };
  const nextId = (prefix: string) => `${prefix}-${(++seq).toString(36)}-${tick.toString(36)}`;
  const bumpUsage = (seal: Seal) => seals.set(seal.id, { ...seal, usageCount: seal.usageCount + 1 });
  const approve = (bond: SealBond, seal: Seal) => {
    bumpUsage(seal);
    deps.onApproved?.(bond, seals.get(seal.id)!);
  };
  const newBenefit = (sealId: string, b: BenefitForm, now: Date): Benefit => ({
    id: nextId("bf"), sealId, type: b.type, credits: b.type === "CREDITOS_IA" ? b.credits ?? null : null, totalQuota: b.totalQuota, perUserLimit: b.perUserLimit ?? 1,
    expiresAt: b.expiresAt || null, redeemedCount: 0, createdAt: now.toISOString(),
  });
  const userRedemptions = (benefitId: string, userId: string) => redemptions.filter((r) => r.benefitId === benefitId && r.userId === userId).length;
  const stateOf = (b: Benefit, userId: string, now: Date): BenefitState => {
    if (userRedemptions(b.id, userId) >= b.perUserLimit) return "RESGATADO";
    if (b.expiresAt && b.expiresAt < today(now)) return "EXPIRADO";
    if (b.totalQuota !== null && b.redeemedCount >= b.totalQuota) return "ESGOTADO";
    return "DISPONIVEL";
  };
  const byNewest = <T extends { createdAt: string }>(list: T[]) => list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    source: "DEMO",
    seals: () => [...seals.values()],
    seal: (id) => seals.get(id),
    benefitsOf: (sealId) => [...benefits.values()].filter((b) => b.sealId === sealId),
    allBenefits: () => [...benefits.values()],
    bonds: () => [...bonds.values()],
    bond: (id) => bonds.get(id),
    reviewQueue(actor) {
      return byNewest([...bonds.values()].filter((b) => {
        if (b.status !== "EM_REVISAO") return false;
        if (actor.profile === "ADMIN") return true;
        const seal = seals.get(b.sealId);
        return !!seal && canReviewSeal(actor, seal);
      })).reverse();
    },
    rejected(actor) {
      return byNewest([...bonds.values()].filter((b) => {
        if (b.status !== "REJEITADA" && b.status !== "RECUSADA") return false;
        if (actor.profile === "ADMIN") return true;
        const seal = seals.get(b.sealId);
        return !!seal && canReviewSeal(actor, seal);
      }));
    },
    benefitsFor(userId, now = new Date()) {
      const out: BenefitOffer[] = [];
      for (const bond of bonds.values()) {
        if (bond.status !== "APROVADA" || !bond.involvedIds.includes(userId)) continue;
        const seal = seals.get(bond.sealId);
        if (!seal) continue;
        for (const benefit of benefits.values()) if (benefit.sealId === seal.id) out.push({ benefit, seal, bond, state: stateOf(benefit, userId, now) });
      }
      return out;
    },
    redemptions: (userId) => redemptions.filter((r) => r.userId === userId).slice().reverse(),

    createSeal(actor, form, now = new Date()) {
      if (!canCreateSeal(actor.profile)) return { ok: false, reason: "ACESSO_NEGADO" };
      const name = form.name.trim();
      if (!name || name.length > SEAL_NAME_MAX) return { ok: false, reason: "VALIDACAO", field: "name" };
      if (!(SEAL_TIERS as readonly string[]).includes(form.tier) || !(POLICY_MODES as readonly string[]).includes(form.mode)) return { ok: false, reason: "VALIDACAO" };
      if (!ISO_DAY.test(form.availableFrom) || (form.availableUntil !== null && !ISO_DAY.test(form.availableUntil))) return { ok: false, reason: "PERIODO_INVALIDO", field: "period" };
      if (form.availableUntil !== null && form.availableUntil < form.availableFrom) return { ok: false, reason: "PERIODO_INVALIDO", field: "period" };
      if (form.usageLimit !== null && (!Number.isInteger(form.usageLimit) || form.usageLimit < 1)) return { ok: false, reason: "VALIDACAO", field: "usageLimit" };
      const criteria = form.criteria.filter((c, i, all) => all.findIndex((x) => x.criterion === c.criterion) === i);
      if (!criteria.length || criteria.some((c) => !(SEAL_CRITERIA as readonly string[]).includes(c.criterion))) return { ok: false, reason: "VALIDACAO", field: "criteria" };
      if (criteria.some((c) => THRESHOLD_CRITERIA.includes(c.criterion) && (!Number.isFinite(c.threshold) || (c.threshold ?? -1) < 0 || (c.criterion === "CONFORMIDADE_MIN" && (c.threshold ?? 0) > 100)))) {
        return { ok: false, reason: "VALIDACAO", field: "criteria" };
      }
      if (form.benefits.length > MAX_BENEFITS_PER_SEAL) return { ok: false, reason: "VALIDACAO", field: "benefits" };
      for (const b of form.benefits) {
        const err = validateBenefit(b, now);
        if (err) return { ok: false, reason: err, field: "benefits" };
      }
      if (name && [...seals.values()].some((s) => s.issuerId === actor.id && s.name.toLowerCase() === name.toLowerCase())) return { ok: false, reason: "VALIDACAO", field: "name" };
      const seal: Seal = {
        id: nextId("ch"), name, issuerKind: actor.profile === "EMPRESA" ? "EMPRESA" : "CHEFE", issuerId: actor.id, issuerName: actor.name,
        department: actor.profile === "EMPRESA" ? null : actor.department, tier: form.tier, excellence: form.excellence,
        availableFrom: form.availableFrom, availableUntil: form.availableUntil, usageLimit: form.usageLimit, usageCount: 0,
        policy: { mode: form.mode, criteria: criteria.map((c) => ({ criterion: c.criterion, threshold: THRESHOLD_CRITERIA.includes(c.criterion) ? c.threshold : c.criterion === "SEM_PENDENCIA" ? 0 : null })) },
        createdAt: now.toISOString(),
      };
      seals.set(seal.id, seal);
      const created = form.benefits.map((b) => newBenefit(seal.id, b, now));
      for (const b of created) benefits.set(b.id, b);
      emit();
      return { ok: true, seal, benefits: created };
    },

    publishBenefit(actor, sealId, form, now = new Date()) {
      const seal = seals.get(sealId);
      if (!seal) return { ok: false, reason: "NAO_ENCONTRADO" };
      if (!canPublishBenefit(actor, seal)) return { ok: false, reason: "ACESSO_NEGADO" };
      if ([...benefits.values()].filter((b) => b.sealId === sealId).length >= MAX_BENEFITS_PER_SEAL) return { ok: false, reason: "VALIDACAO", field: "benefits" };
      const err = validateBenefit(form, now);
      if (err) return { ok: false, reason: err, field: "benefits" };
      const benefit = newBenefit(sealId, form, now);
      benefits.set(benefit.id, benefit);
      emit();
      return { ok: true, benefit };
    },

    grant(actor, input, now = new Date()) {
      const seal = seals.get(input.sealId);
      if (!seal) return { ok: false, reason: "NAO_ENCONTRADO" };
      const allowed = input.mode === "PREMIACAO" ? canAwardSeal(actor, seal) : canGrantSeal(actor, seal);
      if (!allowed) return { ok: false, reason: "ACESSO_NEGADO" };
      if (seal.tier !== input.target.type) return { ok: false, reason: "TIER_INCOMPATIVEL" };
      const open = sealOpen(seal, now);
      if (open !== "ABERTA") return { ok: false, reason: open };
      const t = input.target;
      if ([...bonds.values()].some((b) => b.targetId === t.id && b.issuerId === seal.issuerId && ACTIVE.includes(b.status))) return { ok: false, reason: "CHANCELA_DUPLICADA" };
      const report = evaluatePolicy(seal.policy, t.facts);
      let status: SealBond["status"];
      let basis: SealBond["basis"];
      let autoIssued = false;
      if (input.mode === "POLITICA") {
        if (!report.allMet) return { ok: false, reason: "CRITERIOS_NAO_ATENDIDOS" };
        basis = "POLITICA";
        status = seal.policy.mode === "AUTO" ? "APROVADA" : "EM_REVISAO";
        autoIssued = status === "APROVADA";
      } else if (input.mode === "PREMIACAO") {
        basis = "PREMIACAO";
        status = "APROVADA";
      } else {
        basis = suggestionBasis(t);
        status = "EM_REVISAO";
      }
      const at = now.toISOString();
      const bond: SealBond = {
        id: nextId("bd"), sealId: seal.id, targetType: t.type, targetId: t.id, targetTitle: t.title, targetOwnerId: t.ownerId, involvedIds: [...t.involvedIds],
        issuerId: seal.issuerId, basis, status, confidence: input.mode === "SUGESTAO" ? input.confidence ?? null : null, report: report.results,
        requestedBy: actor.id, autoIssued, reviewNote: null, reviewedBy: status === "APROVADA" ? actor.id : null, createdAt: at, decidedAt: status === "APROVADA" ? at : null,
      };
      bonds.set(bond.id, bond);
      if (status === "APROVADA") approve(bond, seal);
      emit();
      return { ok: true, bond };
    },

    review(actor, bondId, decision, reason = "", now = new Date()) {
      const bond = bonds.get(bondId);
      if (!bond) return { ok: false, reason: "NAO_ENCONTRADO" };
      const seal = seals.get(bond.sealId);
      if (!seal || !canReviewSeal(actor, seal)) return { ok: false, reason: "ACESSO_NEGADO" };
      if (bond.status !== "EM_REVISAO") return { ok: false, reason: "ESTADO_INVALIDO" };
      if (conflictOfInterest(actor, bond)) return { ok: false, reason: "CONFLITO_DE_INTERESSE" };
      const note = reason.trim();
      if (decision === "RECUSAR" && !note) return { ok: false, reason: "MOTIVO_OBRIGATORIO" };
      if (note.length > REVIEW_REASON_MAX) return { ok: false, reason: "VALIDACAO" };
      if (decision === "APROVAR" && seal.usageLimit !== null && seal.usageCount >= seal.usageLimit) return { ok: false, reason: "LIMITE_ESGOTADO" };
      const next: SealBond = { ...bond, status: decision === "APROVAR" ? "APROVADA" : "REJEITADA", reviewNote: note || null, reviewedBy: actor.id, decidedAt: now.toISOString() };
      bonds.set(bond.id, next);
      if (next.status === "APROVADA") approve(next, seal);
      emit();
      return { ok: true, bond: next };
    },

    redeem(actor, input, now = new Date()) {
      const previous = redemptions.find((r) => r.id === input.idempotencyKey);
      if (previous) return previous.userId === actor.id ? { ok: true, redemption: previous, replay: true } : { ok: false, reason: "ACESSO_NEGADO" };
      if (!canRedeemBenefits(actor.profile)) return { ok: false, reason: "ACESSO_NEGADO" };
      const benefit = benefits.get(input.benefitId);
      const bond = bonds.get(input.bondId);
      if (!benefit || !bond) return { ok: false, reason: "NAO_ENCONTRADO" };
      if (bond.sealId !== benefit.sealId || bond.status !== "APROVADA" || !bond.involvedIds.includes(actor.id)) return { ok: false, reason: "CHANCELA_INVALIDA" };
      const state = stateOf(benefit, actor.id, now);
      if (state === "EXPIRADO") return { ok: false, reason: "BENEFICIO_EXPIRADO" };
      if (state !== "DISPONIVEL") return { ok: false, reason: "LIMITE_ESGOTADO" };
      if (benefit.type === "PONTOS_BONUS" && !deps.ledger.rules().BENEFICIO_BONUS.active) return { ok: false, reason: "BENEFICIO_INDISPONIVEL" };
      const id = input.idempotencyKey;
      let ledgerEntryId: string | null = null;
      let aiCreditEntryId: string | null = null;
      if (benefit.type === "PONTOS_BONUS") {
        const award = deps.ledger.award({ userId: actor.id, event: "BENEFICIO_BONUS", ref: { type: "resgate", id: `${benefit.id}:${actor.id}:${userRedemptions(benefit.id, actor.id) + 1}` }, note: seals.get(benefit.sealId)?.name ?? null }, now);
        if (award.ok) ledgerEntryId = award.entry.id;
      } else if (benefit.type === "CREDITOS_IA" && benefit.credits) {
        aiCreditEntryId = deps.store.grantAiCredits({ userId: actor.id, credits: benefit.credits, source: "BENEFICIO", refId: id }, now)?.id ?? null;
      }
      const redemption: BenefitRedemption = { id, benefitId: benefit.id, bondId: bond.id, userId: actor.id, code: redemptionCode(`${benefit.id}:${bond.id}:${actor.id}:${id}`), at: now.toISOString(), ledgerEntryId, aiCreditEntryId };
      redemptions.push(redemption);
      benefits.set(benefit.id, { ...benefit, redeemedCount: benefit.redeemedCount + 1 });
      emit();
      return { ok: true, redemption, replay: false };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}
