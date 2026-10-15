export const AUTHORSHIP_ALGORITHM_VERSION = "unit-weighted-v1";

export type AuthorshipCategory = "HUMAN" | "HUMAN_AI" | "AI" | "UNVERIFIED";
export type AuthorshipEvidence = "TRACE" | "SELF_DECLARED" | "UNVERIFIED";

export interface AuthorshipSummary {
  category: AuthorshipCategory;
  aiPercentage: number | null;
  evidence: AuthorshipEvidence;
  algorithmVersion: string | null;
}

export interface FinalAuthorshipUnit {
  id: string;
  humanWeight: number;
  aiWeight: number;
  includedInFinal: boolean;
}

export function calculateAuthorship(units: readonly FinalAuthorshipUnit[]): AuthorshipSummary {
  const ids = new Set<string>();
  let human = 0;
  let ai = 0;

  for (const unit of units) {
    if (!unit.id || ids.has(unit.id)) throw new Error("Authorship unit IDs must be unique and non-empty");
    ids.add(unit.id);
    if (!Number.isFinite(unit.humanWeight) || unit.humanWeight < 0
      || !Number.isFinite(unit.aiWeight) || unit.aiWeight < 0) {
      throw new Error("Authorship weights must be finite and non-negative");
    }
    if (!unit.includedInFinal) continue;
    human += unit.humanWeight;
    ai += unit.aiWeight;
  }

  const total = human + ai;
  if (total === 0) {
    return { category: "UNVERIFIED", aiPercentage: null, evidence: "UNVERIFIED", algorithmVersion: null };
  }

  const aiPercentage = Math.round((ai / total) * 1000) / 10;
  return {
    category: aiPercentage === 0 ? "HUMAN" : aiPercentage === 100 ? "AI" : "HUMAN_AI",
    aiPercentage,
    evidence: "TRACE",
    algorithmVersion: AUTHORSHIP_ALGORITHM_VERSION,
  };
}
