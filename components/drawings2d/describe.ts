/**
 * Texto de cada acontecimento da sessão para o anúncio `aria-live` e o toast: quem fez, o quê, até quando — sempre a
 * partir dos fatos do motor (D-12).
 */
import type { LogEntry, Label } from "@/lib/drawings2d/engine";
import { explainDenial, layerName, lockSummary, ownerName, regionNames, type ExplainContext } from "@/lib/drawings2d/explain";
import type { SessionEvent } from "@/lib/drawings2d/session";

export type Tone = "info" | "erro" | "aviso" | "sucesso";

export const labelText = (ctx: Pick<ExplainContext, "t">, label: Label) => ctx.t(label.key, label.vars as Record<string, string | number> | undefined);

export function describeEntry(entry: LogEntry, ctx: ExplainContext): string {
  const who = ownerName(ctx, entry.actorId) ?? ctx.t("drw2d.someone");
  const regions = regionNames(ctx.state, entry.regionIds ?? []);
  const layer = layerName(ctx, entry.layerId);
  switch (entry.kind) {
    case "PATCH": {
      const what = entry.label ? labelText(ctx, entry.label) : "";
      const key = entry.undo === "DESFAZER" ? "drw2d.log.undo" : entry.undo === "REFAZER" ? "drw2d.log.redo" : entry.origin === "IA" ? (entry.aiMode === "APLICADA" ? "drw2d.log.aiApplied" : "drw2d.log.aiAccepted") : "drw2d.log.patch";
      return ctx.t(key, { who, what, revision: entry.revision });
    }
    case "RESERVA":
      return ctx.t(entry.auto ? "drw2d.log.reserveAuto" : "drw2d.log.reserve", { who, regions, layer, until: ctx.time(entry.expiresAt ?? 0), token: entry.token ?? 0 });
    case "RENOVACAO":
      return ctx.t("drw2d.log.renew", { who, regions, until: ctx.time(entry.expiresAt ?? 0) });
    case "LIBERACAO":
      return ctx.t("drw2d.log.release", { who, regions, layer });
    case "EXPIRACAO":
      return ctx.t("drw2d.log.expired", { who, regions, layer });
    case "SAIDA":
      return ctx.t("drw2d.log.left", { who, regions });
    case "RESTAURACAO":
      return ctx.t("drw2d.log.restored", { who });
  }
}

export function describeEvent(e: SessionEvent, ctx: ExplainContext): { text: string; tone: Tone; toast: boolean } {
  switch (e.type) {
    case "negado":
      return { text: ctx.t(`drw2d.event.denied.${e.action}`, { reason: explainDenial(e.denial, ctx) }), tone: "erro", toast: true };
    case "reservou":
      if (e.already) return { text: ctx.t("drw2d.event.already", { summary: lockSummary(e.lock, ctx), regions: regionNames(ctx.state, e.lock.regionIds) }), tone: "info", toast: false };
      return { text: ctx.t("drw2d.event.reserved", { regions: regionNames(ctx.state, e.lock.regionIds), layer: layerName(ctx, e.lock.layerId), until: ctx.time(e.lock.expiresAt), token: e.lock.token ?? 0 }), tone: "sucesso", toast: false };
    case "renovou":
      return { text: ctx.t(e.auto ? "drw2d.event.renewedAuto" : "drw2d.event.renewed", { regions: regionNames(ctx.state, e.lock.regionIds), until: ctx.time(e.lock.expiresAt) }), tone: "info", toast: false };
    case "liberou":
      return { text: ctx.t("drw2d.event.released", { regions: regionNames(ctx.state, e.lock.regionIds) }), tone: "info", toast: false };
    case "expirou": {
      const mine = e.lock.ownerId === ctx.meId;
      const who = ownerName(ctx, e.lock.ownerId) ?? ctx.t("drw2d.someone");
      return { text: ctx.t(mine ? "drw2d.event.expiredMine" : "drw2d.event.expired", { who, regions: regionNames(ctx.state, e.lock.regionIds), layer: layerName(ctx, e.lock.layerId) }), tone: "aviso", toast: mine };
    }
    case "aplicado": {
      const what = labelText(ctx, e.label);
      const auto = e.autoLocks.length ? ` ${ctx.t("drw2d.event.autoReserved", { regions: regionNames(ctx.state, e.autoLocks.flatMap((l) => l.regionIds)), until: ctx.time(e.autoLocks[0]!.expiresAt) })}` : "";
      const key = e.undo === "DESFAZER" ? "drw2d.event.undone" : e.undo === "REFAZER" ? "drw2d.event.redone" : "drw2d.event.applied";
      return { text: ctx.t(key, { what, revision: e.revision }) + auto, tone: "sucesso", toast: false };
    }
    case "remoto":
      return { text: describeEntry(e.entry, ctx), tone: "info", toast: false };
    case "restaurado":
      return { text: ctx.t("drw2d.event.restored"), tone: "info", toast: true };
  }
}
