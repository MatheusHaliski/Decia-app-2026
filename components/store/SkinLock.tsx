"use client";
/**
 * Estado das skins da Mesa no seletor das preferências (RF42.CA04 → `UserSkin`; RF38: skin premium sem compra fica bloqueada com
 * atalho para a Loja). Só vale para quem tem conta de pontos no laboratório (a ficha DP aparece): conta real sem API de pontos e a
 * conta EMPRESA continuam com todas as skins. A skin já em uso nunca é bloqueada (quem a escolheu antes não perde a Mesa).
 */
import { useI18n } from "@/lib/i18n/useI18n";
import { pointsHolderOf } from "@/lib/points/identity";
import type { DeskSkin } from "@/lib/preferences/types";
import { skinItemOf, skinState } from "@/lib/store/catalog";
import { useOwnedSkins } from "@/lib/store/useStore";
import { useViewer } from "@/lib/viewer/ViewerProvider";

export function useDeskSkinLock(): (skin: DeskSkin, current: DeskSkin) => { disabled?: boolean; hint?: string } {
  const { t } = useI18n();
  const { user } = useViewer();
  const holder = user.points !== null ? pointsHolderOf(user) : null;
  const owned = useOwnedSkins(holder);
  return (skin, current) => {
    if (!holder) return {};
    const state = skinState(skin, owned);
    if (state === "LIVRE") return {};
    if (state === "DESBLOQUEADA") return { hint: t("store.skin.unlocked") };
    if (skin === current) return { hint: t("store.skin.lockedCurrent") };
    return { disabled: true, hint: t("store.skin.locked", { price: skinItemOf(skin)?.pricePoints ?? 0 }) };
  };
}
