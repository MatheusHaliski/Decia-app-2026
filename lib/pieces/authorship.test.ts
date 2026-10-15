import { describe, expect, it } from "vitest";
import { aiShareBand, appendEvent, computeAuthorship, publicAuthorship, resolveClaim, verifyChain, type ContributionEvent, type ContributionOrigin } from "./authorship";
import { TAXONOMY_VERSION, validateClassification } from "./classification";

async function chain(items: [ContributionOrigin, string[]][]): Promise<ContributionEvent[]> {
  let c: ContributionEvent[] = [];
  let i = 0;
  for (const [origin, scope] of items) {
    c = await appendEvent(c, { id: `e${i++}`, pieceId: "p", revisionId: `r${i}`, actorId: "u", origin, scope, acceptedAt: "2026-10-15T00:00:00Z" });
  }
  return c;
}
const units = [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 2 }];

describe("computeAuthorship", () => {
  it("0% IA → HUMAN (ou HUMAN_ASSISTED se só diagnóstico)", async () => {
    const ev = await chain([["MANUAL", ["a", "b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev })).toMatchObject({ category: "HUMAN", aiShare: 0 });
    expect(computeAuthorship({ finalUnits: units, events: ev, advisoryOnly: true }).category).toBe("HUMAN_ASSISTED");
  });
  it("100% IA → AI_FULL", async () => {
    const ev = await chain([["AI_PROPOSAL_ACCEPTED", ["a", "b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev })).toMatchObject({ category: "AI_FULL", aiShare: 1 });
  });
  it("misto ponderado → HYBRID", async () => {
    const ev = await chain([["AI_PROPOSAL_ACCEPTED", ["a"]], ["MANUAL", ["b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev })).toMatchObject({ category: "HYBRID", aiShare: 0.25 });
  });
  it("majoritário: HYBRID se aceito, AI_DIRECTED se aplicado automaticamente", async () => {
    const acc = await chain([["AI_PROPOSAL_ACCEPTED", ["c"]], ["MANUAL", ["a", "b"]]]);
    expect(computeAuthorship({ finalUnits: units, events: acc }).category).toBe("HYBRID");
    const auto = await chain([["AI_AUTO_APPLIED", ["c"]], ["MANUAL", ["a", "b"]]]);
    expect(computeAuthorship({ finalUnits: units, events: auto }).category).toBe("AI_DIRECTED");
  });
  it("edição humana ≥ limiar após aceite passa a humana", async () => {
    const ev = await chain([["AI_PROPOSAL_ACCEPTED", ["a", "b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev, humanModification: { a: 0.6, b: 0.6, c: 0.6 } }).aiShare).toBe(0);
    expect(computeAuthorship({ finalUnits: units, events: ev, humanModification: { a: 0.4 } }).aiShare).toBe(1);
  });
  it("unidade apagada não conta; sobrescrita manual posterior vale", async () => {
    const ev = await chain([["AI_PROPOSAL_ACCEPTED", ["a", "x"]], ["MANUAL", ["a"]], ["MANUAL", ["b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev }).aiShare).toBe(0);
  });
  it("importado e logs ausentes nunca são estimados", async () => {
    const imp = await chain([["IMPORT", ["a", "b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: imp })).toMatchObject({ category: "IMPORTED", aiShare: null });
    expect(computeAuthorship({ finalUnits: units, events: [] })).toMatchObject({ category: "UNVERIFIED", aiShare: null });
    const partial = await chain([["MANUAL", ["a"]]]);
    expect(computeAuthorship({ finalUnits: units, events: partial }).category).toBe("UNVERIFIED");
    expect(computeAuthorship({ finalUnits: units, events: partial, logsIncomplete: true }).aiShare).toBeNull();
  });
  it("é reproduzível", async () => {
    const ev = await chain([["AI_PROPOSAL_ACCEPTED", ["a"]], ["MANUAL", ["b", "c"]]]);
    expect(computeAuthorship({ finalUnits: units, events: ev })).toEqual(computeAuthorship({ finalUnits: units, events: ev }));
  });
});

describe("cadeia de hash", () => {
  it("detecta adulteração", async () => {
    const ev = await chain([["MANUAL", ["a"]], ["AI_PROPOSAL_ACCEPTED", ["b"]], ["MANUAL", ["c"]]]);
    expect(await verifyChain(ev)).toBe(-1);
    const tampered = ev.map((e, i) => (i === 1 ? { ...e, origin: "MANUAL" as const } : e));
    expect(await verifyChain(tampered)).toBe(1);
    expect(await verifyChain([ev[0]!, ev[2]!])).toBe(1);
  });
});

describe("declaração, faixas e visão pública", () => {
  const measured = { category: "HYBRID" as const, aiShare: 0.3, ruleVersion: "1.0.0" };
  it("declarar mais IA é livre; elevar humano exige motivo e vira UNVERIFIED", () => {
    expect(resolveClaim(measured, { category: "AI_FULL" })).toMatchObject({ ok: true, declared: true, category: "AI_FULL" });
    expect(resolveClaim(measured, { category: "HUMAN" }).ok).toBe(false);
    expect(resolveClaim(measured, { category: "HUMAN", overrideReason: "log perdido" })).toMatchObject({ ok: true, category: "UNVERIFIED" });
  });
  it("faixas visuais", () => {
    expect([0, 0.01, 0.4, 0.6, 0.99, 1].map(aiShareBand)).toEqual([0, 25, 50, 50, 75, 100]);
  });
  it("visão pública respeita preferência", () => {
    expect(publicAuthorship(measured, "FULL")).toEqual({ category: "HYBRID", aiShare: 0.3 });
    expect(publicAuthorship(measured, "CATEGORY_ONLY")).toEqual({ category: "HYBRID", aiShare: null });
    expect(publicAuthorship(measured, "HIDDEN").category).toBe("NOT_DISCLOSED");
  });
});

describe("classificação", () => {
  it("campos ausentes são válidos; IA exige confiança", () => {
    expect(validateClassification({ taxonomyVersion: TAXONOMY_VERSION })).toEqual([]);
    const bad = validateClassification({ taxonomyVersion: TAXONOMY_VERSION, genre: { value: "PAISAGEM", vocabulary: "aat", source: "AI_SUGGESTED" } });
    expect(bad).toHaveLength(1);
    const ok = validateClassification({ taxonomyVersion: TAXONOMY_VERSION, genre: { value: "PAISAGEM", vocabulary: "aat", source: "AI_SUGGESTED", confidence: 0.7 } });
    expect(ok).toEqual([]);
  });
});
