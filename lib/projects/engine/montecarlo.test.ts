import { describe, expect, it } from "vitest";
import { monteCarlo, mulberry32, probabilityWithin, samplePert } from "./montecarlo";

describe("Monte Carlo do cronograma", () => {
  it("rede sem três pontos é determinística: todos os cenários terminam no mesmo dia", () => {
    const r = monteCarlo(
      [{ id: "A", duration: 3 }, { id: "B", duration: 4 }, { id: "C", duration: 2 }],
      [{ from: "A", to: "B", type: "FS", lag: 0 }, { from: "A", to: "C", type: "FS", lag: 0 }],
      { runs: 200 },
    );
    if ("error" in r) throw new Error(r.error);
    expect([r.min, r.p50, r.p95, r.max]).toEqual([7, 7, 7, 7]);
    expect(r.criticality).toEqual({ A: 1, B: 1, C: 0 });
    expect(probabilityWithin(r, 7)).toBe(1);
    expect(probabilityWithin(r, 6.9)).toBe(0);
  });

  it("Beta-PERT respeita o intervalo [O, P] e tem média (O + 4M + P) / 6", () => {
    const rnd = mulberry32(7);
    const xs = Array.from({ length: 20_000 }, () => samplePert(4, 6, 14, rnd));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...xs)).toBeLessThanOrEqual(14);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean).toBeCloseTo(7, 1); // (4 + 24 + 14) / 6
  });

  it("viés de fusão: dois caminhos paralelos incertos terminam, em média, depois do TE de cada um", () => {
    const p = { o: 5, m: 10, p: 15 };
    const r = monteCarlo(
      [{ id: "X", duration: 10, pert: p }, { id: "Y", duration: 10, pert: p }, { id: "Z", duration: 0 }],
      [{ from: "X", to: "Z", type: "FS", lag: 0 }, { from: "Y", to: "Z", type: "FS", lag: 0 }],
      { runs: 4000, seed: 3 },
    );
    if ("error" in r) throw new Error(r.error);
    expect(r.mean).toBeGreaterThan(10.5); // TE de cada caminho = 10; o máximo de dois é maior
    expect(r.criticality.X!).toBeGreaterThan(0.4);
    expect(r.criticality.Y!).toBeGreaterThan(0.4);
    expect(r.criticality.Z).toBe(1);
    expect(r.histogram.reduce((n, b) => n + b.count, 0)).toBe(4000);
  });

  it("mesma semente, mesmo resultado; ciclo é recusado", () => {
    const tasks = [{ id: "A", duration: 2, pert: { o: 1, m: 2, p: 6 } }, { id: "B", duration: 1 }];
    const deps = [{ from: "A", to: "B", type: "FS" as const, lag: 0 }];
    const a = monteCarlo(tasks, deps, { runs: 300, seed: 11 });
    const b = monteCarlo(tasks, deps, { runs: 300, seed: 11 });
    expect(a).toEqual(b);
    expect(monteCarlo(tasks, [...deps, { from: "B", to: "A", type: "FS", lag: 0 }])).toEqual({ error: "CICLO" });
  });
});
