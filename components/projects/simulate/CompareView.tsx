"use client";
/**
 * Comparação lado a lado de até três cenários com a linha de base (RF31.CA03, `CompareTable`): tabela acessível (caption, th com
 * scope) e dois gráficos SVG simples — prazo (término pelo CPM com a faixa P50–P80 do Monte Carlo e o prazo-alvo) e custo
 * projetado (ENT com o orçamento aprovado e a contingência). Um gráfico por medida (nunca dois eixos); a tabela é a vista dos dados.
 */
import { useI18n } from "@/lib/i18n/useI18n";
import type { Outcome, ScenarioResult } from "@/lib/projects/simulation/engine";
import { cn } from "@/components/ui";
import { fmt } from "../shared";
import { fmtDays, signed } from "./shared";

const LETTERS = ["A", "B", "C"];

interface Column { label: string; name: string; o: Outcome; r?: ScenarioResult }

export function CompareTable({ baseline, results }: { baseline: Outcome; results: readonly ScenarioResult[] }) {
  const { t, intl } = useI18n();
  const cols: Column[] = [
    { label: t("sim.compare.baseline"), name: t("sim.compare.baselineHint"), o: baseline },
    ...results.map((r, i) => ({ label: LETTERS[i] ?? String(i + 1), name: r.scenario.name, o: r, r })),
  ];
  const days = (v: number) => t("pm.ui.daysShort", { n: fmtDays(intl, v) });
  const money = (v: number) => fmt.money(intl, v);
  const code = (o: Outcome, id: string) => o.model.tasks.find((x) => x.id === id)?.code ?? id;
  const rows: { key: string; label: string; cell: (c: Column) => string }[] = [
    { key: "finish", label: t("sim.compare.finish"), cell: (c) => (c.o.schedule.ok ? `${fmt.date(intl, c.o.schedule.finishDate)} (${t("sim.report.dayN", { n: fmtDays(intl, c.o.schedule.finish) })})` : "—") },
    { key: "deltaFinish", label: t("sim.compare.deltaFinish"), cell: (c) => (c.r ? signed(days(Math.abs(c.r.deltas.finishDays)), c.r.deltas.finishDays) : "—") },
    { key: "critical", label: t("sim.compare.critical"), cell: (c) => c.o.schedule.critical.map((id) => code(c.o, id)).join(" → ") || "—" },
    { key: "probability", label: t("sim.compare.probability"), cell: (c) => (c.o.mc ? fmt.percent(intl, c.o.mc.probability) : "—") },
    { key: "p50p80", label: t("sim.compare.p50p80"), cell: (c) => (c.o.mc ? `${days(c.o.mc.p50)} / ${days(c.o.mc.p80)}` : "—") },
    { key: "planned", label: t("sim.compare.planned"), cell: (c) => money(c.o.cost.plannedWork) },
    { key: "eac", label: t("sim.compare.eac"), cell: (c) => money(c.o.cost.eac) },
    { key: "vac", label: t("sim.compare.vac"), cell: (c) => money(c.o.cost.vac) },
    { key: "reserve", label: t("sim.compare.reserve"), cell: (c) => `${money(c.o.cost.reserveUsed)} (${fmt.percent(intl, c.o.cost.reserveUsedPct)})` },
    { key: "shortfall", label: t("sim.compare.shortfall"), cell: (c) => (c.o.cost.shortfall > 0 ? money(c.o.cost.shortfall) : "—") },
    { key: "risks", label: t("sim.compare.risks"), cell: (c) => (c.r ? String(c.r.risks.filter((x) => x.isNew).length) : String(c.o.risks.length)) },
    { key: "compliance", label: t("sim.compare.compliance"), cell: (c) => (c.o.compliance.percent === null ? "—" : fmt.percent(intl, c.o.compliance.percent / 100)) },
  ];
  return (
    <div className="overflow-x-auto rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1">
      <table className="w-full min-w-[36rem] border-collapse text-[length:var(--ws-text-body-sm)]" data-compare-table>
        <caption className="sr-only">{t("sim.compare.caption")}</caption>
        <thead>
          <tr className="border-b border-ws-border bg-ws-surface-2 text-left">
            <th scope="col" className="p-2 font-semibold">{t("sim.compare.metric")}</th>
            {cols.map((c) => (
              <th key={c.label} scope="col" className="p-2 align-bottom font-semibold">
                <span className="block">{c.label}</span>
                <span className="block max-w-[14rem] font-normal text-ws-text-muted [overflow-wrap:anywhere]">{c.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-ws-border last:border-0" data-row={row.key}>
              <th scope="row" className="p-2 text-left font-semibold">{row.label}</th>
              {cols.map((c) => (
                <td key={c.label} className={cn("p-2 align-top tabular-nums", c.r ? "" : "text-ws-text-muted")}>{row.cell(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ gráficos

const W = 440;
const LABEL = 44;
const RIGHT = 84;
const TOP = 26;
const ROW = 34;
const BAR = 16;

/** Barra horizontal com a ponta de dados arredondada (4px) e a base reta. */
function barPath(x0: number, y: number, w: number, h: number, r = 4): string {
  if (w <= 0) return "";
  const rr = Math.min(r, w, h / 2);
  return `M${x0},${y} H${x0 + w - rr} Q${x0 + w},${y} ${x0 + w},${y + rr} V${y + h - rr} Q${x0 + w},${y + h} ${x0 + w - rr},${y + h} H${x0} Z`;
}

interface ChartRow { label: string; title: string; value: number; low?: number; high?: number; base: boolean; valueText: string }

function BarChart({ rows, refs, ariaLabel, testId }: { rows: ChartRow[]; refs: { value: number; label: string }[]; ariaLabel: string; testId: string }) {
  const H = TOP + rows.length * ROW + 8;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.high ?? 0)), ...refs.map((r) => r.value)) * 1.04;
  const x = (v: number) => LABEL + (Math.max(0, v) / max) * (W - LABEL - RIGHT);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel} data-chart={testId}>
      <line x1={LABEL} x2={LABEL} y1={TOP - 4} y2={H - 4} className="stroke-ws-border" />
      {refs.map((ref, i) => (
        <g key={i}>
          <line x1={x(ref.value)} x2={x(ref.value)} y1={TOP - 6} y2={H - 4} className="stroke-ws-text-muted" strokeWidth={1} />
          <text x={x(ref.value)} y={10 + i * 12} textAnchor={i % 2 ? "start" : "middle"} className="fill-ws-text-muted text-[10px]">{ref.label}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = TOP + i * ROW + (ROW - BAR) / 2;
        const end = Math.max(x(r.value), r.high !== undefined ? x(r.high) : 0);
        return (
          <g key={r.label} data-bar={r.label}>
            <title>{r.title}</title>
            <text x={LABEL - 8} y={y + BAR / 2 + 4} textAnchor="end" className="fill-ws-text text-[11px] font-semibold">{r.label}</text>
            <path d={barPath(LABEL, y, x(r.value) - LABEL, BAR)} className={r.base ? "fill-ws-text-faint" : "fill-ws-accent"} />
            {r.low !== undefined && r.high !== undefined ? (
              <g>
                <line x1={x(r.low)} x2={x(r.high)} y1={y + BAR / 2} y2={y + BAR / 2} className="stroke-ws-text" strokeWidth={2} strokeLinecap="round" />
                <circle cx={x(r.low)} cy={y + BAR / 2} r={4} className="fill-ws-text stroke-ws-surface-1" strokeWidth={2} />
                <circle cx={x(r.high)} cy={y + BAR / 2} r={4} className="fill-ws-text stroke-ws-surface-1" strokeWidth={2} />
              </g>
            ) : null}
            <text x={end + 8} y={y + BAR / 2 + 4} className="fill-ws-text text-[11px] tabular-nums">{r.valueText}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function CompareCharts({ baseline, results }: { baseline: Outcome; results: readonly ScenarioResult[] }) {
  const { t, intl } = useI18n();
  const all: { label: string; name: string; o: Outcome; base: boolean }[] = [
    { label: t("sim.chart.base"), name: t("sim.compare.baseline"), o: baseline, base: true },
    ...results.map((r, i) => ({ label: LETTERS[i] ?? String(i + 1), name: r.scenario.name, o: r as Outcome, base: false })),
  ];
  const days = (v: number) => t("pm.ui.daysShort", { n: fmtDays(intl, v) });
  const money = (v: number) => fmt.money(intl, v);
  const target = baseline.mc?.target;
  const timeRows: ChartRow[] = all.map((c) => ({
    label: c.label, base: c.base, value: c.o.schedule.finish, low: c.o.mc?.p50, high: c.o.mc?.p80, valueText: days(c.o.schedule.finish),
    title: t("sim.chart.timeTitle", { name: c.name, finish: days(c.o.schedule.finish), p50: c.o.mc ? days(c.o.mc.p50) : "—", p80: c.o.mc ? days(c.o.mc.p80) : "—" }),
  }));
  const costRows: ChartRow[] = all.map((c) => ({
    label: c.label, base: c.base, value: c.o.cost.eac, valueText: money(c.o.cost.eac), title: t("sim.chart.costTitle", { name: c.name, eac: money(c.o.cost.eac), reserve: money(c.o.cost.reserveUsed) }),
  }));
  const approved = baseline.cost.approvedBac;
  const timeLabel = t("sim.chart.timeAria", { rows: timeRows.map((r) => `${r.label} ${r.valueText}`).join("; "), target: target !== undefined ? days(target) : "—" });
  const costLabel = t("sim.chart.costAria", { rows: costRows.map((r) => `${r.label} ${r.valueText}`).join("; "), budget: money(approved), contingency: money(approved + baseline.cost.contingency) });
  return (
    <div className="grid gap-[var(--ws-space-4)] lg:grid-cols-2">
      <figure className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
        <figcaption className="grid gap-0.5">
          <span className="text-[length:var(--ws-text-body)] font-semibold">{t("sim.chart.timeHeading")}</span>
          <span className="flex flex-wrap gap-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block h-2.5 w-4 rounded-r-[4px] bg-ws-accent" />{t("sim.chart.keyCpm")}</span>
            <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block h-0.5 w-4 bg-ws-text" />{t("sim.chart.keyRange")}</span>
            <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block h-3 w-px bg-ws-text-muted" />{t("sim.chart.keyTarget")}</span>
          </span>
        </figcaption>
        <BarChart rows={timeRows} refs={target !== undefined ? [{ value: target, label: t("sim.chart.target", { d: days(target) }) }] : []} ariaLabel={timeLabel} testId="time" />
      </figure>
      <figure className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)]">
        <figcaption className="grid gap-0.5">
          <span className="text-[length:var(--ws-text-body)] font-semibold">{t("sim.chart.costHeading")}</span>
          <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("sim.chart.costKey")}</span>
        </figcaption>
        <BarChart rows={costRows} refs={[{ value: approved, label: t("sim.chart.budget") }, { value: approved + baseline.cost.contingency, label: t("sim.chart.withContingency") }]} ariaLabel={costLabel} testId="cost" />
      </figure>
    </div>
  );
}
