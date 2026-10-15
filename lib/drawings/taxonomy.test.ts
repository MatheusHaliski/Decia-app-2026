import { describe, expect, it } from "vitest";
import { DRAWING_TAXONOMY, isDrawingAnnotation } from "./taxonomy";

describe("drawing classification taxonomy", () => {
  it("keeps independent dimensions for subject, medium, formal analysis and finish", () => {
    expect(Object.keys(DRAWING_TAXONOMY)).toEqual(expect.arrayContaining([
      "subject", "medium", "technique", "formalElement", "composition", "perspective", "style", "purpose", "figureGround", "finish",
    ]));
    expect(DRAWING_TAXONOMY.formalElement).toEqual(expect.arrayContaining(["line", "shape", "color", "value", "texture", "space"]));
  });

  it("accepts an annotation with scope and provenance", () => {
    expect(isDrawingAnnotation({
      id: "ann-1",
      dimension: "formalElement",
      term: "line",
      target: { type: "REGION", id: "region-1" },
      source: "OBSERVED",
      confidence: 0.8,
      annotatedBy: "user-1",
      annotatedAt: "2026-10-15T00:00:00.000Z",
    })).toBe(true);
  });

  it.each([1.1, -0.1, Number.NaN])("rejects invalid confidence %s", (confidence) => {
    expect(isDrawingAnnotation({
      id: "ann-1", dimension: "style", term: "descriptive", target: { type: "SCENE", id: "scene-1" },
      source: "INFERRED", confidence, annotatedBy: "user-1", annotatedAt: "2026-10-15T00:00:00Z",
    })).toBe(false);
  });
});
