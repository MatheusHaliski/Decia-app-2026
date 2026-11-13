/**
 * Balcão de Modelos — repositório em memória (DEMO). A API (`GET /api/models`, `POST /api/models/offers`,
 * `POST /api/models/offers/{id}/remix`) ainda não existe e não é presumida: `ModelsRepository` é o contrato que o cliente HTTP real
 * implementará (`ModelCounterService` do README do RF40). Reutilizar um modelo pago compra a licença uma vez por pessoa — débito
 * COMPRA_MODELO de quem usa e crédito CREDITO_AUTOR_MODELO ao autor, os dois com a mesma referência (oferta + pessoa), então o
 * crédito nunca se repete para a mesma reutilização paga; grátis só conta a reutilização. O autor usando o próprio modelo não paga
 * nem conta. Os dados vivem só nesta aba do navegador — recarregar volta ao exemplo.
 */
import type { PointsEntry, PointsLedger } from "@/lib/points/ledger";
import type { LicenseGrant, ModelOffer } from "./types";

export type ReuseError = "NAO_ENCONTRADO" | "ITEM_INDISPONIVEL" | "SALDO_INSUFICIENTE" | "SEM_SALDO_PROPRIO";
export type ReuseResult =
  | { ok: true; offer: ModelOffer; license: LicenseGrant | null; charged: number; own: boolean; replay: boolean }
  | { ok: false; reason: ReuseError; balance?: number; price?: number };

export interface ReuseInput {
  offerId: string;
  /** dono do saldo de quem reutiliza; null = conta sem saldo próprio (EMPRESA) */
  userId: string | null;
  /** quem reutiliza quando não há dono de saldo (para reconhecer o autor) */
  actorId?: string;
  /** chave da ação (um clique = uma reutilização, mesmo com reenvio) */
  reuseKey: string;
}

export type LicenseResult =
  | { ok: true; offer: ModelOffer; license: LicenseGrant | null; charged: number; own: boolean }
  | { ok: false; reason: ReuseError; balance?: number; price?: number };

export type WithdrawResult = { ok: true; offer: ModelOffer } | { ok: false; reason: "NAO_ENCONTRADO" | "ACESSO_NEGADO" | "ESTADO_INVALIDO" };

export interface ModelsRepository {
  readonly source: "DEMO" | "API";
  list(): readonly ModelOffer[];
  get(id: string): ModelOffer | undefined;
  /** grava uma oferta já validada (use `offerAsModel`) */
  add(offer: ModelOffer): void;
  withdraw(offerId: string, actorId: string): WithdrawResult;
  hasLicense(offerId: string, userId: string): boolean;
  /** licenças compradas pela pessoa, da mais nova para a mais antiga */
  licenses(userId: string): readonly LicenseGrant[];
  /** conta uma visualização por pessoa e oferta */
  view(offerId: string, viewerId: string): void;
  reuse(input: ReuseInput, now?: Date): ReuseResult;
  /** compra só a licença (pela Loja): paga e credita o autor como na primeira reutilização paga, sem contar reutilização */
  acquireLicense(offerId: string, userId: string, now?: Date): LicenseResult;
  /** a chancela aprovada põe o modelo na prateleira Chancelados preservando o crédito do autor (RF40.CA07, RF39.CA11) */
  markSealed(offerId: string, sealName: string): void;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

export const licenseKeyOf = (offerId: string, userId: string) => `${offerId}:${userId}`;

/**
 * Crédito ao autor por uma reutilização paga (CREDITO_AUTOR_MODELO, valor = preço pago). Idempotente pela referência da licença:
 * chamar de novo para a mesma reutilização devolve DUPLICADO e não credita outra vez.
 */
export function creditAuthorForReuse(ledger: PointsLedger, offer: Pick<ModelOffer, "authorId" | "title">, licenseKey: string, points: number, now = new Date()) {
  return ledger.award({ userId: offer.authorId, event: "CREDITO_AUTOR_MODELO", points, ref: { type: "licenca", id: licenseKey }, note: offer.title }, now);
}

export function createMemoryModelsRepository(opts: { ledger: PointsLedger; seed?: readonly ModelOffer[] }): ModelsRepository {
  const { ledger } = opts;
  const offers = new Map<string, ModelOffer>((opts.seed ?? []).map((o) => [o.id, { ...o }]));
  const grants = new Map<string, LicenseGrant>();
  const reuses = new Map<string, { offerId: string; userId: string | null }>();
  const views = new Set<string>();
  const listeners = new Set<() => void>();
  let tick = 0;
  const emit = () => {
    tick++;
    listeners.forEach((l) => l());
  };
  const update = (id: string, patch: Partial<ModelOffer>) => {
    const cur = offers.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    offers.set(id, next);
    return next;
  };

  /** Licença paga uma vez por oferta e pessoa: débito COMPRA_MODELO de quem usa + crédito ao autor, mesma referência. */
  const ensureLicense = (offer: ModelOffer, userId: string | null, actorId: string | null, now: Date):
    | { ok: true; license: LicenseGrant | null; charged: number; own: boolean }
    | { ok: false; reason: ReuseError; balance?: number; price?: number } => {
    if (offer.status !== "ATIVA") return { ok: false, reason: "ITEM_INDISPONIVEL" };
    const who = userId ?? actorId;
    const own = who !== null && who === offer.authorId;
    if (own || offer.pricePoints === 0) return { ok: true, license: null, charged: 0, own };
    if (!userId) return { ok: false, reason: "SEM_SALDO_PROPRIO", price: offer.pricePoints };
    const key = licenseKeyOf(offer.id, userId);
    const existing = grants.get(key);
    if (existing) return { ok: true, license: existing, charged: 0, own };
    const debit = ledger.spend({ userId, event: "COMPRA_MODELO", points: offer.pricePoints, ref: { type: "licenca", id: key }, note: offer.title }, now);
    if (!debit.ok && debit.reason === "SALDO_INSUFICIENTE") return { ok: false, reason: "SALDO_INSUFICIENTE", balance: ledger.balance(userId), price: offer.pricePoints };
    // DUPLICADO: a licença já foi paga neste razão (repositório recriado) — não cobra de novo
    const debitEntry: PointsEntry | null = debit.ok ? debit.entry : ledger.entries(userId).find((e) => e.idempotencyKey === `COMPRA_MODELO:licenca:${key}:${userId}`) ?? null;
    const credit = creditAuthorForReuse(ledger, offer, key, offer.pricePoints, now);
    if (credit.ok) update(offer.id, { pointsEarned: offer.pointsEarned + offer.pricePoints });
    const license: LicenseGrant = { offerId: offer.id, userId, pricePaid: offer.pricePoints, at: now.toISOString(), debitEntryId: debitEntry?.id ?? null, creditEntryId: credit.ok ? credit.entry.id : null };
    grants.set(key, license);
    return { ok: true, license, charged: debit.ok ? offer.pricePoints : 0, own };
  };

  return {
    source: "DEMO",
    list: () => [...offers.values()],
    get: (id) => offers.get(id),
    add(offer) {
      offers.set(offer.id, { ...offer });
      emit();
    },
    withdraw(offerId, actorId) {
      const o = offers.get(offerId);
      if (!o) return { ok: false, reason: "NAO_ENCONTRADO" };
      if (o.authorId !== actorId) return { ok: false, reason: "ACESSO_NEGADO" };
      if (o.status !== "ATIVA") return { ok: false, reason: "ESTADO_INVALIDO" };
      const next = update(offerId, { status: "RETIRADA" })!;
      emit();
      return { ok: true, offer: next };
    },
    hasLicense: (offerId, userId) => grants.has(licenseKeyOf(offerId, userId)),
    licenses: (userId) => [...grants.values()].filter((g) => g.userId === userId).sort((a, b) => (a.at < b.at ? 1 : -1)),
    view(offerId, viewerId) {
      const key = `${offerId}:${viewerId}`;
      const o = offers.get(offerId);
      if (!o || views.has(key) || o.authorId === viewerId) return;
      views.add(key);
      update(offerId, { viewsCount: o.viewsCount + 1 });
      emit();
    },
    reuse(input, now = new Date()) {
      const offer = offers.get(input.offerId);
      if (!offer) return { ok: false, reason: "NAO_ENCONTRADO" };
      const done = reuses.get(input.reuseKey);
      if (done && done.offerId === offer.id && done.userId === input.userId) {
        return { ok: true, offer, license: input.userId ? grants.get(licenseKeyOf(offer.id, input.userId)) ?? null : null, charged: 0, own: false, replay: true };
      }
      const paid = ensureLicense(offer, input.userId, input.actorId ?? null, now);
      if (!paid.ok) return paid;
      reuses.set(input.reuseKey, { offerId: offer.id, userId: input.userId });
      const current = offers.get(offer.id)!;
      const next = update(offer.id, { reuseCount: current.reuseCount + (paid.own ? 0 : 1) })!;
      emit();
      return { ok: true, offer: next, license: paid.license, charged: paid.charged, own: paid.own, replay: false };
    },
    acquireLicense(offerId, userId, now = new Date()) {
      const offer = offers.get(offerId);
      if (!offer) return { ok: false, reason: "NAO_ENCONTRADO" };
      const paid = ensureLicense(offer, userId, null, now);
      if (!paid.ok) return paid;
      emit();
      return { ok: true, offer: offers.get(offerId)!, license: paid.license, charged: paid.charged, own: paid.own };
    },
    markSealed(offerId, sealName) {
      if (!update(offerId, { shelf: "CHANCELADO", sealName })) return;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}
