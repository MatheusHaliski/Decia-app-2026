/**
 * Textos de recusa e de reserva do Drawings 2D, montados a partir dos fatos do motor (nunca de suposição): quem reservou,
 * até quando, qual região e camada. Sem DOM: recebe `t` e o formatador de hora da tela. Se o dono da reserva não for
 * conhecido, diz "outra pessoa" — o conflito é explicado sem revelar conteúdo (RF66.CA02).
 */
import { ALL_LAYERS, regionsOverlap, type RegionLock } from "@/lib/pieces/collab";
import type { Denial, SharedState } from "./engine";
import type { RefusalReason } from "./ghost";
import { layerById, regionById, shapeById } from "./model";

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface ExplainContext {
  t: Translate;
  /** hora curta (hh:mm) no idioma da tela */
  time: (ms: number) => string;
  state: SharedState;
  meId: string;
}

export const regionNames = (state: SharedState, ids: readonly string[]) => ids.map((id) => regionById(state.doc, id)?.name ?? id).join(", ");

export function layerName(ctx: Pick<ExplainContext, "t" | "state">, layerId: string | undefined): string {
  if (!layerId) return "";
  if (layerId === ALL_LAYERS) return ctx.t("drw2d.allLayers");
  return layerById(ctx.state.doc, layerId)?.name ?? layerId;
}

/** Nome de quem reservou: "você", o nome registrado na peça ou null (desconhecido). */
export function ownerName(ctx: Pick<ExplainContext, "t" | "state" | "meId">, ownerId: string): string | null {
  if (ownerId === ctx.meId) return ctx.t("drw2d.you");
  return ctx.state.participants[ownerId]?.name ?? null;
}

/** "Região Fachada reservada por Ana até 14:05" (com a região conflitante quando é ancestral ou descendente). */
export function explainConflict(ctx: ExplainContext, requested: readonly string[], layerId: string, lock: RegionLock): string {
  const owner = ownerName(ctx, lock.ownerId);
  const until = ctx.time(lock.expiresAt);
  const layer = layerName(ctx, lock.layerId === ALL_LAYERS ? ALL_LAYERS : layerId);
  const same = lock.regionIds.filter((r) => requested.includes(r));
  const region = regionNames(ctx.state, same.length ? same : requested.filter((q) => lock.regionIds.some((r) => regionsOverlap(r, q))));
  const other = regionNames(ctx.state, lock.regionIds.filter((r) => requested.some((q) => regionsOverlap(r, q)) && !requested.includes(r)));
  if (!owner) return ctx.t("drw2d.deny.reservedAnon", { region, layer, until });
  if (!same.length && other) return ctx.t("drw2d.deny.reservedRelated", { region, other, owner, layer, until });
  return ctx.t("drw2d.deny.reserved", { region, owner, layer, until });
}

export function explainDenial(d: Denial, ctx: ExplainContext): string {
  const { t, state } = ctx;
  const shapeName = (id: string) => shapeById(state.doc, id)?.name ?? id;
  switch (d.code) {
    case "REGIAO_RESERVADA":
      return explainConflict(ctx, d.regionIds, d.layerId, d.lock);
    case "SEM_RESERVA":
      return t("drw2d.deny.SEM_RESERVA", { region: regionNames(state, d.regionIds), layer: layerName(ctx, d.layerId) });
    case "RESERVA_EXPIRADA":
      return t("drw2d.deny.RESERVA_EXPIRADA", { region: regionNames(state, d.regionIds), layer: layerName(ctx, d.layerId) });
    case "REVISAO_DESATUALIZADA":
      return t("drw2d.deny.REVISAO_DESATUALIZADA", { name: shapeName(d.shapeId), expected: d.expected, actual: d.actual });
    case "OBJETO_INEXISTENTE":
    case "OBJETO_DUPLICADO":
    case "GEOMETRIA_INVALIDA":
    case "FORA_DA_FOLHA":
    case "SEM_REGIAO":
      return t(`drw2d.deny.${d.code}`, { name: shapeName(d.shapeId) });
    case "AUTORIZACAO":
      return t(`drw2d.deny.auth.${d.reason}`, { layer: layerName(ctx, d.layerId) });
    case "LEASE":
      return t(`drw2d.deny.lease.${d.reason}`);
    case "LIMITE_DE_RESERVAS":
      return t("drw2d.deny.LIMITE_DE_RESERVAS", { max: d.max });
    case "REGIAO_INEXISTENTE":
    case "CAMADA_INEXISTENTE":
    case "PRAZO_INVALIDO":
    case "SEM_ALTERACAO":
      return t(`drw2d.deny.${d.code}`);
  }
}

export function explainRefusal(r: RefusalReason, ctx: ExplainContext): string {
  const { t } = ctx;
  switch (r.code) {
    case "POLITICA":
      return t("drw2d.refused.POLITICA", { from: r.from, to: r.to });
    case "REVISAO":
      return t("drw2d.refused.REVISAO");
    case "REGIAO_RESERVADA": {
      const owner = ownerName(ctx, r.lock.ownerId);
      const region = regionNames(ctx.state, r.lock.regionIds);
      return owner
        ? t("drw2d.refused.REGIAO_RESERVADA", { region, owner, until: ctx.time(r.lock.expiresAt) })
        : t("drw2d.refused.REGIAO_RESERVADA_ANON", { region, until: ctx.time(r.lock.expiresAt) });
    }
    case "CAMADA":
      return t("drw2d.refused.CAMADA", { layer: layerName(ctx, r.layerId) });
    case "OBJETO_REMOVIDO":
      return t("drw2d.refused.OBJETO_REMOVIDO");
    case "LOTE":
      return t("drw2d.refused.LOTE");
    case "GRAVACAO":
      return t("drw2d.refused.GRAVACAO", { reason: explainDenial(r.denial, ctx) });
  }
}

/** "Ana · Esquadrias · até 14:05" — estado da reserva sempre em texto (cor é só reforço). */
export function lockSummary(lock: RegionLock, ctx: ExplainContext): string {
  return ctx.t("drw2d.lock.summary", { owner: ownerName(ctx, lock.ownerId) ?? ctx.t("drw2d.someone"), layer: layerName(ctx, lock.layerId), until: ctx.time(lock.expiresAt) });
}
