/**
 * WIREFRAME: objeto ou pessoa em versão "esqueleto" (só o traçado inicial). Preenchimento, detalhes e continuação
 * ficam a cargo do usuário. A IA pode sugerir um elemento como FILLED ou WIREFRAME; wireframe nunca traz preenchimento.
 */
export const RENDER_MODES = ["FILLED", "WIREFRAME"] as const;
export type RenderMode = (typeof RENDER_MODES)[number];
export const SUBJECT_KINDS = ["object", "person"] as const;
export type SubjectKind = (typeof SUBJECT_KINDS)[number];

export interface SuggestedElement {
  id: string;
  kind: SubjectKind | "shape";
  name: string;
  mode: RenderMode;
  stroke: string;
  strokeWidth: number;
  fill?: string;
  /** Detalhes (sombra, textura…) que o usuário deve completar */
  details?: readonly string[];
  /** Em wireframe: pendências para o usuário moldar */
  pendingForUser?: readonly string[];
}

const WIREFRAME_PENDING = ["preenchimento", "detalhes", "acabamento"] as const;

/** Converte a sugestão em wireframe: remove preenchimento e detalhes e lista o que cabe ao usuário. */
export function toWireframe(el: SuggestedElement): SuggestedElement {
  const { fill: _fill, details: _details, ...rest } = el;
  void _fill;
  void _details;
  return { ...rest, mode: "WIREFRAME", pendingForUser: [...WIREFRAME_PENDING] };
}

export function isWireframe(el: SuggestedElement): boolean {
  return el.mode === "WIREFRAME" && el.fill === undefined && !el.details?.length;
}

/** O usuário completa o wireframe; o elemento passa a FILLED e deixa de ter pendências. */
export function completeWireframe(el: SuggestedElement, fill: string, details: readonly string[] = []): SuggestedElement {
  if (el.mode !== "WIREFRAME") throw new Error("Elemento não é wireframe");
  const { pendingForUser: _p, ...rest } = el;
  void _p;
  return { ...rest, mode: "FILLED", fill, details };
}
