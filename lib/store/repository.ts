/**
 * Loja Work AI — repositório em memória (DEMO). A API da Loja (`GET /api/store`, `POST /api/store/items/{id}/purchase`) ainda não
 * existe e não é presumida: `StoreRepository` é o contrato que o cliente HTTP real implementará. A compra segue o fluxo do README
 * do RF42 (`StoreService.purchase`): item disponível (senão ITEM_INDISPONIVEL) → débito COMPRA_LOJA no razão de DECIA Points
 * (`deciaPoints.spend`, senão SALDO_INSUFICIENTE) → entrega (skin desbloqueada, créditos de IA no saldo próprio, impulso no
 * Mural) → registro da compra. A chave de idempotência da confirmação impede compra dupla (clique duplo, reenvio). Os dados vivem
 * só nesta aba do navegador — recarregar volta ao exemplo.
 */
import type { DeskSkin } from "@/lib/preferences/types";
import { DEMO_PAST_PURCHASE } from "@/lib/points/demo";
import type { PointsLedger } from "@/lib/points/ledger";
import type { BoostTarget } from "./boost";
import { availabilityOf, STORE_CATALOG, type Availability, type OwnStoreKind, type StoreDelivery, type StoreItem, type UnavailableReason } from "./catalog";

export interface StorePurchase {
  id: string;
  buyerId: string;
  itemId: string;
  kind: OwnStoreKind;
  pricePaid: number;
  at: string;
  /** lançamento COMPRA_LOJA no razão (null em item gratuito) */
  ledgerEntryId: string | null;
  delivery: StoreDelivery;
  /** impulso: o item impulsionado e até quando */
  boost: { target: BoostTarget; until: string } | null;
  status: "CONCLUIDA";
}

export interface AiCreditEntry {
  id: string;
  userId: string;
  delta: number;
  source: "COMPRA" | "BENEFICIO";
  /** compra ou resgate de benefício que gerou os créditos */
  refId: string;
  at: string;
}

export interface MuralBoost {
  id: string;
  userId: string;
  target: BoostTarget;
  until: string;
  purchaseId: string;
}

export type PurchaseError = "NAO_ENCONTRADO" | "ITEM_INDISPONIVEL" | "SALDO_INSUFICIENTE" | "ALVO_OBRIGATORIO" | "DUPLICADO";
export type PurchaseResult =
  | { ok: true; purchase: StorePurchase; replay: boolean }
  | { ok: false; reason: PurchaseError; detail?: UnavailableReason; balance?: number; price?: number };

export interface PurchaseInput {
  buyerId: string;
  itemId: string;
  /** chave da confirmação (uma por abertura do diálogo de compra) */
  idempotencyKey: string;
  boostTarget?: BoostTarget | null;
}

export interface StoreRepository {
  readonly source: "DEMO" | "API";
  catalog(): readonly StoreItem[];
  item(id: string): StoreItem | undefined;
  /** unidades restantes (null = sem limite) */
  stockLeft(itemId: string): number | null;
  availability(itemId: string, userId: string | null, now?: Date): Availability;
  /** compras da pessoa, da mais nova para a mais antiga */
  purchases(userId: string): readonly StorePurchase[];
  ownedSkins(userId: string): readonly DeskSkin[];
  aiCredits(userId: string): number;
  aiCreditEntries(userId: string): readonly AiCreditEntry[];
  /** impulsos ainda valendo */
  boosts(userId: string, now?: Date): readonly MuralBoost[];
  purchase(input: PurchaseInput, now?: Date): PurchaseResult;
  /** créditos de IA vindos de fora da Loja (benefício de chancela, RF39.CA10) — idempotente pela referência */
  grantAiCredits(input: { userId: string; credits: number; source: "BENEFICIO"; refId: string }, now?: Date): AiCreditEntry | null;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
}

export interface StoreSeed {
  purchases?: readonly StorePurchase[];
  aiCredits?: readonly AiCreditEntry[];
}

const HOUR_MS = 3_600_000;
const purchaseIdOf = (key: string) => `cp-${key}`;

export function createMemoryStoreRepository(opts: { ledger: PointsLedger; catalog?: readonly StoreItem[]; seed?: StoreSeed }): StoreRepository {
  const { ledger } = opts;
  const catalog = opts.catalog ?? STORE_CATALOG;
  const purchases: StorePurchase[] = [...(opts.seed?.purchases ?? [])];
  const credits: AiCreditEntry[] = [...(opts.seed?.aiCredits ?? [])];
  const skins = new Map<string, Set<DeskSkin>>();
  const sold = new Map<string, number>();
  for (const p of purchases) {
    sold.set(p.itemId, (sold.get(p.itemId) ?? 0) + 1);
    if (p.delivery.type === "SKIN") (skins.get(p.buyerId) ?? skins.set(p.buyerId, new Set()).get(p.buyerId)!).add(p.delivery.skin);
  }
  const listeners = new Set<() => void>();
  let tick = 0;
  let seq = 0;
  const emit = () => {
    tick++;
    listeners.forEach((l) => l());
  };
  const item = (id: string) => catalog.find((i) => i.id === id);
  const stockLeft = (id: string) => {
    const it = item(id);
    if (!it || it.stock === null) return null;
    return Math.max(0, it.stock - (sold.get(id) ?? 0));
  };
  const ownedSkins = (userId: string) => [...(skins.get(userId) ?? [])];
  const availability = (id: string, userId: string | null, now = new Date()): Availability => {
    const it = item(id);
    if (!it) return { ok: false, reason: "INATIVO" };
    return availabilityOf(it, {
      stockLeft: stockLeft(id),
      boughtByUser: userId ? purchases.filter((p) => p.buyerId === userId && p.itemId === id).length : 0,
      ownedSkins: userId ? ownedSkins(userId) : [],
    }, now);
  };
  const byNewest = <T extends { at: string }>(list: T[]) => list.slice().sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    source: "DEMO",
    catalog: () => catalog,
    item,
    stockLeft,
    availability,
    purchases: (userId) => byNewest(purchases.filter((p) => p.buyerId === userId)),
    ownedSkins,
    aiCredits: (userId) => credits.reduce((s, c) => (c.userId === userId ? s + c.delta : s), 0),
    aiCreditEntries: (userId) => byNewest(credits.filter((c) => c.userId === userId)),
    boosts(userId, now = new Date()) {
      const t = now.toISOString();
      return purchases
        .filter((p) => p.buyerId === userId && p.boost && p.boost.until > t)
        .map((p) => ({ id: `mb-${p.id}`, userId, target: p.boost!.target, until: p.boost!.until, purchaseId: p.id }));
    },
    purchase(input, now = new Date()) {
      const it = item(input.itemId);
      if (!it) return { ok: false, reason: "NAO_ENCONTRADO" };
      const id = purchaseIdOf(input.idempotencyKey);
      const previous = purchases.find((p) => p.id === id);
      if (previous) return previous.buyerId === input.buyerId ? { ok: true, purchase: previous, replay: true } : { ok: false, reason: "DUPLICADO" };
      const av = availability(it.id, input.buyerId, now);
      if (!av.ok) return { ok: false, reason: "ITEM_INDISPONIVEL", detail: av.reason };
      if (it.delivery.type === "IMPULSO" && !input.boostTarget) return { ok: false, reason: "ALVO_OBRIGATORIO" };
      let ledgerEntryId: string | null = null;
      if (it.pricePoints > 0) {
        const debit = ledger.spend({ userId: input.buyerId, event: "COMPRA_LOJA", points: it.pricePoints, ref: { type: "compra", id }, note: it.id }, now);
        if (!debit.ok) {
          if (debit.reason === "SALDO_INSUFICIENTE") return { ok: false, reason: "SALDO_INSUFICIENTE", balance: ledger.balance(input.buyerId), price: it.pricePoints };
          return { ok: false, reason: "DUPLICADO" };
        }
        ledgerEntryId = debit.entry.id;
      }
      const at = now.toISOString();
      // entrega na mesma "transação": nada abaixo falha depois do débito
      let boost: StorePurchase["boost"] = null;
      if (it.delivery.type === "SKIN") (skins.get(input.buyerId) ?? skins.set(input.buyerId, new Set()).get(input.buyerId)!).add(it.delivery.skin);
      else if (it.delivery.type === "CREDITOS_IA") credits.push({ id: `ac-${++seq}`, userId: input.buyerId, delta: it.delivery.credits, source: "COMPRA", refId: id, at });
      else boost = { target: input.boostTarget!, until: new Date(now.getTime() + it.delivery.hours * HOUR_MS).toISOString() };
      sold.set(it.id, (sold.get(it.id) ?? 0) + 1);
      const purchase: StorePurchase = { id, buyerId: input.buyerId, itemId: it.id, kind: it.kind, pricePaid: it.pricePoints, at, ledgerEntryId, delivery: it.delivery, boost, status: "CONCLUIDA" };
      purchases.push(purchase);
      emit();
      return { ok: true, purchase, replay: false };
    },
    grantAiCredits(input, now = new Date()) {
      if (!Number.isInteger(input.credits) || input.credits <= 0) return null;
      const existing = credits.find((c) => c.refId === input.refId && c.userId === input.userId);
      if (existing) return existing;
      const entry: AiCreditEntry = { id: `ac-${++seq}`, userId: input.userId, delta: input.credits, source: input.source, refId: input.refId, at: now.toISOString() };
      credits.push(entry);
      emit();
      return entry;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
  };
}

/** Registro da compra de exemplo do "Pessoa Exemplo" (o débito já está no histórico DEMO do razão, lib/points/demo). */
export function demoStoreSeed(now = new Date()): StoreSeed {
  const p = DEMO_PAST_PURCHASE;
  const at = new Date(now.getTime() - p.daysAgo * 86_400_000).toISOString();
  const id = p.purchaseId;
  return {
    purchases: [{ id, buyerId: p.holderId, itemId: p.itemId, kind: "CREDITOS_IA", pricePaid: p.points, at, ledgerEntryId: null, delivery: { type: "CREDITOS_IA", credits: p.credits }, boost: null, status: "CONCLUIDA" }],
    aiCredits: [{ id: "ac-demo-1", userId: p.holderId, delta: p.credits, source: "COMPRA", refId: id, at }],
  };
}
