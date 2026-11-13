/**
 * Motor do Simulador de Cenários (RF31, `ScenarioService.recalculate`) — determinístico (D-12). Para cada cenário:
 *  1. aplica as alavancas numa CÓPIA do modelo (`levers.ts`);
 *  2. recalcula a rede pelo CPM (`engine/schedule.ts`), com as restrições "não começa antes de" como nós de duração fixa;
 *  3. sorteia o cronograma por Monte Carlo Beta-PERT (`engine/montecarlo.ts`) com SEMENTE fixa — a mesma semente em todos os
 *     cenários (números aleatórios comuns): a diferença entre cenários vem das alavancas, não do sorteio;
 *  4. projeta o custo pelo valor agregado (`engine/evm.ts`): ENT = custo planejado do trabalho ÷ IDC + custos certos (reajuste de
 *     linhas e custo indireto do atraso); o estouro sobre o orçamento do trabalho sai da reserva de contingência;
 *  5. confere os riscos que disparam e cruza com o Espelho de Conformidade (RF32): o que o cenário tira da conformidade.
 * Tudo é comparado à LINHA DE BASE = o mesmo projeto sem alavancas, calculado pelo mesmo motor (maçãs com maçãs).
 */
import { evaluateMirror } from "../compliance/evaluate";
import type { MirrorContext } from "../compliance/types";
import { effectiveDuration, scheduleOf } from "../derive";
import { earnedAndActual, evm, plannedValueAt } from "../engine/evm";
import { riskExposure } from "../engine/methods";
import { monteCarlo, probabilityWithin, type MonteCarloTask } from "../engine/montecarlo";
import { dateToOffset, offsetToDate, schedule, type SchedDep } from "../engine/schedule";
import type { IsoDate, ProjectModel } from "../types";
import { applyLevers, SNET_PREFIX, type Applied, type CutOutcome, type LeverError } from "./levers";
import { DEFAULT_RUNS, DEFAULT_SEED, type Effect, type Scenario, type SimulationAssumptions } from "./types";

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const EPS = 0.005;

export interface ScheduleOutcome {
  ok: boolean;
  cycle?: string[];
  finish: number;
  finishDate: IsoDate;
  /** atividades críticas, na ordem da rede (os nós de restrição não aparecem: viram `constrained`) */
  critical: string[];
  /** atividades cujo início é comandado por uma restrição do cenário (entrega do fornecedor, volta da pessoa) */
  constrained: string[];
  rows: Record<string, { es: number; ef: number; duration: number; totalFloat: number; critical: boolean }>;
}

export interface MonteCarloOutcome { runs: number; seed: number; target: number; targetDate: IsoDate; probability: number; hits: number; p50: number; p80: number; p95: number; mean: number; sd: number }

export interface CostOutcome {
  /** orçamento aprovado do trabalho (ONT da linha de base; sem linha de base, o custo planejado atual) */
  approvedBac: number;
  /** orçamento do trabalho depois de um corte nas linhas */
  workBudget: number;
  /** custo planejado do trabalho no cenário (Σ orçamento das atividades da cópia) */
  plannedWork: number;
  extraPrice: number;
  extraDelay: number;
  savings: number;
  ev: number;
  ac: number;
  cpi: number | null;
  /** ENT projetado = custo planejado do trabalho ÷ IDC + custos certos */
  eac: number;
  /** VNT = orçamento do trabalho − ENT (negativo = acima do orçamento) */
  vac: number;
  /** IDPT = (custo planejado do trabalho − VA) ÷ (orçamento do trabalho − CR): desempenho de custo necessário para caber no orçamento */
  tcpi: number | null;
  contingency: number;
  management: number;
  overrun: number;
  reserveUsed: number;
  reserveUsedPct: number;
  shortfall: number;
  /** exposição líquida dos riscos abertos (VME das ameaças − oportunidades) */
  exposure: number;
  cut: CutOutcome;
}

export type RiskId =
  | "PRAZO" | "PROBABILIDADE" | "RESERVA_ESTOURADA" | "RESERVA_VME" | "IDPT" | "CORTE_DESCOBERTO" | "MUST_RETIRADO"
  | "RISCO_REGISTRADO" | "CAMINHO_CRITICO" | "CONFORMIDADE";
export interface TriggeredRisk { id: RiskId; key: string; severity: "CRITICO" | "ATENCAO"; vars: Record<string, string | number>; isNew: boolean }

export interface Why { key: string; vars: Record<string, string | number> }

export interface Outcome {
  scenario: Scenario;
  /** cópia simulada (nunca o projeto) */
  model: ProjectModel;
  schedule: ScheduleOutcome;
  mc: MonteCarloOutcome | null;
  cost: CostOutcome;
  effects: Effect[];
  invalid: { lever: number; error: LeverError }[];
  removed: string[];
  added: string[];
  hit: string[];
  resourceHit: string[];
  scopeChange: number;
  risks: TriggeredRisk[];
  compliance: { percent: number | null; met: string[]; applicable: number };
  why: Record<"finish" | "probability" | "p80" | "eac" | "vac" | "reserve", Why>;
}

export interface ScenarioResult extends Outcome {
  deltas: { finishDays: number; eacBrl: number; probabilityPts: number | null; p80Days: number | null; reserveUsedBrl: number; compliancePts: number | null };
  criticalChange: { entered: string[]; left: string[]; removed: string[] };
  complianceDelta: { lost: string[]; gained: string[] };
}

/** Rede do cenário: atividades da cópia + nós "não começa antes de" (duração fixa a partir do dia 0). */
export function scenarioNetwork(applied: Pick<Applied, "model" | "constraints">): { tasks: MonteCarloTask[]; deps: SchedDep[] } {
  const tasks: MonteCarloTask[] = applied.model.tasks.map((t) => ({ id: t.id, duration: effectiveDuration(t), pert: t.milestone ? undefined : t.pert }));
  const deps: SchedDep[] = applied.model.dependencies.map((d) => ({ from: d.from, to: d.to, type: d.type, lag: d.lagDays }));
  for (const [id, c] of Object.entries(applied.constraints)) {
    if (!applied.model.tasks.some((t) => t.id === id)) continue;
    tasks.push({ id: `${SNET_PREFIX}${id}`, duration: c.at });
    deps.push({ from: `${SNET_PREFIX}${id}`, to: id, type: "FS", lag: 0 });
  }
  return { tasks, deps };
}

const clampRuns = (runs?: number) => Math.max(100, Math.min(20_000, Math.round(runs ?? DEFAULT_RUNS)));

/** Calcula um cenário em termos absolutos (sem comparar). `baseFinish` = término sem alavancas (para o custo do atraso). */
export function evaluateScenario(model: ProjectModel, scenario: Scenario, a: SimulationAssumptions = {}, ctx: { baseFinish?: number; compliance?: MirrorContext } = {}): Outcome {
  const applied = applyLevers(model, scenario.levers);
  const net = scenarioNetwork(applied);
  const s = schedule(net.tasks, net.deps);
  const original = scheduleOf(model);
  const baseFinish = ctx.baseFinish ?? (original.ok ? original.finish : 0);
  const target = a.targetFinish ?? model.baseline?.finish ?? baseFinish;
  const runs = clampRuns(a.runs);
  const seed = a.seed ?? DEFAULT_SEED;
  const real = new Set(applied.model.tasks.map((t) => t.id));

  let sched: ScheduleOutcome;
  let mc: MonteCarloOutcome | null = null;
  if (!s.ok) {
    sched = { ok: false, cycle: "cycle" in s ? s.cycle : [], finish: 0, finishDate: model.startDate, critical: [], constrained: [], rows: {} };
  } else {
    const rows: ScheduleOutcome["rows"] = {};
    for (const id of s.order) if (real.has(id)) {
      const row = s.rows[id]!;
      rows[id] = { es: row.es, ef: row.ef, duration: row.duration, totalFloat: row.totalFloat, critical: row.critical };
    }
    const constrained = s.criticalPath.filter((id) => id.startsWith(SNET_PREFIX)).map((id) => id.slice(SNET_PREFIX.length)).filter((id) => real.has(id));
    sched = { ok: true, finish: s.finish, finishDate: offsetToDate(model.startDate, s.finish), critical: s.criticalPath.filter((id) => real.has(id)), constrained, rows };
    const m = monteCarlo(net.tasks, net.deps, { runs, seed });
    if (!("error" in m)) {
      const probability = probabilityWithin(m, target);
      mc = { runs: m.runs, seed, target, targetDate: offsetToDate(model.startDate, target), probability, hits: Math.round(probability * m.runs), p50: m.p50, p80: m.p80, p95: m.p95, mean: m.mean, sd: m.sd };
    }
  }

  // ---------- custo (o passado não muda: VA e CR vêm do projeto real)
  const { ev, ac, bac: plannedOriginal } = earnedAndActual(model.tasks);
  const approvedBac = model.baseline?.bac ?? plannedOriginal;
  const statusOffset = dateToOffset(model.startDate, model.statusDate);
  const pv = model.baseline
    ? plannedValueAt(model.baseline.tasks, Object.fromEntries(Object.entries(model.baseline.tasks).map(([id, b]) => [id, b.budget])), statusOffset)
    : original.ok ? plannedValueAt(original.rows, Object.fromEntries(model.tasks.map((t) => [t.id, t.budget])), statusOffset) : 0;
  const plannedWork = r2(applied.model.tasks.reduce((sum, t) => sum + t.budget, 0));
  const e = evm({ pv, ev, ac, bac: plannedWork });
  const slip = sched.ok ? Math.max(0, sched.finish - baseFinish) : 0;
  const extraDelay = r2(Math.max(0, a.dailyOverhead ?? 0) * slip);
  const eac = r2((e.eac ?? plannedWork) + applied.extraPrice + extraDelay);
  const workBudget = r2(approvedBac - applied.cut.fromLines);
  const overrun = r2(Math.max(0, eac - workBudget));
  const { contingency, management } = applied.reserves;
  const reserveUsed = r2(Math.min(overrun, contingency));
  const shortfall = r2(Math.max(0, overrun - contingency));
  const exposure = riskExposure(applied.model.risks.map((r) => ({ ...r, closed: r.status !== "ABERTO" }))).net;
  // IDPT = trabalho que falta (valor planejado) ÷ dinheiro que falta: corte sem reduzir o trabalho ou escopo novo sem orçamento novo
  // exigem desempenho de custo melhor que o atual para caber no orçamento
  const tcpi = Math.abs(workBudget - ac) > EPS ? r4((plannedWork - ev) / (workBudget - ac)) : null;
  const cost: CostOutcome = {
    approvedBac, workBudget, plannedWork, extraPrice: applied.extraPrice, extraDelay, savings: applied.savings, ev, ac, cpi: e.cpi, eac, vac: r2(workBudget - eac), tcpi,
    contingency, management, overrun, reserveUsed, reserveUsedPct: contingency > 0 ? r4(reserveUsed / contingency) : overrun > 0 ? 1 : 0, shortfall, exposure, cut: applied.cut,
  };

  // ---------- conformidade da cópia (Espelho, RF32)
  const mirror = evaluateMirror(applied.model, ctx.compliance);
  const compliance = { percent: mirror.score.percent, met: mirror.items.filter((r) => r.status === "ATENDIDO").map((r) => r.item.id), applicable: mirror.score.applicable };

  // ---------- quanto o escopo mudou (para o impacto da solicitação de mudança)
  const scopeChange = r2(applied.savings + applied.addedBudget + Math.abs(applied.taskBudgetDelta));

  const outcome: Outcome = {
    scenario, model: applied.model, schedule: sched, mc, cost, effects: applied.effects, invalid: applied.invalid, removed: applied.removed, added: applied.added,
    hit: applied.hit, resourceHit: applied.resourceHit, scopeChange, risks: [], compliance, why: whyOf(applied, sched, mc, cost),
  };
  outcome.risks = absoluteRisks(model, outcome, applied, target);
  return outcome;
}

const codesOf = (model: ProjectModel, ids: readonly string[]) => ids.map((id) => model.tasks.find((t) => t.id === id)?.code ?? id).join(", ");

function whyOf(applied: Applied, sched: ScheduleOutcome, mc: MonteCarloOutcome | null, cost: CostOutcome): Outcome["why"] {
  const path = sched.critical.map((id) => applied.model.tasks.find((t) => t.id === id)?.code ?? id).join(" → ") || "—";
  return {
    finish: sched.ok ? { key: "finish", vars: { path, finishDays: sched.finish, finishDate: sched.finishDate } } : { key: "finishCycle", vars: {} },
    probability: mc ? { key: "probability", vars: { hits: mc.hits, runs: mc.runs, targetDays: mc.target, targetDate: mc.targetDate, seed: mc.seed } } : { key: "noMc", vars: {} },
    p80: mc ? { key: "p80", vars: { p50Days: mc.p50, p80Days: mc.p80, runs: mc.runs } } : { key: "noMc", vars: {} },
    eac: cost.cpi !== null
      ? { key: "eac", vars: { plannedBrl: cost.plannedWork, cpiIdx: cost.cpi, extraBrl: r2(cost.extraPrice + cost.extraDelay), eacBrl: cost.eac } }
      : { key: "eacNoCpi", vars: { plannedBrl: cost.plannedWork, extraBrl: r2(cost.extraPrice + cost.extraDelay), eacBrl: cost.eac } },
    vac: { key: "vac", vars: { budgetBrl: cost.workBudget, eacBrl: cost.eac, vacBrl: cost.vac } },
    reserve: cost.overrun > EPS
      ? { key: cost.shortfall > EPS ? "reserveShort" : "reserve", vars: { overrunBrl: cost.overrun, budgetBrl: cost.workBudget, contingencyBrl: cost.contingency, usedPct: r1(cost.reserveUsedPct * 100), shortfallBrl: cost.shortfall } }
      : { key: "reserveNone", vars: { budgetBrl: cost.workBudget, eacBrl: cost.eac } },
  };
}

function absoluteRisks(original: ProjectModel, o: Outcome, applied: Applied, target: number): TriggeredRisk[] {
  const out: TriggeredRisk[] = [];
  const push = (id: RiskId, severity: TriggeredRisk["severity"], vars: TriggeredRisk["vars"], ref = "") => out.push({ id, key: ref ? `${id}:${ref}` : id, severity, vars, isNew: true });
  const { schedule: s, mc, cost } = o;
  if (s.ok && s.finish > target + 1e-9) push("PRAZO", "CRITICO", { lateDays: r1(s.finish - target), finishDate: s.finishDate, targetDate: offsetToDate(original.startDate, target) });
  if (mc && mc.probability < 0.5) push("PROBABILIDADE", mc.probability < 0.2 ? "CRITICO" : "ATENCAO", { probabilityPct: Math.round(mc.probability * 100), targetDate: mc.targetDate });
  if (cost.shortfall > EPS) push("RESERVA_ESTOURADA", "CRITICO", { shortfallBrl: cost.shortfall, managementBrl: cost.management });
  if (cost.exposure > cost.contingency + EPS) push("RESERVA_VME", "ATENCAO", { contingencyBrl: cost.contingency, exposureBrl: cost.exposure });
  if (cost.tcpi !== null && cost.tcpi > 1.1 && cost.workBudget > cost.ac) push("IDPT", cost.tcpi > 1.2 ? "CRITICO" : "ATENCAO", { tcpiIdx: cost.tcpi, cpiIdx: cost.cpi ?? 0 });
  if (cost.cut.uncovered > EPS) push("CORTE_DESCOBERTO", "CRITICO", { uncoveredBrl: cost.cut.uncovered });
  if (applied.removedMust.length) push("MUST_RETIRADO", "CRITICO", { codes: codesOf(original, applied.removedMust) });
  const hit = new Set(applied.hit);
  for (const r of original.risks) {
    if (r.status !== "ABERTO" || r.kind !== "AMEACA") continue;
    const touched = r.taskIds.filter((id) => hit.has(id));
    if (touched.length) push("RISCO_REGISTRADO", "ATENCAO", { title: r.title, probabilityPct: Math.round(r.probability * 100), impactBrl: r.impact, codes: codesOf(original, touched) }, r.id);
  }
  return out;
}

const sameSet = (a: readonly string[], b: ReadonlySet<string>) => a.filter((x) => !b.has(x));

/** Compara o cenário com a linha de base: deltas, mudança no caminho crítico, conformidade e riscos novos. */
export function compareWithBaseline(o: Outcome, base: Outcome): ScenarioResult {
  const baseCritical = new Set(base.schedule.critical);
  const critical = new Set(o.schedule.critical);
  const removedSet = new Set(o.removed);
  const criticalChange = {
    entered: o.schedule.critical.filter((id) => !baseCritical.has(id)),
    left: base.schedule.critical.filter((id) => !critical.has(id) && !removedSet.has(id)),
    removed: base.schedule.critical.filter((id) => removedSet.has(id)),
  };
  const baseMet = new Set(base.compliance.met);
  const met = new Set(o.compliance.met);
  const complianceDelta = { lost: sameSet(base.compliance.met, met), gained: sameSet(o.compliance.met, baseMet) };
  const risks = [...o.risks];
  if (criticalChange.entered.length) risks.push({ id: "CAMINHO_CRITICO", key: "CAMINHO_CRITICO", severity: "ATENCAO", vars: { codes: codesOf(o.model, criticalChange.entered) }, isNew: true });
  if (complianceDelta.lost.length) risks.push({ id: "CONFORMIDADE", key: "CONFORMIDADE", severity: "ATENCAO", vars: { n: complianceDelta.lost.length }, isNew: true });
  const baseKeys = new Set(base.risks.map((r) => r.key));
  for (const r of risks) r.isNew = !baseKeys.has(r.key);
  return {
    ...o,
    risks,
    criticalChange,
    complianceDelta,
    deltas: {
      finishDays: r2(o.schedule.finish - base.schedule.finish),
      eacBrl: r2(o.cost.eac - base.cost.eac),
      probabilityPts: o.mc && base.mc ? Math.round((o.mc.probability - base.mc.probability) * 100) : null,
      p80Days: o.mc && base.mc ? r2(o.mc.p80 - base.mc.p80) : null,
      reserveUsedBrl: r2(o.cost.reserveUsed - base.cost.reserveUsed),
      compliancePts: o.compliance.percent !== null && base.compliance.percent !== null ? o.compliance.percent - base.compliance.percent : null,
    },
  };
}

/** Linha de base + até N cenários com as MESMAS premissas (prazo-alvo, sorteios e semente). */
export function simulateAll(model: ProjectModel, scenarios: readonly Scenario[], a: SimulationAssumptions = {}, compliance?: MirrorContext): { baseline: Outcome; results: ScenarioResult[] } {
  const baseline = evaluateScenario(model, { id: "linha-de-base", name: "", levers: [] }, a, { compliance });
  const ctx = { baseFinish: baseline.schedule.finish, compliance };
  return { baseline, results: scenarios.map((sc) => compareWithBaseline(evaluateScenario(model, sc, a, ctx), baseline)) };
}

/** Um cenário contra a linha de base. */
export function simulate(model: ProjectModel, scenario: Scenario, a: SimulationAssumptions = {}, compliance?: MirrorContext): ScenarioResult {
  return simulateAll(model, [scenario], a, compliance).results[0]!;
}
