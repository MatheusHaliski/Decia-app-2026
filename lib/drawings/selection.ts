export type DrawingSelectionMode = "EDIT" | "VIEW";

export interface DrawingEditScope {
  mode: DrawingSelectionMode;
  layerId?: string;
  regionIds?: readonly string[];
  objectPath?: readonly string[];
}

export interface DrawingEditTarget {
  layerId: string;
  /** Todas as regiões tocadas pela geometria, não somente a célula de origem ou o centro. */
  regionIds: readonly string[];
  /** Caminho da hierarquia, do objeto-raiz até a parte selecionável. */
  objectPath: readonly string[];
}

/** Manual edits and AI patches must use the same intersection check before mutating any target. */
export function canEditDrawingTarget(scope: DrawingEditScope, target: DrawingEditTarget): boolean {
  if (scope.mode !== "EDIT") return false;
  if (scope.layerId && scope.layerId !== target.layerId) return false;
  if (scope.regionIds && (!target.regionIds.length || target.regionIds.some((id) => !scope.regionIds!.includes(id)))) return false;
  if (scope.objectPath && !scope.objectPath.every((id, index) => target.objectPath[index] === id)) return false;
  return true;
}

/** Reject a patch atomically if any selected target escapes the active layer/region/object scope. */
export function assertDrawingTargetsEditable(scope: DrawingEditScope, targets: readonly DrawingEditTarget[]): void {
  if (!targets.length || targets.some((target) => !canEditDrawingTarget(scope, target))) {
    throw new Error("Drawing patch exceeds the active edit scope");
  }
}
