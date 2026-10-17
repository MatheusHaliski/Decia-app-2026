/**
 * Porta única de autorização de patch em Drawings (RF57/RF65/RF66; auditoria de 17/10/2026). Antes, escopo da seleção
 * (`drawings/selection`), camada ativa (`layers`) e reserva de região (`collab`) eram checados separadamente e nunca em
 * conjunto: um patch podia passar pelo escopo e ignorar a reserva de outro participante. Aqui as três regras valem para
 * edição manual e para IA, de forma atômica (um alvo fora → patch inteiro recusado), com o motivo para a UI.
 */
import { canEditDrawingTarget, type DrawingEditScope, type DrawingEditTarget } from "../drawings/selection";
import { canEditRegions, type RegionLock } from "./collab";
import type { LayerStack } from "./layers";

export type PatchOrigin = "MANUAL" | "IA";
export type PatchDenial = "SEM_ALVOS" | "CAMADA_INEXISTENTE" | "CAMADA_TRAVADA" | "CAMADA_OCULTA" | "CAMADA_INATIVA" | "FORA_DA_SELECAO" | "IA_SEM_SELECAO" | "REGIAO_RESERVADA";

export interface PatchRequest {
  pieceId: string;
  actorId: string;
  origin: PatchOrigin;
  scope: DrawingEditScope;
  targets: readonly DrawingEditTarget[];
}

export type PatchVerdict = { ok: true } | { ok: false; reason: PatchDenial; target?: DrawingEditTarget };

/**
 * IA precisa de uma seleção concreta (objeto ou regiões): escopo só com modo/camada autorizaria alterar a camada
 * inteira, o que contraria "Assistido aplica só na seleção" (lib/ai/autonomy).
 */
export const aiScopeIsBounded = (scope: DrawingEditScope) => !!(scope.objectPath?.length || scope.regionIds?.length);

export function authorizePatch(stack: LayerStack, locks: readonly RegionLock[], req: PatchRequest, now: number): PatchVerdict {
  if (!req.targets.length) return { ok: false, reason: "SEM_ALVOS" };
  if (req.origin === "IA" && !aiScopeIsBounded(req.scope)) return { ok: false, reason: "IA_SEM_SELECAO" };
  for (const target of req.targets) {
    const layer = stack.layers.find((l) => l.id === target.layerId);
    if (!layer) return { ok: false, reason: "CAMADA_INEXISTENTE", target };
    if (layer.locked) return { ok: false, reason: "CAMADA_TRAVADA", target };
    // não se altera o que não se vê: camada oculta precisa ser exibida antes
    if (!layer.visible) return { ok: false, reason: "CAMADA_OCULTA", target };
    if (target.layerId !== stack.activeLayerId) return { ok: false, reason: "CAMADA_INATIVA", target };
    if (!canEditDrawingTarget(req.scope, target)) return { ok: false, reason: "FORA_DA_SELECAO", target };
    if (!canEditRegions(locks, { pieceId: req.pieceId, layerId: target.layerId, regionIds: target.regionIds, userId: req.actorId }, now)) {
      return { ok: false, reason: "REGIAO_RESERVADA", target };
    }
  }
  return { ok: true };
}
