/**
 * Simulador de Cenários (RF31): cada alavanca sobre uma CÓPIA do modelo, comparada à linha de base; prazo pelo CPM, custo pelo
 * valor agregado, Monte Carlo com semente fixa (determinístico), riscos que disparam, cruzamento com o Espelho e o envio à
 * aprovação pelo caminho existente (solicitação de mudança + comitê no DECIA), sem alterar o plano.
 */
import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/decia/repository";
import { applyCommand, baselineFrom, type CommandResult, type ProjectCommand } from "../commands";
import { openChangeDecision } from "../decia";
import { monteCarlo, probabilityWithin } from "../engine/montecarlo";
import { buildDemoProject } from "../fixtures";
import type { ProjectModel, Task } from "../types";
import { approvalCommand, approvalImpact, impactLevel, submitForApproval } from "./approval";
import { evaluateScenario, scenarioNetwork, simulate, simulateAll } from "./engine";
import { applyLevers, resolveTargets, validateLever } from "./levers";
import { compareNarrative, scenarioNarrative } from "./narrative";
import { compareParam, createMemoryScenarioRepository, demoScenarios, parseCompare } from "./store";
import type { Lever, Scenario } from "./types";

/**
 * Projeto pequeno (início 05/01/2026): A(2) → B(3) e A → C(4); B, C → D(1). Caminho crítico A → C → D = 7 dias; B tem folga 1.
 * A concluída no custo (VA = CR = 2.000 ⇒ IDC 1); orçamento 10.000; reservas 1.000 (contingência) + 500 (gerencial).
 */
function small(over: Partial<Record<string, Partial<Task>>> = {}): ProjectModel {
  const task = (id: string, code: string, title: string, durationDays: number, budget: number, extra: Partial<Task> = {}): Task => ({
    id, code, title, phase: "EXECUCAO", status: "A_FAZER", durationDays, percentComplete: 0, budget, actualCost: 0, createdBy: "u1", ...extra, ...over[id],
  });
  const base: ProjectModel = {
    id: "p-small", title: "Projeto pequeno", startDate: "2026-01-05", statusDate: "2026-01-07", approach: "PREDITIVO", area: "OUTRA", boardModel: "INSTITUCIONAL",
    currentPhase: "EXECUCAO", team: [{ userId: "u1", role: "GERENTE" }, { userId: "u2", role: "EQUIPE" }],
    charter: { justification: [], objectives: [], product: "", highLevelRequirements: [], premises: [], constraints: [], highLevelRisks: [], teamRoles: [], milestones: [], summaryBudget: 0 },
    businessCase: { rate: 0.1, cashflows: [], benefits: [] }, stakeholders: [], requirements: [],
    wbs: [{ id: "w0", title: "Projeto" }, { id: "w1", parentId: "w0", title: "Base" }, { id: "w2", parentId: "w0", title: "Acabamento" }],
    tasks: [
      task("A", "T01", "Preparar", 2, 2000, { status: "CONCLUIDA", percentComplete: 100, actualCost: 2000, moscow: "MUST", responsibleId: "u1", wbsId: "w1" }),
      task("B", "T02", "Montar a estrutura", 3, 3000, { moscow: "MUST", responsibleId: "u2", wbsId: "w1" }),
      task("C", "T03", "Instalar o acabamento", 4, 4000, { moscow: "COULD", responsibleId: "u1", wbsId: "w2" }),
      task("D", "T04", "Entregar", 1, 1000, { moscow: "SHOULD", responsibleId: "u2", wbsId: "w2" }),
    ],
    dependencies: [
      { id: "d1", from: "A", to: "B", type: "FS", lagDays: 0 },
      { id: "d2", from: "A", to: "C", type: "FS", lagDays: 0 },
      { id: "d3", from: "B", to: "D", type: "FS", lagDays: 0 },
      { id: "d4", from: "C", to: "D", type: "FS", lagDays: 0 },
    ],
    raci: [], risks: [], changes: [], lessons: [], gates: [],
    budgetLines: [{ id: "L1", title: "Licenças", amount: 2000, spend: "RUN" }, { id: "L2", title: "Serviços", amount: 8000, spend: "GROW" }],
    reserves: { contingency: 1000, management: 500 },
    governance: { goals: [], spend: "GROW", orgStructure: "MATRICIAL_BALANCEADA", iso38500: {} },
    closure: { acceptance: false, contractsClosed: false, resourcesReleased: false, finalReport: false, archived: false },
    canvas: { positions: {}, notes: [] }, decisionIds: [], versions: [], version: 1,
  };
  return { ...base, baseline: baselineFrom(base, "2026-01-05T12:00:00Z")! };
}

const sc = (...levers: Lever[]): Scenario => ({ id: "s", name: "Cenário", levers });
const ALL = { taskIds: [] as string[] };

describe("linha de base = o projeto sem alavancas, pelo mesmo motor", () => {
  it("prazo, caminho crítico, custo e reserva do projeto pequeno", () => {
    const { baseline } = simulateAll(small(), []);
    expect(baseline.schedule).toMatchObject({ ok: true, finish: 7, critical: ["A", "C", "D"], finishDate: "2026-01-12" });
    expect(baseline.cost).toMatchObject({ approvedBac: 10_000, plannedWork: 10_000, ev: 2000, ac: 2000, cpi: 1, eac: 10_000, vac: 0, overrun: 0, reserveUsed: 0, tcpi: 1 });
    expect(baseline.mc).toMatchObject({ probability: 1, p50: 7, p80: 7, target: 7, seed: 31, runs: 2000 });
    expect(baseline.risks).toEqual([]);
  });

  it("projeto DEMO: 14 dias, ENT R$ 55.934,67 (IDC 0,8939) e 39,6 % da contingência já comprometida", () => {
    const { baseline } = simulateAll(buildDemoProject(), []);
    expect(baseline.schedule.finish).toBe(14);
    expect(baseline.schedule.critical).toEqual(["tA", "tB", "tM", "tD", "tE"]);
    expect(baseline.cost).toMatchObject({ eac: 55_934.67, overrun: 5934.67, reserveUsed: 5934.67, contingency: 15_000, exposure: 21_000 });
    expect(baseline.cost.reserveUsedPct).toBeCloseTo(0.3956, 4);
    // já existiam: chance de cumprir o prazo abaixo de 50 % (só T06 tem PERT) e reserva menor que o VME
    expect(baseline.risks.map((r) => r.id)).toEqual(["PROBABILIDADE", "RESERVA_VME"]);
  });
});

describe("cada alavanca", () => {
  it("atraso de fornecedor na ENTREGA: B não começa antes do dia 2 + 5; o atraso passa a comandar o prazo", () => {
    const r = simulate(small(), sc({ kind: "ATRASO_FORNECEDOR", days: 5, mode: "ENTREGA", supplier: "Fornecedor X", target: { taskIds: ["B"] } }));
    expect(r.schedule.finish).toBe(11);
    expect(r.schedule.critical).toEqual(["B", "D"]);
    expect(r.schedule.constrained).toEqual(["B"]);
    expect(r.criticalChange).toEqual({ entered: ["B"], left: ["A", "C"], removed: [] });
    expect(r.deltas.finishDays).toBe(4);
    expect(r.effects[0]).toMatchObject({ key: "delayStart", vars: { code: "T02", fromDays: 2, toDays: 7, supplier: "Fornecedor X" } });
    expect(r.risks.find((x) => x.id === "PRAZO")).toMatchObject({ severity: "CRITICO", isNew: true, vars: { lateDays: 4 } });
    expect(r.mc!.probability).toBe(0);
  });

  it("atraso de fornecedor na DURAÇÃO: C dura 2 dias a mais; atividade concluída não é atingida", () => {
    const r = simulate(small(), sc({ kind: "ATRASO_FORNECEDOR", days: 2, mode: "DURACAO", target: { taskIds: ["A", "C"] } }));
    expect(r.schedule.finish).toBe(9);
    expect(r.effects.map((e) => e.key)).toEqual(["delayDone", "delayDuration"]);
    // a alavanca atrasa, não encarece (sem custo indireto por dia)
    expect(r.cost.eac).toBe(10_000);
    // com custo indireto de R$ 300/dia, os 2 dias de atraso custam R$ 600
    const cara = simulate(small(), sc({ kind: "ATRASO_FORNECEDOR", days: 2, mode: "DURACAO", target: { taskIds: ["C"] } }), { dailyOverhead: 300 });
    expect(cara.cost).toMatchObject({ extraDelay: 600, eac: 10_600, overrun: 600, reserveUsed: 600 });
  });

  it("corte de orçamento na RESERVA: 10 % de R$ 11.500 sai da gerencial (500) e da contingência (650)", () => {
    const r = simulate(small(), sc({ kind: "CORTE_ORCAMENTO", mode: "PERCENTUAL", value: 10, source: "RESERVA" }));
    expect(r.cost.cut).toMatchObject({ base: 11_500, requested: 1150, fromManagement: 500, fromContingency: 650, uncovered: 0 });
    expect(r.cost).toMatchObject({ contingency: 350, management: 0, eac: 10_000 });
    expect(r.schedule.finish).toBe(7);
    // corte maior que as reservas: o resto não tem de onde sair
    const big = simulate(small(), sc({ kind: "CORTE_ORCAMENTO", mode: "VALOR", value: 2000, source: "RESERVA" }));
    expect(big.cost.cut).toMatchObject({ fromManagement: 500, fromContingency: 1000, uncovered: 500 });
    expect(big.risks.find((x) => x.id === "CORTE_DESCOBERTO")).toMatchObject({ severity: "CRITICO", vars: { uncoveredBrl: 500 } });
  });

  it("corte nas LINHAS sem reduzir o trabalho: orçamento cai, ENT não; IDPT mostra o desempenho que seria preciso", () => {
    const r = simulate(small(), sc({ kind: "CORTE_ORCAMENTO", mode: "VALOR", value: 2300, source: "LINHAS" }));
    expect(r.cost).toMatchObject({ workBudget: 7700, eac: 10_000, overrun: 2300, reserveUsed: 1000, shortfall: 1300, vac: -2300 });
    expect(r.cost.tcpi).toBeCloseTo(8000 / 5700, 4);
    expect(r.risks.map((x) => x.id)).toEqual(expect.arrayContaining(["RESERVA_ESTOURADA", "IDPT"]));
  });

  it("corte no ESCOPO de menor prioridade: Could antes de Should, Must nunca; a precedência continua", () => {
    const r = simulate(small(), sc({ kind: "CORTE_ORCAMENTO", mode: "VALOR", value: 3000, source: "ESCOPO" }));
    expect(r.removed).toEqual(["C"]);
    expect(r.cost.cut).toMatchObject({ fromScope: 4000, uncovered: 0 });
    expect(r.cost).toMatchObject({ plannedWork: 6000, savings: 4000, eac: 6000 });
    expect(r.model.dependencies.some((d) => d.from === "A" && d.to === "D")).toBe(true);
    expect(r.schedule).toMatchObject({ finish: 6, critical: ["A", "B", "D"] });
    expect(r.criticalChange).toMatchObject({ removed: ["C"], entered: ["B"] });
    // pedir mais do que o escopo não obrigatório cobre
    const all = simulate(small(), sc({ kind: "CORTE_ORCAMENTO", mode: "VALOR", value: 9000, source: "ESCOPO" }));
    expect(all.removed).toEqual(["C", "D"]);
    expect(all.cost.cut.uncovered).toBe(4000);
    expect(all.model.tasks.map((t) => t.id)).toEqual(["A", "B"]);
  });

  it("retirar entregas: sai a entrega com as atividades dela; o que já começou fica", () => {
    const r = simulate(small(), sc({ kind: "ESCOPO_RETIRAR", wbsIds: ["w2"], taskIds: [] }));
    expect(r.removed).toEqual(["C", "D"]);
    expect(r.model.wbs.map((n) => n.id)).toEqual(["w0", "w1"]);
    expect(r.schedule.finish).toBe(5);
    expect(r.cost.savings).toBe(5000);
    expect(r.risks.find((x) => x.id === "MUST_RETIRADO")).toBeUndefined();
    const started = simulate(small({ B: { status: "EM_ANDAMENTO", percentComplete: 30 } }), sc({ kind: "ESCOPO_RETIRAR", wbsIds: [], taskIds: ["B"] }));
    expect(started.removed).toEqual([]);
    expect(started.effects[0]).toMatchObject({ key: "removeStarted", vars: { code: "T02" } });
    const must = simulate(small(), sc({ kind: "ESCOPO_RETIRAR", wbsIds: [], taskIds: ["B"] }));
    expect(must.risks.find((x) => x.id === "MUST_RETIRADO")).toMatchObject({ severity: "CRITICO", vars: { codes: "T02" } });
  });

  it("incluir entrega: entra depois de D, alonga o prazo e o custo; ligação que criaria ciclo é recusada", () => {
    const r = simulate(small(), sc({ kind: "ESCOPO_INCLUIR", title: "Manual do usuário", phase: "ENCERRAMENTO", durationDays: 2, budget: 1500, afterTaskId: "D" }));
    const added = r.model.tasks.find((t) => t.id === r.added[0])!;
    expect(added).toMatchObject({ code: "T05", title: "Manual do usuário", phase: "ENCERRAMENTO", budget: 1500 });
    expect(r.schedule.finish).toBe(9);
    expect(r.cost).toMatchObject({ plannedWork: 11_500, eac: 11_500, overrun: 1500, reserveUsed: 1000, shortfall: 500 });
    expect(r.criticalChange.entered).toEqual([added.id]);
    const cycle = simulate(small(), sc({ kind: "ESCOPO_INCLUIR", title: "Volta", phase: "EXECUCAO", durationDays: 1, budget: 0, afterTaskId: "D", beforeTaskId: "B" }));
    expect(cycle.effects.map((e) => e.key)).toEqual(["addCycle", "add"]);
    expect(cycle.schedule.ok).toBe(true);
  });

  it("mudar o esforço: só o que falta fazer muda (atividade pela metade cresce na metade restante)", () => {
    const r = simulate(small(), sc({ kind: "ESCOPO_ESFORCO", pct: 50, target: { taskIds: ["C"] } }));
    expect(r.model.tasks.find((t) => t.id === "C")).toMatchObject({ durationDays: 6, budget: 6000 });
    expect(r.schedule.finish).toBe(9);
    const half = simulate(small({ B: { status: "EM_ANDAMENTO", percentComplete: 50 } }), sc({ kind: "ESCOPO_ESFORCO", pct: 100, target: { taskIds: ["B"] } }));
    expect(half.model.tasks.find((t) => t.id === "B")).toMatchObject({ durationDays: 4.5, budget: 4500 });
    // seletor vazio = todas as não concluídas; a concluída (A) não muda
    const all = simulate(small(), sc({ kind: "ESCOPO_ESFORCO", pct: -50, target: ALL }));
    expect(all.model.tasks.map((t) => t.durationDays)).toEqual([2, 1.5, 2, 0.5]);
  });

  it("indisponibilidade: ausência pausa a atividade em andamento ou adia a que começaria; capacidade estica", () => {
    // fora do dia 3 ao 7: C (dias 2–6) pausa 4 dias
    const pause = simulate(small(), sc({ kind: "INDISPONIBILIDADE", userId: "u1", mode: "AUSENCIA", days: 4, fromDate: "2026-01-08", capacityPct: 100 }));
    expect(pause.effects[0]).toMatchObject({ key: "absencePause", vars: { code: "T03", days: 4 } });
    expect(pause.schedule.finish).toBe(11);
    // fora do dia 0 ao 3: C começaria no dia 2 e espera a volta
    const wait = simulate(small(), sc({ kind: "INDISPONIBILIDADE", userId: "u1", mode: "AUSENCIA", days: 3, fromDate: "2026-01-05", capacityPct: 100 }));
    expect(wait.effects[0]).toMatchObject({ key: "absenceWait", vars: { code: "T03", fromDays: 2, toDays: 3 } });
    expect(wait.schedule).toMatchObject({ finish: 8, constrained: ["C"] });
    // u2 a 50 %: B 3 → 6 e D 1 → 2
    const cap = simulate(small(), sc({ kind: "INDISPONIBILIDADE", userId: "u2", mode: "CAPACIDADE", days: 0, capacityPct: 50 }));
    expect(cap.schedule.finish).toBe(10);
    expect(cap.resourceHit).toEqual(["B", "D"]);
  });

  it("reajuste de preço: linha de orçamento vira custo certo; atividade encarece no que falta", () => {
    const line = simulate(small(), sc({ kind: "REAJUSTE_PRECO", pct: 10, budgetLineIds: ["L1"], target: {} }));
    expect(line.cost).toMatchObject({ extraPrice: 200, eac: 10_200, reserveUsed: 200 });
    expect(line.effects[0]).toMatchObject({ key: "priceLine", vars: { line: "Licenças", fromBrl: 2000, toBrl: 2200 } });
    const task = simulate(small(), sc({ kind: "REAJUSTE_PRECO", pct: 25, budgetLineIds: [], target: { taskIds: ["A", "C"] } }));
    expect(task.model.tasks.find((t) => t.id === "C")!.budget).toBe(5000);
    expect(task.effects.map((e) => e.key)).toEqual(["priceDone", "priceTask"]);
    expect(task.cost.eac).toBe(11_000);
    expect(task.schedule.finish).toBe(7);
  });
});

describe("regras gerais", () => {
  it("o projeto nunca é alterado: o cenário trabalha numa cópia", () => {
    const p = small();
    const before = JSON.stringify(p);
    simulateAll(p, [
      sc({ kind: "ESCOPO_RETIRAR", wbsIds: ["w2"], taskIds: [] }, { kind: "ESCOPO_ESFORCO", pct: 30, target: ALL }, { kind: "CORTE_ORCAMENTO", mode: "PERCENTUAL", value: 20, source: "RESERVA" }),
      sc({ kind: "ATRASO_FORNECEDOR", days: 3, mode: "ENTREGA", target: { taskIds: ["B"] } }, { kind: "REAJUSTE_PRECO", pct: 5, budgetLineIds: ["L2"], target: { taskIds: ["B"] } }),
    ]);
    expect(JSON.stringify(p)).toBe(before);
  });

  it("determinístico: a mesma entrada e a mesma semente dão o mesmo resultado; outra semente sorteia outro", () => {
    const p = small({ B: { pert: { o: 2, m: 3, p: 8 } }, C: { pert: { o: 3, m: 4, p: 6 } } });
    const s = sc({ kind: "ATRASO_FORNECEDOR", days: 1, mode: "DURACAO", target: { taskIds: ["C"] } });
    const a = simulate(p, s, { runs: 1500, seed: 7 });
    const b = simulate(p, s, { runs: 1500, seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // o Monte Carlo é o do motor da Mesa, sobre a rede do cenário
    const net = scenarioNetwork(applyLevers(p, s.levers));
    const mc = monteCarlo(net.tasks, net.deps, { runs: 1500, seed: 7 });
    if ("error" in mc) throw new Error("ciclo");
    expect(a.mc).toMatchObject({ p50: mc.p50, p80: mc.p80, probability: probabilityWithin(mc, a.mc!.target), runs: 1500, seed: 7 });
    const other = simulate(p, s, { runs: 1500, seed: 8 });
    expect(other.mc!.p80).not.toBe(a.mc!.p80);
  });

  it("alavanca inválida é recusada com o motivo e as outras continuam valendo", () => {
    const p = small();
    expect(validateLever({ kind: "CORTE_ORCAMENTO", mode: "PERCENTUAL", value: 120, source: "RESERVA" }, p)).toBe("VALOR_INVALIDO");
    expect(validateLever({ kind: "ATRASO_FORNECEDOR", days: 3, mode: "ENTREGA", target: { keywords: ["inexistente"] } }, p)).toBe("SEM_ALVO");
    expect(validateLever({ kind: "ESCOPO_INCLUIR", title: "  ", phase: "EXECUCAO", durationDays: 1, budget: 0 }, p)).toBe("TEXTO_VAZIO");
    const r = simulate(p, sc({ kind: "ESCOPO_ESFORCO", pct: 0, target: ALL }, { kind: "ATRASO_FORNECEDOR", days: 2, mode: "DURACAO", target: { keywords: ["acabamento"] } }));
    expect(r.invalid).toEqual([{ lever: 0, error: "VALOR_INVALIDO" }]);
    expect(r.schedule.finish).toBe(9);
  });

  it("seletor: ids, palavra no título (sem acento) e atividades ligadas a um risco", () => {
    const p = { ...small(), risks: [{ id: "k1", title: "Fornecedor atrasa", kind: "AMEACA" as const, probability: 0.4, impact: 5000, impactLevel: 3, taskIds: ["D"], status: "ABERTO" as const }] };
    expect(resolveTargets(p, { taskIds: ["B"], keywords: ["ACABAMENTO"], riskIds: ["k1"] })).toEqual(["B", "C", "D"]);
    // o cenário que mexe em D lembra o risco registrado ligado a ela
    const r = simulate(p, sc({ kind: "ATRASO_FORNECEDOR", days: 2, mode: "ENTREGA", target: { riskIds: ["k1"] } }));
    expect(r.risks.find((x) => x.id === "RISCO_REGISTRADO")).toMatchObject({ key: "RISCO_REGISTRADO:k1", vars: { title: "Fornecedor atrasa", probabilityPct: 40, impactBrl: 5000, codes: "T04" } });
  });

  it("cruza com o Espelho: o corte que tira a análise de LGPD do DEMO perde o item da LGPD", () => {
    const r = simulate(buildDemoProject(), demoScenarios()[0]!);
    expect(r.removed).toEqual(["tC"]);
    expect(r.cost.cut).toMatchObject({ base: 70_000, requested: 7000, fromScope: 3000, uncovered: 4000 });
    expect(r.complianceDelta.lost).toEqual(["LGPD_BASE"]);
    expect(r.risks.filter((x) => x.isNew).map((x) => x.id)).toEqual(["CORTE_DESCOBERTO", "CONFORMIDADE"]);
  });
});

describe("cenários de exemplo do DEMO e comparação", () => {
  const { baseline, results } = simulateAll(buildDemoProject(), demoScenarios());
  const [corte, nuvem, relatorios] = results as [typeof results[number], typeof results[number], typeof results[number]];

  it("nuvem 10 dias atrasada: término 26/11 (+10), T06 espera o fornecedor e o risco registrado acontece", () => {
    expect(nuvem.schedule).toMatchObject({ finish: 24, finishDate: "2026-11-26", constrained: ["tD"] });
    expect(nuvem.criticalChange.left).toEqual(["tA", "tB", "tM"]);
    expect(nuvem.risks.find((x) => x.id === "RISCO_REGISTRADO")?.vars).toMatchObject({ title: "Atraso na contratação de nuvem", impactBrl: 50_000 });
  });

  it("módulo de relatórios + nuvem 15 % mais cara: +5 dias e a contingência não cobre", () => {
    expect(relatorios.schedule.finish).toBe(19);
    expect(relatorios.cost).toMatchObject({ plannedWork: 58_000, extraPrice: 1200, reserveUsed: 15_000, shortfall: 1084.22 });
    expect(relatorios.risks.filter((x) => x.isNew).map((x) => x.id)).toEqual(expect.arrayContaining(["PRAZO", "RESERVA_ESTOURADA", "IDPT", "CAMINHO_CRITICO"]));
  });

  it("leitura ✦ só com os números do motor", () => {
    const lines = scenarioNarrative(nuvem, baseline);
    expect(lines[0]).toEqual({ key: "headline", tone: "NEUTRO", vars: { name: "Fornecedor de nuvem atrasa 10 dias", finishDate: "2026-11-26", deltaDays: 10, eacBrl: 55_934.67, deltaBrl: 0 } });
    expect(lines.map((l) => l.key)).toEqual(expect.arrayContaining(["probability", "con.finish", "con.probability", "con.risks"]));
    const cmp = compareNarrative(results);
    expect(cmp.find((l) => l.key === "compare.earliest")?.vars.name).toBe(corte.scenario.name);
    expect(cmp.find((l) => l.key === "compare.cheapest")?.vars).toMatchObject({ name: corte.scenario.name, eacBrl: corte.cost.eac });
    expect(cmp.find((l) => l.key === "compare.shortfall")?.vars).toMatchObject({ names: relatorios.scenario.name, n: 1 });
  });

  it("?compare=a,b,c: até 3 ids distintos, na ordem", () => {
    expect(parseCompare("a, b,a,,c,d")).toEqual({ ids: ["a", "b", "c"], ignored: ["d"] });
    expect(parseCompare(null)).toEqual({ ids: [], ignored: [] });
    expect(compareParam(["x", "", "y"])).toBe("x,y");
  });

  it("repositório DEMO de cenários salvos por projeto", () => {
    const repo = createMemoryScenarioRepository(demoScenarios());
    expect(repo.list("decia-v1").map((s) => s.id)).toEqual(["sc-corte-escopo", "sc-nuvem-atrasa", "sc-relatorios"]);
    const before = repo.snapshot();
    repo.remove("sc-corte-escopo");
    expect(repo.snapshot()).toBe(before + 1);
    expect(repo.list("decia-v1")).toHaveLength(2);
    expect(repo.list("outro")).toEqual([]);
  });
});

describe("enviar à aprovação pelo caminho existente, sem alterar o plano", () => {
  const ctx = { actorId: "u-pessoa", now: new Date("2026-11-12T12:00:00Z") };

  it("impacto nas seis restrições a partir do cenário", () => {
    expect([0, 0.03, 0.08, 0.15, 0.3, 0.6].map(impactLevel)).toEqual([0, 1, 2, 3, 4, 5]);
    const { baseline, results } = simulateAll(buildDemoProject(), demoScenarios());
    const relatorios = results[2]!;
    expect(approvalImpact(relatorios, baseline)).toEqual({ scope: 3, scheduleDays: 5, cost: 10_150, quality: 0, resources: 0, risk: 5 });
    const cmd = approvalCommand(relatorios, baseline, { title: "Cenário: relatórios", sevenRs: { reason: "x" } });
    expect(cmd).toMatchObject({ type: "CHANGE_REQUEST", changeType: "NORMAL", title: "Cenário: relatórios" });
  });

  it("abre a mudança, leva ao comitê no DECIA e não mexe em atividades nem orçamento", () => {
    let model = buildDemoProject();
    const dispatched: ProjectCommand[] = [];
    const dispatch = (cmd: ProjectCommand): CommandResult => {
      dispatched.push(cmd);
      const r = applyCommand(model, cmd, ctx);
      if (r.ok) model = r.model;
      return r;
    };
    const decisions = createMemoryRepository([]);
    const { baseline, results } = simulateAll(model, demoScenarios());
    const tasksBefore = JSON.stringify(model.tasks);
    const budgetBefore = JSON.stringify([model.budgetLines, model.reserves, model.baseline]);
    const r = submitForApproval(dispatch, results[1]!, baseline, { title: "Cenário: nuvem atrasa", sevenRs: { reason: "Simulação" } }, (m, c) => openChangeDecision(decisions, m, c, ctx.actorId, ctx.now));
    expect(r).toMatchObject({ ok: true, changeCode: "MUD-02" });
    if (!r.ok) return;
    expect(dispatched.map((c) => c.type)).toEqual(["CHANGE_REQUEST", "CHANGE_SET_STATUS", "LINK_DECISION"]);
    const change = model.changes.find((c) => c.id === r.changeId)!;
    expect(change).toMatchObject({ status: "EM_ANALISE", decisionId: r.decisionId, type: "NORMAL", impact: { scheduleDays: 10, cost: 0 } });
    expect(model.decisionIds).toContain(r.decisionId);
    expect(decisions.get(r.decisionId)?.decision.projectId).toBe(model.id);
    expect(JSON.stringify(model.tasks)).toBe(tasksBefore);
    expect(JSON.stringify([model.budgetLines, model.reserves, model.baseline])).toBe(budgetBefore);
  });

  it("projeto arquivado recusa o envio", () => {
    const model = { ...buildDemoProject(), closure: { ...buildDemoProject().closure, archived: true } };
    const { baseline, results } = simulateAll(model, demoScenarios());
    const r = submitForApproval((cmd) => applyCommand(model, cmd, ctx), results[0]!, baseline, { title: "x", sevenRs: {} }, () => ({ decisionId: "d", commands: [] }));
    expect(r).toEqual({ ok: false, error: "PROJETO_BLOQUEADO" });
  });

  it("evaluateScenario sem comparação serve para o retrato salvo", () => {
    const o = evaluateScenario(small(), sc());
    expect(o.schedule.finish).toBe(7);
    expect(o.effects).toEqual([]);
  });
});
