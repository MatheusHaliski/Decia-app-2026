export const DRAWING_TAXONOMY = {
  subject: ["portrait", "landscape", "still-life", "figure-study", "narrative", "abstract", "other"],
  medium: ["graphite", "charcoal", "ink", "watercolor", "digital", "other"],
  technique: ["contour", "gesture", "hatching", "cross-hatching", "stippling", "wash", "blending", "erasure", "other"],
  formalElement: ["line", "shape", "form", "color", "value", "texture", "space"],
  composition: ["balance", "rhythm", "focal-point", "proportion", "movement", "symmetry", "framing", "other"],
  perspective: ["linear", "atmospheric", "axonometric", "multiple-viewpoint", "flattened", "non-perspectival", "other"],
  style: ["descriptive", "historical-movement", "artist-attributed", "other"],
  purpose: ["study", "preparatory", "illustration", "documentation", "expression", "decoration", "other"],
  figureGround: ["figure", "ground", "positive-space", "negative-space", "overlap", "ambiguous"],
  finish: ["thumbnail", "study", "draft", "finished", "intentionally-unfinished", "not-assessed"],
} as const;

export type DrawingTaxonomyDimension = keyof typeof DRAWING_TAXONOMY;
export type DrawingAnnotationSource = "ARTIST_DECLARED" | "CATALOGUED" | "OBSERVED" | "INFERRED";
export type DrawingAnnotationTarget = "SCENE" | "LAYER" | "OBJECT" | "REGION";

export interface DrawingAnnotation {
  id: string;
  dimension: DrawingTaxonomyDimension;
  term: string;
  target: { type: DrawingAnnotationTarget; id: string };
  source: DrawingAnnotationSource;
  vocabulary?: string;
  confidence?: number;
  annotatedBy: string;
  annotatedAt: string;
}

export function isDrawingAnnotation(value: unknown): value is DrawingAnnotation {
  if (!value || typeof value !== "object") return false;
  const annotation = value as Partial<DrawingAnnotation>;
  const dimensions = Object.keys(DRAWING_TAXONOMY) as DrawingTaxonomyDimension[];
  const sources: DrawingAnnotationSource[] = ["ARTIST_DECLARED", "CATALOGUED", "OBSERVED", "INFERRED"];
  const targets: DrawingAnnotationTarget[] = ["SCENE", "LAYER", "OBJECT", "REGION"];
  return typeof annotation.id === "string" && annotation.id.length > 0
    && dimensions.includes(annotation.dimension as DrawingTaxonomyDimension)
    && typeof annotation.term === "string" && annotation.term.length > 0
    && !!annotation.target && targets.includes(annotation.target.type)
    && typeof annotation.target.id === "string" && annotation.target.id.length > 0
    && sources.includes(annotation.source as DrawingAnnotationSource)
    && (annotation.confidence === undefined || (Number.isFinite(annotation.confidence) && annotation.confidence >= 0 && annotation.confidence <= 1))
    && typeof annotation.annotatedBy === "string" && annotation.annotatedBy.length > 0
    && typeof annotation.annotatedAt === "string" && !Number.isNaN(Date.parse(annotation.annotatedAt));
}
