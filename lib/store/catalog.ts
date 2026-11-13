/**
 * Loja Work AI (RF42.CA04–CA06): catálogo DEMO de itens próprios da Loja — skins da Mesa (`SKIN_MESA` → `UserSkin`), créditos de IA
 * (`CREDITOS_IA` → `AiCreditLedgerEntry`) e impulso no Mural (`IMPULSO_MURAL` → `MuralEntry.boostUntil`). Modelos e kits do
 * Balcão (`MODELO_BALCAO`, `KIT_CHANCELADO`) vêm do repositório do Balcão (lib/models) e pagam o autor (RF40). Preços em DECIA
 * Points pela âncora de docs/produto/DECIA_POINTS.md §5.3 (skin básica 80 / premium 200, 10 créditos 50, impulso 24 h 120). Sem
 * dinheiro real nem gateway (CA10). Títulos e descrições vêm do i18n (`store.item.<id>.*`).
 */
import type { DeskSkin } from "@/lib/preferences/types";

export const STORE_KINDS = ["SKIN_MESA", "MODELO_BALCAO", "CREDITOS_IA", "IMPULSO_MURAL", "KIT_CHANCELADO"] as const;
export type StoreKind = (typeof STORE_KINDS)[number];
/** Itens que a própria Loja entrega (modelos e kits passam pelo Balcão). */
export type OwnStoreKind = Extract<StoreKind, "SKIN_MESA" | "CREDITOS_IA" | "IMPULSO_MURAL">;

export type StoreDelivery =
  | { type: "SKIN"; skin: DeskSkin }
  | { type: "CREDITOS_IA"; credits: number }
  | { type: "IMPULSO"; hours: number };

export interface StoreItem {
  id: string;
  kind: OwnStoreKind;
  pricePoints: number;
  /** unidades à venda; null = sem limite */
  stock: number | null;
  /** compras por pessoa; null = sem limite */
  perUserLimit: number | null;
  /** janela de venda (AAAA-MM-DD, inclusive); null = aberta */
  availableFrom: string | null;
  availableUntil: string | null;
  active: boolean;
  delivery: StoreDelivery;
}

export const STORE_CATALOG: readonly StoreItem[] = [
  { id: "skin-papel-timbrado", kind: "SKIN_MESA", pricePoints: 80, stock: null, perUserLimit: 1, availableFrom: null, availableUntil: null, active: true, delivery: { type: "SKIN", skin: "papel-timbrado" } },
  { id: "skin-blueprint", kind: "SKIN_MESA", pricePoints: 200, stock: null, perUserLimit: 1, availableFrom: null, availableUntil: null, active: true, delivery: { type: "SKIN", skin: "blueprint" } },
  { id: "creditos-ia-10", kind: "CREDITOS_IA", pricePoints: 50, stock: null, perUserLimit: null, availableFrom: null, availableUntil: null, active: true, delivery: { type: "CREDITOS_IA", credits: 10 } },
  { id: "creditos-ia-25", kind: "CREDITOS_IA", pricePoints: 110, stock: 3, perUserLimit: 1, availableFrom: null, availableUntil: "2026-12-31", active: true, delivery: { type: "CREDITOS_IA", credits: 25 } },
  { id: "impulso-24h", kind: "IMPULSO_MURAL", pricePoints: 120, stock: null, perUserLimit: null, availableFrom: null, availableUntil: null, active: true, delivery: { type: "IMPULSO", hours: 24 } },
  { id: "impulso-72h", kind: "IMPULSO_MURAL", pricePoints: 300, stock: null, perUserLimit: null, availableFrom: "2027-01-04", availableUntil: null, active: true, delivery: { type: "IMPULSO", hours: 72 } },
];

/** Skins da Mesa vendidas na Loja; as demais skins de `DESK_SKINS` são livres. */
export const PREMIUM_SKINS: readonly DeskSkin[] = STORE_CATALOG.flatMap((i) => (i.delivery.type === "SKIN" ? [i.delivery.skin] : []));
export const skinItemOf = (skin: DeskSkin) => STORE_CATALOG.find((i) => i.delivery.type === "SKIN" && i.delivery.skin === skin);

export type UnavailableReason = "INATIVO" | "ESGOTADO" | "AINDA_NAO" | "ENCERRADO" | "JA_ADQUIRIDO" | "LIMITE_POR_PESSOA";
export type Availability = { ok: true } | { ok: false; reason: UnavailableReason };

export interface AvailabilityContext {
  /** unidades restantes (null = sem limite) */
  stockLeft: number | null;
  /** compras desta pessoa deste item */
  boughtByUser: number;
  /** skins que a pessoa já tem */
  ownedSkins: readonly DeskSkin[];
}

/** Disponibilidade do item para a pessoa agora (dia em UTC). */
export function availabilityOf(item: StoreItem, ctx: AvailabilityContext, now: Date): Availability {
  if (!item.active) return { ok: false, reason: "INATIVO" };
  const today = now.toISOString().slice(0, 10);
  if (item.availableFrom && today < item.availableFrom) return { ok: false, reason: "AINDA_NAO" };
  if (item.availableUntil && today > item.availableUntil) return { ok: false, reason: "ENCERRADO" };
  if (item.delivery.type === "SKIN" && ctx.ownedSkins.includes(item.delivery.skin)) return { ok: false, reason: "JA_ADQUIRIDO" };
  if (item.stock !== null && (ctx.stockLeft ?? 0) <= 0) return { ok: false, reason: "ESGOTADO" };
  if (item.perUserLimit !== null && ctx.boughtByUser >= item.perUserLimit) return { ok: false, reason: "LIMITE_POR_PESSOA" };
  return { ok: true };
}

export type SkinState = "LIVRE" | "DESBLOQUEADA" | "BLOQUEADA";
/** Skin livre (fora da Loja), desbloqueada (comprada) ou bloqueada (à venda, ainda não comprada). */
export function skinState(skin: DeskSkin, owned: readonly DeskSkin[]): SkinState {
  if (!PREMIUM_SKINS.includes(skin)) return "LIVRE";
  return owned.includes(skin) ? "DESBLOQUEADA" : "BLOQUEADA";
}
