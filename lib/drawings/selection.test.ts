import { describe, expect, it } from "vitest";
import { assertDrawingTargetsEditable, canEditDrawingTarget } from "./selection";

const sofaPart = { layerId: "foreground", regionIds: ["B2"], objectPath: ["figure", "head", "eye"] };

describe("drawing selection scope", () => {
  it("intersects active layer, region and selected object for manual or AI edits", () => {
    expect(canEditDrawingTarget({
      mode: "EDIT", layerId: "foreground", regionIds: ["B2"], objectPath: ["figure", "head"],
    }, sofaPart)).toBe(true);
    expect(canEditDrawingTarget({ mode: "EDIT", layerId: "foreground", regionIds: ["B2"] }, sofaPart)).toBe(true);
  });

  it("denies viewing mode, inactive layers, unrelated objects and geometry crossing region boundaries", () => {
    expect(canEditDrawingTarget({ mode: "VIEW" }, sofaPart)).toBe(false);
    expect(canEditDrawingTarget({ mode: "EDIT", layerId: "background" }, sofaPart)).toBe(false);
    expect(canEditDrawingTarget({ mode: "EDIT", objectPath: ["tree"] }, sofaPart)).toBe(false);
    expect(canEditDrawingTarget({ mode: "EDIT", regionIds: ["B2"] }, { ...sofaPart, regionIds: ["B2", "C2"] })).toBe(false);
  });

  it("rejects an entire patch if any target escapes scope", () => {
    const scope = { mode: "EDIT" as const, layerId: "foreground", regionIds: ["B2"] };
    expect(() => assertDrawingTargetsEditable(scope, [sofaPart, { ...sofaPart, layerId: "background" }])).toThrow("active edit scope");
    expect(() => assertDrawingTargetsEditable(scope, [])).toThrow("active edit scope");
  });
});
