/**
 * Leitura "✦" do Simulador — a IA do app é simulada e determinística (D-12, RF31.CA05 `LocalEngine`): monta frases a partir dos
 * números JÁ calculados pelo motor (`engine.ts`) e nunca cita número que não veio dele. Cada linha é uma chave i18n `sim.ai.<key>`
 * com as variáveis do cálculo; a tela marca tudo com ✦.
 */
import type { Outcome, ScenarioResult } from "./engine";

export interface NarrativeLine { key: string; tone: "NEUTRO" | "PRO" | "CONTRA"; vars: Record<string, string | number> }

const EPS = 0.005;

/** Vantagens e desvantagens do cenário frente à linha de base, só com os números do motor. */
export function scenarioNarrative(r: ScenarioResult, base: Outcome): NarrativeLine[] {
  const lines: NarrativeLine[] = [];
  const d = r.deltas;
  if (r.schedule.ok) lines.push({ key: "headline", tone: "NEUTRO", vars: { name: r.scenario.name, finishDate: r.schedule.finishDate, deltaDays: d.finishDays, eacBrl: r.cost.eac, deltaBrl: d.eacBrl } });
  else lines.push({ key: "cycle", tone: "CONTRA", vars: {} });
  if (r.mc) lines.push({ key: "probability", tone: "NEUTRO", vars: { probabilityPct: Math.round(r.mc.probability * 100), targetDate: r.mc.targetDate, p80Days: r.mc.p80 } });

  const pros: NarrativeLine[] = [];
  const cons: NarrativeLine[] = [];
  if (d.finishDays < -EPS) pros.push({ key: "pro.finish", tone: "PRO", vars: { days: -d.finishDays } });
  if (d.finishDays > EPS) cons.push({ key: "con.finish", tone: "CONTRA", vars: { days: d.finishDays } });
  if (d.eacBrl < -EPS) pros.push({ key: "pro.cost", tone: "PRO", vars: { savedBrl: -d.eacBrl } });
  if (d.eacBrl > EPS) cons.push({ key: "con.cost", tone: "CONTRA", vars: { extraBrl: d.eacBrl } });
  if (d.probabilityPts !== null && d.probabilityPts > 0) pros.push({ key: "pro.probability", tone: "PRO", vars: { pts: d.probabilityPts } });
  if (d.probabilityPts !== null && d.probabilityPts < 0) cons.push({ key: "con.probability", tone: "CONTRA", vars: { pts: -d.probabilityPts } });
  if (d.reserveUsedBrl < -EPS) pros.push({ key: "pro.reserve", tone: "PRO", vars: { savedBrl: -d.reserveUsedBrl } });
  if (d.reserveUsedBrl > EPS) cons.push({ key: "con.reserve", tone: "CONTRA", vars: { extraBrl: d.reserveUsedBrl, usedPct: Math.round(r.cost.reserveUsedPct * 100) } });
  if (r.complianceDelta.gained.length) pros.push({ key: "pro.compliance", tone: "PRO", vars: { n: r.complianceDelta.gained.length } });
  if (r.complianceDelta.lost.length) cons.push({ key: "con.compliance", tone: "CONTRA", vars: { n: r.complianceDelta.lost.length } });
  const newCritical = r.risks.filter((x) => x.isNew && x.severity === "CRITICO").length;
  if (newCritical) cons.push({ key: "con.risks", tone: "CONTRA", vars: { n: newCritical } });

  lines.push(...(pros.length ? pros : [{ key: "noPros", tone: "NEUTRO" as const, vars: {} }]));
  lines.push(...(cons.length ? cons : [{ key: "noCons", tone: "NEUTRO" as const, vars: {} }]));

  // antes de enviar ao comitê: o que a solicitação precisa responder
  if (r.cost.shortfall > EPS) lines.push({ key: "ask.shortfall", tone: "NEUTRO", vars: { shortfallBrl: r.cost.shortfall } });
  else if (r.cost.cut.uncovered > EPS) lines.push({ key: "ask.uncovered", tone: "NEUTRO", vars: { uncoveredBrl: r.cost.cut.uncovered } });
  else if (r.complianceDelta.lost.length) lines.push({ key: "ask.compliance", tone: "NEUTRO", vars: { n: r.complianceDelta.lost.length } });
  else if (r.schedule.ok && base.mc && r.mc && r.mc.p80 > base.mc.target) lines.push({ key: "ask.deadline", tone: "NEUTRO", vars: { p80Days: r.mc.p80, targetDate: r.mc.targetDate } });
  return lines;
}

/** Comparação entre os cenários (só quando há ao menos dois): quem termina antes, quem custa menos, quem tem mais chance. */
export function compareNarrative(results: readonly ScenarioResult[]): NarrativeLine[] {
  const ok = results.filter((r) => r.schedule.ok);
  if (ok.length < 2) return [];
  const by = <T,>(pick: (r: ScenarioResult) => T | null, better: (a: T, b: T) => boolean) =>
    ok.reduce<ScenarioResult | null>((best, r) => {
      const v = pick(r);
      if (v === null) return best;
      if (!best) return r;
      const bv = pick(best);
      return bv === null || better(v, bv) ? r : best;
    }, null);
  const lines: NarrativeLine[] = [];
  const earliest = by((r) => r.schedule.finish, (a, b) => a < b - 1e-9);
  if (earliest) lines.push({ key: "compare.earliest", tone: "NEUTRO", vars: { name: earliest.scenario.name, finishDate: earliest.schedule.finishDate } });
  const cheapest = by((r) => r.cost.eac, (a, b) => a < b - EPS);
  if (cheapest) lines.push({ key: "compare.cheapest", tone: "NEUTRO", vars: { name: cheapest.scenario.name, eacBrl: cheapest.cost.eac } });
  const safest = by((r) => r.mc?.probability ?? null, (a, b) => a > b + 1e-9);
  if (safest?.mc) lines.push({ key: "compare.safest", tone: "NEUTRO", vars: { name: safest.scenario.name, probabilityPct: Math.round(safest.mc.probability * 100) } });
  const short = ok.filter((r) => r.cost.shortfall > EPS).map((r) => r.scenario.name);
  if (short.length) lines.push({ key: "compare.shortfall", tone: "CONTRA", vars: { names: short.join(", "), n: short.length } });
  return lines;
}
