import { describe, expect, it } from "vitest";
import { AUTHORSHIP_ALGORITHM_VERSION, calculateAuthorship, isAuthorshipSummary } from "./authorship";

describe("authorship calculation", () => {
  it("calculates a weighted estimate from final content units only", () => {
    expect(calculateAuthorship([
      { id: "shape-1", humanWeight: 1, aiWeight: 0, includedInFinal: true },
      { id: "shape-2", humanWeight: 0, aiWeight: 1, includedInFinal: true },
      { id: "discarded", humanWeight: 0, aiWeight: 8, includedInFinal: false },
    ])).toEqual({
      category: "HUMAN_AI",
      aiPercentage: 50,
      evidence: "TRACE",
      algorithmVersion: AUTHORSHIP_ALGORITHM_VERSION,
    });
  });

  it("returns human, AI, and unverified classifications at boundaries", () => {
    expect(calculateAuthorship([{ id: "h", humanWeight: 1, aiWeight: 0, includedInFinal: true }]).category).toBe("HUMAN");
    expect(calculateAuthorship([{ id: "a", humanWeight: 0, aiWeight: 1, includedInFinal: true }]).category).toBe("AI");
    expect(calculateAuthorship([])).toMatchObject({ category: "UNVERIFIED", aiPercentage: null, evidence: "UNVERIFIED" });
    expect(calculateAuthorship([{ id: "removed", humanWeight: 1, aiWeight: 1, includedInFinal: false }]).aiPercentage).toBeNull();
  });

  it("rejects ambiguous or invalid provenance weights", () => {
    expect(() => calculateAuthorship([
      { id: "same", humanWeight: 1, aiWeight: 0, includedInFinal: true },
      { id: "same", humanWeight: 0, aiWeight: 1, includedInFinal: true },
    ])).toThrow("unique");
    expect(() => calculateAuthorship([{ id: "bad", humanWeight: -1, aiWeight: 0, includedInFinal: true }])).toThrow("finite and non-negative");
  });

  it("validates externally supplied summaries before they are rendered", () => {
    expect(isAuthorshipSummary(calculateAuthorship([{ id: "a", humanWeight: 0, aiWeight: 1, includedInFinal: true }]))).toBe(true);
    expect(isAuthorshipSummary({ category: "AI", aiPercentage: 120, evidence: "TRACE", algorithmVersion: "unit-weighted-v1" })).toBe(false);
    expect(isAuthorshipSummary({ category: "HUMAN", aiPercentage: 30, evidence: "TRACE", algorithmVersion: "unit-weighted-v1" })).toBe(false);
    expect(isAuthorshipSummary({ category: "HUMAN", aiPercentage: 0, evidence: "UNVERIFIED", algorithmVersion: null })).toBe(false);
  });
});
