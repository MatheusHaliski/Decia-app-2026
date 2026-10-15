/**
 * Camadas de uma peça (ex.: pintura de Monet: camada profunda = natureza; camada próxima = pessoas e objetos).
 * `depth` 0 é a mais profunda. A edição vale só na camada ativa; as demais ficam somente leitura.
 */
import { assertDrawingTargetsEditable, canEditDrawingTarget, type DrawingEditTarget } from "../drawings/selection";

export interface PieceLayer {
  id: string;
  name: string;
  depth: number;
  visible: boolean;
  locked: boolean;
}

export interface LayerStack {
  layers: readonly PieceLayer[];
  activeLayerId: string;
}

export function createLayerStack(layers: readonly Omit<PieceLayer, "visible" | "locked">[]): LayerStack {
  if (!layers.length) throw new Error("A peça precisa de ao menos uma camada");
  if (new Set(layers.map((l) => l.id)).size !== layers.length) throw new Error("Ids de camada duplicados");
  const sorted = [...layers].sort((a, b) => a.depth - b.depth).map((l) => ({ ...l, visible: true, locked: false }));
  return { layers: sorted, activeLayerId: sorted[sorted.length - 1]!.id };
}

export function switchActiveLayer(stack: LayerStack, layerId: string): LayerStack {
  const layer = stack.layers.find((l) => l.id === layerId);
  if (!layer) throw new Error("Camada inexistente");
  if (layer.locked) throw new Error("Camada travada");
  return { ...stack, activeLayerId: layerId };
}

export function setLayerLocked(stack: LayerStack, layerId: string, locked: boolean): LayerStack {
  if (!stack.layers.some((l) => l.id === layerId)) throw new Error("Camada inexistente");
  const layers = stack.layers.map((l) => (l.id === layerId ? { ...l, locked } : l));
  const active = layers.find((l) => l.id === stack.activeLayerId);
  const fallback = layers.find((l) => !l.locked);
  return { layers, activeLayerId: active && !active.locked ? active.id : (fallback?.id ?? stack.activeLayerId) };
}

/** Objetos só podem ser alterados quando pertencem à camada ativa (mesma checagem usada por edição manual e patches de IA). */
export function canEditInActiveLayer(stack: LayerStack, target: DrawingEditTarget): boolean {
  const layer = stack.layers.find((l) => l.id === target.layerId);
  if (!layer || layer.locked) return false;
  return canEditDrawingTarget({ mode: "EDIT", layerId: stack.activeLayerId }, target);
}

export function assertEditableInActiveLayer(stack: LayerStack, targets: readonly DrawingEditTarget[]): void {
  if (targets.some((t) => stack.layers.find((l) => l.id === t.layerId)?.locked)) throw new Error("Camada travada");
  assertDrawingTargetsEditable({ mode: "EDIT", layerId: stack.activeLayerId }, targets);
}
