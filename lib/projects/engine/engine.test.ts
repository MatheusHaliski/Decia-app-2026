/**
 * Motor de gestão de projetos: cada caso reproduz um exemplo ou gabarito das aulas de Gestão de Projetos de TI e de Governança
 * de TI (PUCPR, BSI 2026, foco ENADE) — os números da prova são o contrato.
 */
import { describe, expect, it } from "vitest";
import { ahp, pairwiseMatrix, weightedScoring } from "./ahp";
import { earnedAndActual, evm, plannedValueAt, sCurve } from "./evm";
import { businessCase, irr, npv, payback, roi } from "./finance";
import {
  agreementProblems, emv, gut, looksLikeActivity, mendelow, probabilityLevel, raciProblems, riskExposure, riskSeverity,
} from "./methods";
import { normalCdf, pathStats, pert, probabilityByTarget, targetForConfidence } from "./pert";
import { dateToOffset, enumeratePaths, offsetToDate, schedule, topologicalOrder, wouldCreateCycle, type SchedDep } from "./schedule";

const fs = (from: string, to: string, lag = 0): SchedDep => ({ from, to, type: "FS", lag });

describe("CPM — caminho crítico", () => {
  // aula 2, §3.3: A3 B4 C2 D5 E2; A→B→D→E = 14 (crítico) e A→C→D→E = 12; folga de C = 2
  const tasks = [{ id: "A", duration: 3 }, { id: "B", duration: 4 }, { id: "C", duration: 2 }, { id: "D", duration: 5 }, { id: "E", duration: 2 }];
  const deps = [fs("A", "B"), fs("A", "C"), fs("B", "D"), fs("C", "D"), fs("D", "E")];

  it("reproduz o exemplo da aula: término 14, caminho A→B→D→E e folga 2 em C", () => {
    const r = schedule(tasks, deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.finish).toBe(14);
    expect(r.criticalPath).toEqual(["A", "B", "D", "E"]);
    expect(r.rows.C).toMatchObject({ es: 3, ef: 5, ls: 5, lf: 7, totalFloat: 2, freeFloat: 2, critical: false });
    expect(r.rows.D).toMatchObject({ es: 7, ef: 12, totalFloat: 0, critical: true });
    expect(enumeratePaths(tasks, deps).map((p) => [p.ids.join("→"), p.length])).toEqual([["A→B→D→E", 14], ["A→C→D→E", 12]]);
  });

  it("aula 1: A→C→D→E = 15 é crítico e B tem folga 6", () => {
    const r = schedule(
      [{ id: "A", duration: 0 }, { id: "B", duration: 3 }, { id: "C", duration: 5 }, { id: "D", duration: 6 }, { id: "E", duration: 4 }],
      [fs("A", "B"), fs("A", "C"), fs("B", "D", 2 - 2), fs("C", "D"), fs("D", "E")],
    );
    // (no diagrama da aula 1 as durações estão nas setas; aqui as mesmas durações estão nos nós)
    expect(r.ok && r.finish).toBe(15);
    expect(r.ok && r.rows.B!.totalFloat).toBe(2);
  });

  it("dependências SS, FF, SF e defasagem positiva e negativa", () => {
    const r = schedule(
      [{ id: "X", duration: 10 }, { id: "Y", duration: 4 }, { id: "Z", duration: 6 }, { id: "W", duration: 3 }],
      [{ from: "X", to: "Y", type: "SS", lag: 2 }, { from: "X", to: "Z", type: "FF", lag: 1 }, { from: "Y", to: "W", type: "SF", lag: 5 }],
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.Y).toMatchObject({ es: 2, ef: 6 }); // SS+2
    expect(r.rows.Z).toMatchObject({ es: 5, ef: 11 }); // FF+1: término de Z ≥ 10 + 1
    expect(r.rows.W).toMatchObject({ es: 4, ef: 7 }); // SF+5: término de W ≥ início de Y (2) + 5
    expect(r.finish).toBe(11);
    const lead = schedule([{ id: "P", duration: 5 }, { id: "Q", duration: 5 }], [fs("P", "Q", -2)]);
    expect(lead.ok && lead.rows.Q!.es).toBe(3);
  });

  it("recusa ciclo e dependência para atividade inexistente", () => {
    const r = schedule(tasks, [...deps, fs("E", "A")]);
    expect(r).toMatchObject({ ok: false, error: "CICLO" });
    expect(wouldCreateCycle(deps, "E", "A")).toBe(true);
    expect(wouldCreateCycle(deps, "A", "E")).toBe(false);
    expect(wouldCreateCycle(deps, "B", "B")).toBe(true);
    expect(schedule(tasks, [fs("A", "Z")])).toMatchObject({ ok: false, error: "DEPENDENCIA_INVALIDA" });
    expect(topologicalOrder(["A", "B"], [fs("A", "B"), fs("B", "A")])).toEqual({ cycle: ["A", "B"] });
  });

  it("converte offsets em datas e de volta", () => {
    expect(offsetToDate("2026-11-09", 0)).toBe("2026-11-09");
    expect(offsetToDate("2026-11-09", 14)).toBe("2026-11-23");
    expect(offsetToDate("2026-12-30", 3.5)).toBe("2027-01-02");
    expect(dateToOffset("2026-11-09", "2026-11-23")).toBe(14);
  });
});

describe("PERT", () => {
  it("gabaritos das aulas: 6/9/18 = 10; 5/8/17 = 9; 4/6/14 = 7 com σ 1,67", () => {
    expect(pert({ o: 6, m: 9, p: 18 }).te).toBe(10);
    expect(pert({ o: 5, m: 8, p: 17 }).te).toBe(9);
    const e = pert({ o: 4, m: 6, p: 14 });
    expect(e).toMatchObject({ te: 7, valid: true });
    expect(e.sd).toBeCloseTo(1.6667, 4);
    expect(e.variance).toBeCloseTo(2.7778, 3);
  });

  it("aponta estimativas incoerentes", () => {
    expect(pert({ o: 9, m: 8, p: 5 }).problem).toBe("PESSIMISTA_MENOR_QUE_OTIMISTA");
    expect(pert({ o: 2, m: 9, p: 5 }).problem).toBe("MAIS_PROVAVEL_FORA_DA_FAIXA");
  });

  it("soma variâncias no caminho e calcula a probabilidade de cumprir o prazo", () => {
    // TE 3 + 5 + 5 = 13; variâncias (2/6)² + (8/6)² + (2/6)² = 2 ⇒ σ do caminho = √2
    const path = pathStats([pert({ o: 2, m: 3, p: 4 }), pert({ o: 3, m: 4, p: 11 }), pert({ o: 4, m: 5, p: 6 })]);
    expect(path.te).toBe(13);
    expect(path.variance).toBeCloseTo(2, 3);
    expect(path.sd).toBeCloseTo(1.4142, 3);
    expect(probabilityByTarget(path.te, path.sd, 15)).toBeCloseTo(0.9214, 3);
    expect(probabilityByTarget(10, 0, 10)).toBe(1);
    expect(probabilityByTarget(10, 2, 10)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(targetForConfidence(10, 2, 0.5)).toBeCloseTo(10, 3);
    expect(targetForConfidence(10, 2, 0.9)).toBeCloseTo(12.563, 2);
  });
});

describe("Valor agregado (EVM)", () => {
  it("aula 1: VP 100, VA 80, CR 120 ⇒ VC −40, VPr −20, IDC 0,67, IDP 0,8 (acima do orçamento e atrasado)", () => {
    const r = evm({ pv: 100, ev: 80, ac: 120, bac: 400 });
    expect(r).toMatchObject({ cv: -40, sv: -20, spi: 0.8, cost: "ACIMA_DO_ORCAMENTO", schedule: "ATRASADO" });
    expect(r.cpi).toBeCloseTo(0.6667, 4);
    expect(r.eac).toBeCloseTo(600, 0); // ENT = ONT / IDC
  });

  it("simulado da aula 2: VP 60k, VA 48k, CR 50k ⇒ IDP 0,80, IDC 0,96, VC −2.000, VPr −12.000", () => {
    const r = evm({ pv: 60_000, ev: 48_000, ac: 50_000, bac: 120_000 });
    expect(r).toMatchObject({ cpi: 0.96, spi: 0.8, cv: -2000, sv: -12_000, cost: "ACIMA_DO_ORCAMENTO", schedule: "ATRASADO" });
    expect(r.eac).toBe(125_000);
    expect(r.vac).toBe(-5000);
    expect(r.tcpi).toBeCloseTo(1.0286, 4);
  });

  it("IDP 1,20 é adiantado; sem custo real não há IDC", () => {
    expect(evm({ pv: 100, ev: 120, ac: 120, bac: 500 })).toMatchObject({ spi: 1.2, schedule: "ADIANTADO", cpi: 1, cost: "NO_ORCAMENTO" });
    expect(evm({ pv: 0, ev: 0, ac: 0, bac: 100 })).toMatchObject({ cpi: null, spi: null, eac: null, cost: null, schedule: null });
  });

  it("curva S e VP na data de status a partir do cronograma", () => {
    const rows = { A: { es: 0, ef: 4, duration: 4 }, B: { es: 4, ef: 8, duration: 4 }, M: { es: 8, ef: 8, duration: 0 } };
    const budgets = { A: 400, B: 800, M: 0 };
    expect(plannedValueAt(rows, budgets, 2)).toBe(200);
    expect(plannedValueAt(rows, budgets, 6)).toBe(800);
    const curve = sCurve(rows, budgets, 8);
    expect(curve[0]).toEqual({ t: 0, pv: 0 });
    expect(curve[curve.length - 1]).toEqual({ t: 8, pv: 1200 });
    expect(earnedAndActual([{ budget: 400, percentComplete: 100, actualCost: 450 }, { budget: 800, percentComplete: 25, actualCost: 100 }])).toEqual({ ev: 600, ac: 550, bac: 1200 });
  });
});

describe("Business case", () => {
  it("VPL, TIR, payback e ROI", () => {
    const flows = [-100_000, 30_000, 40_000, 50_000, 20_000];
    // −100.000 + 27.272,73 + 33.057,85 + 37.565,74 + 13.660,27 = 11.556,59
    expect(npv(0.1, flows)).toBe(11_556.59);
    expect(irr(flows)).toBeCloseTo(0.1532, 3);
    expect(payback(flows)).toBe(2.6);
    expect(roi(flows)).toBe(0.4);
    expect(businessCase(0.1, flows).viable).toBe(true);
    expect(irr([100, 50])).toBeNull();
    expect(payback([-100, 10, 10])).toBeNull();
  });
});

describe("AHP e pontuação ponderada", () => {
  it("matriz consistente de Saaty tem RC < 0,10 e pesos coerentes", () => {
    const a = pairwiseMatrix(3, [{ i: 0, j: 1, value: 3 }, { i: 0, j: 2, value: 5 }, { i: 1, j: 2, value: 2 }]);
    const r = ahp(a);
    expect(r.consistent).toBe(true);
    expect(r.cr).toBeLessThan(0.1);
    expect(r.weights[0]).toBeGreaterThan(r.weights[1]!);
    expect(r.weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 3);
  });

  it("julgamentos contraditórios estouram a RC", () => {
    const a = pairwiseMatrix(3, [{ i: 0, j: 1, value: 9 }, { i: 1, j: 2, value: 9 }, { i: 0, j: 2, value: 1 / 9 }]);
    expect(ahp(a).consistent).toBe(false);
  });

  it("modelo ponderado normaliza os pesos e ranqueia", () => {
    const ranked = weightedScoring([4, 3, 2, 1], [
      { id: "A", scores: [8, 6, 7, 5] },
      { id: "B", scores: [6, 9, 8, 7] },
      { id: "C", scores: [9, 5, 4, 9] },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["B", "A", "C"]);
    expect(ranked[0]!.score).toBeCloseTo(7.4, 3);
  });
});

describe("Riscos, partes interessadas, RACI, GUT e acordos", () => {
  it("VME = P × impacto (30 % × R$ 50.000 = R$ 15.000) e faixas da matriz", () => {
    expect(emv(0.3, 50_000)).toBe(15_000);
    expect(probabilityLevel(0.3)).toBe(2);
    expect(riskSeverity(5, 4)).toEqual({ score: 20, band: "CRITICA" });
    expect(riskSeverity(1, 3).band).toBe("BAIXA");
    expect(riskExposure([
      { kind: "AMEACA", probability: 0.3, impact: 50_000 },
      { kind: "OPORTUNIDADE", probability: 0.5, impact: 10_000 },
      { kind: "AMEACA", probability: 0.9, impact: 1_000, closed: true },
    ])).toEqual({ threats: 15_000, opportunities: 5_000, net: 10_000 });
  });

  it("Mendelow: alto poder e baixo interesse = manter satisfeito", () => {
    expect(mendelow(5, 1)).toBe("MANTER_SATISFEITO");
    expect(mendelow(5, 5)).toBe("GERENCIAR_DE_PERTO");
    expect(mendelow(1, 5)).toBe("MANTER_INFORMADO");
    expect(mendelow(1, 1)).toBe("MONITORAR");
  });

  it("RACI: exatamente um A; R e A podem ser a mesma pessoa", () => {
    expect(raciProblems({ ana: ["R", "A"] })).toEqual([]);
    expect(raciProblems({ ana: ["A"], bruno: ["A", "R"] })).toEqual(["MAIS_DE_UM_A"]);
    expect(raciProblems({ ana: ["C"], bruno: ["I"] })).toEqual(["SEM_A", "SEM_R"]);
  });

  it("GUT é produto, não soma", () => {
    expect(gut(5, 4, 3)).toEqual({ score: 60, band: "ALTA" });
    expect(gut(5, 5, 5).band).toBe("MAXIMA");
    expect(gut(1, 2, 1).score).toBe(2);
  });

  it("OLA e contrato de apoio mais rígidos que o SLA", () => {
    expect(agreementProblems(4, 2, 3)).toEqual([]);
    expect(agreementProblems(4, 4, 6)).toEqual(["OLA_MENOS_RIGIDO_QUE_SLA", "UC_MENOS_RIGIDO_QUE_SLA"]);
  });

  it("EAP decompõe entregas (substantivos), não atividades (verbos)", () => {
    expect(looksLikeActivity("Desenvolver o módulo de login")).toBe(true);
    expect(looksLikeActivity("Testar integração")).toBe(true);
    expect(looksLikeActivity("Módulo de autenticação")).toBe(false);
    expect(looksLikeActivity("Lugar de reunião")).toBe(false);
    expect(looksLikeActivity("Gestor do contrato")).toBe(false);
  });
});
