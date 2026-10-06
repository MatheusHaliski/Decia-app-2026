import { afterEach, describe, expect, it, vi } from "vitest";
import { DECIA_ANALYTICS_EVENTS, setAnalyticsSink, track, type AnalyticsRecord } from "./analytics";
import { DECISION_EVENT_TYPES } from "./types";

afterEach(() => setAnalyticsSink(null));

describe("analytics do DECIA (03 §9)", () => {
  it("lista os 14 eventos da especificação, todos também tipos de DecisionEvent", () => {
    expect(DECIA_ANALYTICS_EVENTS).toHaveLength(14);
    for (const e of DECIA_ANALYTICS_EVENTS) expect(DECISION_EVENT_TYPES).toContain(e);
  });

  it("sink padrão é no-op e não escreve no console", () => {
    const spy = vi.spyOn(console, "log");
    const warn = vi.spyOn(console, "warn");
    const rec = track("card_flipped", { decisionId: "d", to: "back", mode: "DETAIL" }, new Date("2026-10-06T00:00:00Z"));
    expect(rec).toEqual({ event: "card_flipped", props: { decisionId: "d", to: "back", mode: "DETAIL" }, at: "2026-10-06T00:00:00.000Z" });
    expect(spy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("sink registrado recebe o evento; erro no sink não derruba quem chamou", () => {
    const got: AnalyticsRecord[] = [];
    setAnalyticsSink((r) => got.push(r));
    track("decision_created", { decisionId: "d", complexity: "PADRAO" });
    expect(got.map((r) => r.event)).toEqual(["decision_created"]);
    setAnalyticsSink(() => { throw new Error("x"); });
    expect(() => track("decision_challenged", { decisionId: "d", mode: "reasoning" })).not.toThrow();
  });
});
