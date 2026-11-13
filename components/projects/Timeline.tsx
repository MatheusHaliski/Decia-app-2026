"use client";
/**
 * Linha do tempo — além do Gantt (aula de projetos, Tema 3): o Gantt mostra QUANDO; a rede (atividade no nó) mostra POR QUÊ
 * (dependências e caminho crítico, CPM); o PERT mostra COM QUE CHANCE (TE, σ, probabilidade de cumprir o prazo); a curva S
 * mostra QUANTO (valor planejado acumulado × valor agregado e custo real na data de status). Tudo vem de `timelineView`/`evmView`.
 */
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, Select, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { makeRef } from "@/lib/projects/canvas";
import { effectiveDuration } from "@/lib/projects/derive";
import { monteCarlo, probabilityWithin, type MonteCarloResult } from "@/lib/projects/engine/montecarlo";
import { pert, probabilityByTarget } from "@/lib/projects/engine/pert";
import { DEPENDENCY_TYPES, dateToOffset, offsetToDate, type DependencyType } from "@/lib/projects/engine/schedule";
import { evmView, timelineView, type TimelineRow, type TimelineView } from "@/lib/projects/views";
import { CommitNumber, Theory } from "./common";
import { TaskInspector } from "./TaskInspector";
import { fmt, type PanelProps } from "./shared";

const LABEL_W = 210;
const ROW_H = 34;
const HEAD_H = 40;

export function Timeline(props: PanelProps) {
  const { model, dispatch, readOnly } = props;
  const { t, intl } = useI18n();
  const [openTask, setOpenTask] = useState<string | null>(null);
  const tl = useMemo(() => timelineView(model), [model]);
  const open = (id: string) => {
    setOpenTask(id);
    props.onSelect?.(makeRef("TASK", id));
  };

  return (
    <div className="grid gap-[var(--ws-space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("pm.tl.statusDate")} hint={t("pm.tl.statusDateHint")}>
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} type="date" value={model.statusDate} disabled={readOnly} onChange={(e) => e.target.value && dispatch({ type: "SET_STATUS_DATE", date: e.target.value })} className="w-44" />
            )}
          </Field>
          <div className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
            <span className="font-semibold">{t("pm.tl.baseline")}</span>
            <span className="text-ws-text-muted">
              {model.baseline ? t("pm.tl.baselineSet", { date: fmt.date(intl, model.baseline.setAt), finish: fmt.number(intl, model.baseline.finish, 1), bac: fmt.money(intl, model.baseline.bac) }) : t("pm.tl.baselineNone")}
            </span>
          </div>
          {!readOnly ? (
            <Button size="sm" variant={model.baseline ? "default" : "primary"} onClick={() => dispatch({ type: "BASELINE_SET" })} disabled={!tl.ok}>
              {t(model.baseline ? "pm.tl.rebaseline" : "pm.tl.setBaseline")}
            </Button>
          ) : null}
        </div>
        <Legend due={model.tasks.some((x) => x.dueAt)} />
      </div>
      {model.baseline ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.tl.rebaselineHint")}</p> : null}

      {!tl.ok ? (
        <div role="alert" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-danger bg-ws-danger-soft p-[var(--ws-space-4)]">
          <p className="font-semibold">{t("pm.tl.cycleTitle")}</p>
          <p className="text-[length:var(--ws-text-body-sm)]">{t("pm.tl.cycle", { codes: (tl.cycle ?? []).map((id) => model.tasks.find((x) => x.id === id)?.code ?? id).join(" → ") })}</p>
          {props.goTo ? <Button size="sm" onClick={() => props.goTo?.("canvas")}>{t("pm.ui.goToTab", { tab: t("pm.tab.canvas") })}</Button> : null}
        </div>
      ) : (
        <>
          <Gantt tl={tl} {...props} onOpen={open} />
          <div className="grid gap-[var(--ws-space-4)] xl:grid-cols-2">
            <PertPanel tl={tl} {...props} />
            <SCurve tl={tl} {...props} />
          </div>
          <MonteCarloCard tl={tl} {...props} />
          <Network tl={tl} {...props} onOpen={open} />
          <CpmTable tl={tl} {...props} onOpen={open} />
          <DependencyTable {...props} />
        </>
      )}
      <TaskInspector {...props} taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function Legend({ due }: { due?: boolean }) {
  const { t } = useI18n();
  const item = (cls: string, key: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-2.5 w-5 rounded-sm", cls)} />
      {t(key)}
    </span>
  );
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-label={t("pm.tl.legend")}>
      {item("bg-ws-danger", "pm.tl.leg.critical")}
      {item("bg-ws-accent", "pm.tl.leg.normal")}
      {item("bg-ws-surface-3 border border-dashed border-ws-border-strong", "pm.tl.leg.float")}
      {item("bg-ws-text-faint", "pm.tl.leg.baseline")}
      {item("bg-ws-warning", "pm.tl.leg.status")}
      {due ? <span className="inline-flex items-center gap-1.5"><span aria-hidden className="text-ws-warning-ink">▼</span>{t("projectPage.gantt.legendDue")}</span> : null}
    </p>
  );
}

// ------------------------------------------------------------------ Gantt
function Gantt({ tl, model, selected, onOpen }: PanelProps & { tl: TimelineView; onOpen: (id: string) => void }) {
  const { t, intl } = useI18n();
  // prazo da atividade (dueAt): fim do dia do prazo, no mesmo eixo de dias do cronograma
  const dueOf = (r: TimelineRow) => (r.task.dueAt ? dateToOffset(model.startDate, r.task.dueAt) + 1 : undefined);
  const days = Math.ceil(Math.max(tl.finish, tl.baselineFinish ?? 0, tl.statusOffset, ...tl.rows.map((r) => Math.max(r.lf, dueOf(r) ?? 0)))) + 1;
  const dw = Math.max(22, Math.min(48, Math.floor(900 / Math.max(1, days))));
  const width = LABEL_W + days * dw + 16;
  const height = HEAD_H + tl.rows.length * ROW_H + 8;
  const x = (d: number) => LABEL_W + d * dw;
  const rowY = new Map(tl.rows.map((r, i) => [r.id, HEAD_H + i * ROW_H]));
  const byId = new Map(tl.rows.map((r) => [r.id, r]));
  const critical = new Set(tl.criticalPath);
  const months = new Map<number, string>();
  for (let d = 0; d < days; d++) {
    const iso = offsetToDate(model.startDate, d);
    if (d === 0 || iso.endsWith("-01")) months.set(d, new Intl.DateTimeFormat(intl, { month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)));
  }

  return (
    <Card padding="sm" title={t("pm.tl.gantt")} eyebrow={t("pm.tl.ganttEyebrow")}>
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="gantt-title" aria-describedby="gantt-desc" className="block font-[family-name:var(--ws-font-body)]">
          <title id="gantt-title">{t("pm.tl.gantt")}</title>
          <desc id="gantt-desc">{t("pm.tl.ganttDesc", { n: tl.rows.length, finish: fmt.number(intl, tl.finish, 1), date: fmt.date(intl, tl.finishDate) })}</desc>
          <defs>
            <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 z" className="fill-ws-text-muted" />
            </marker>
            <pattern id="gantt-float" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="fill-ws-surface-3" />
              <line x1="0" y1="0" x2="0" y2="6" className="stroke-ws-border-strong" strokeWidth="2" />
            </pattern>
          </defs>
          {/* cabeçalho de dias */}
          {Array.from({ length: days }, (_, d) => {
            const iso = offsetToDate(model.startDate, d);
            return (
              <g key={d}>
                <line x1={x(d)} y1={HEAD_H - 6} x2={x(d)} y2={height} className="stroke-ws-border" strokeWidth={0.5} />
                <text x={x(d) + dw / 2} y={HEAD_H - 10} textAnchor="middle" className="fill-ws-text-muted text-[10px] tabular-nums">{Number(iso.slice(8, 10))}</text>
                {months.has(d) ? <text x={x(d) + 2} y={12} className="fill-ws-text text-[11px] font-semibold">{months.get(d)}</text> : null}
              </g>
            );
          })}
          {/* linhas e barras */}
          {tl.rows.map((r) => {
            const y = rowY.get(r.id)!;
            const isSel = selected === makeRef("TASK", r.id);
            const crit = r.critical;
            const w = Math.max(2, (r.ef - r.es) * dw);
            const label = `${r.task.code} ${r.task.title}`;
            const due = dueOf(r);
            const late = due !== undefined && r.ef > due + 1e-6 ? Math.ceil(r.ef - due - 1e-6) : 0;
            const dueText = due !== undefined ? `, ${t("projectPage.gantt.due", { date: fmt.date(intl, r.task.dueAt) })}${late ? `, ${t("projectPage.gantt.late", { n: late })}` : ""}` : "";
            return (
              <g
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={t("pm.tl.rowLabel", { code: r.task.code, title: r.task.title, es: fmt.date(intl, r.startDate), ef: fmt.date(intl, r.endDate), float: fmt.number(intl, r.totalFloat, 1) }) + (crit ? `, ${t("pm.task.critical")}` : "") + dueText}
                onClick={() => onOpen(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(r.id);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-ws-focus [&:focus-visible>rect:first-child]:[stroke-width:2]"
                data-row={r.task.code}
              >
                <rect x={0} y={y} width={width} height={ROW_H} className={cn(isSel ? "fill-ws-accent-soft" : "fill-transparent", "stroke-transparent")} />
                <text x={8} y={y + ROW_H / 2 + 4} className={cn("text-[12px]", crit ? "fill-ws-danger-ink font-semibold" : "fill-ws-text")}>
                  {label.length > 30 ? `${label.slice(0, 29)}…` : label}
                </text>
                {r.baseline ? <rect x={x(r.baseline.es)} y={y + ROW_H - 7} width={Math.max(2, (r.baseline.ef - r.baseline.es) * dw)} height={4} rx={2} className="fill-ws-text-faint" /> : null}
                {due !== undefined ? <path d={`M${x(due) - 5},${y + 1} h10 l-5,7 z`} className={late ? "fill-ws-danger" : "fill-ws-warning"} data-due={r.task.code} /> : null}
                {r.task.milestone ? (
                  <path d={`M${x(r.es)},${y + 7} l9,10 l-9,10 l-9,-10 z`} className={crit ? "fill-ws-danger" : "fill-ws-info"} />
                ) : (
                  <>
                    {r.totalFloat > 0.0001 ? <rect x={x(r.ef)} y={y + 11} width={r.totalFloat * dw} height={ROW_H - 22} fill="url(#gantt-float)" className="stroke-ws-border-strong" strokeDasharray="3 2" strokeWidth={0.8} /> : null}
                    <rect x={x(r.es)} y={y + 7} width={w} height={ROW_H - 16} rx={4} className={crit ? "fill-ws-danger" : "fill-ws-accent"} />
                    <rect x={x(r.es)} y={y + 7} width={(w * Math.max(0, Math.min(100, r.task.percentComplete))) / 100} height={ROW_H - 16} rx={4} className="fill-ws-ink opacity-30" />
                    {w > 36 ? <text x={x(r.es) + 5} y={y + ROW_H / 2 + 4} className="fill-ws-on-accent text-[10px] font-semibold tabular-nums">{r.task.percentComplete}%</text> : null}
                  </>
                )}
              </g>
            );
          })}
          {/* dependências */}
          {tl.dependencies.map((d) => {
            const a = byId.get(d.from);
            const b = byId.get(d.to);
            if (!a || !b) return null;
            const ya = rowY.get(a.id)! + ROW_H / 2;
            const yb = rowY.get(b.id)! + ROW_H / 2;
            const xa = d.type === "SS" || d.type === "SF" ? x(a.es) : x(a.ef);
            const xb = d.type === "FF" || d.type === "SF" ? x(b.ef) : x(b.es);
            const mid = Math.max(xa, xb) - Math.abs(xb - xa) / 2;
            const path = `M${xa},${ya} H${xa + 6} V${(ya + yb) / 2} H${Math.min(mid, xb - 6)} V${yb} H${xb - 1}`;
            const crit = critical.has(d.from) && critical.has(d.to);
            return <path key={d.id} d={path} fill="none" className={crit ? "stroke-ws-danger" : "stroke-ws-text-muted"} strokeWidth={crit ? 1.6 : 1} markerEnd="url(#gantt-arrow)" opacity={0.85} />;
          })}
          {/* data de status e término da linha de base */}
          <line x1={x(tl.statusOffset)} y1={HEAD_H - 4} x2={x(tl.statusOffset)} y2={height} className="stroke-ws-warning" strokeWidth={2} strokeDasharray="5 3" />
          <text x={x(tl.statusOffset) + 4} y={HEAD_H - 24} className="fill-ws-warning-ink text-[10px] font-semibold">{t("pm.tl.statusLine")}</text>
          {tl.baselineFinish !== undefined ? (
            <>
              <line x1={x(tl.baselineFinish)} y1={HEAD_H - 4} x2={x(tl.baselineFinish)} y2={height} className="stroke-ws-text-faint" strokeWidth={1.5} strokeDasharray="2 3" />
              <text x={x(tl.baselineFinish) + 4} y={height - 4} className="fill-ws-text-muted text-[10px]">{t("pm.tl.baselineLine")}</text>
            </>
          ) : null}
        </svg>
      </div>
      <p className="mt-2 text-[length:var(--ws-text-body-sm)]">
        {t("pm.tl.finish", { finish: fmt.number(intl, tl.finish, 1), date: fmt.date(intl, tl.finishDate) })}
        {tl.baselineFinish !== undefined ? ` · ${t("pm.tl.vsBaseline", { delta: fmt.number(intl, tl.finish - tl.baselineFinish, 1) })}` : ""}
        {" · "}
        {t("pm.tl.criticalPath", { codes: tl.criticalPath.map((id) => model.tasks.find((x) => x.id === id)?.code ?? id).join(" → ") })}
      </p>
    </Card>
  );
}

// ------------------------------------------------------------------ PERT
function PertPanel({ tl, model }: PanelProps & { tl: TimelineView }) {
  const { t, intl } = useI18n();
  const [target, setTarget] = useState<number | null>(null);
  const p = tl.pert;
  const three = model.tasks.filter((x) => x.pert);
  const tgt = target ?? p?.target ?? tl.finish;
  const prob = p ? probabilityByTarget(p.te, p.sd, tgt) : null;
  return (
    <Card padding="sm" title={t("pm.tl.pert.title")} eyebrow={t("pm.tl.pert.eyebrow")}>
      <div className="grid gap-3">
        {p ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ["te", t("pm.ui.daysShort", { n: fmt.number(intl, p.te, 2) })],
              ["sd", t("pm.ui.daysShort", { n: fmt.number(intl, p.sd, 2) })],
              ["probability", fmt.percent(intl, p.probability, 1)],
              ["p80", t("pm.ui.daysShort", { n: fmt.number(intl, p.p80, 1) })],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2">
                <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.tl.pert.${k}`, { target: fmt.number(intl, p.target, 1) })}</dt>
                <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-lg)] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {p && p.sd > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <CommitNumber label={t("pm.tl.pert.targetLabel")} value={tgt} min={0} onCommit={(v) => setTarget(v)} suffix={t("pm.task.daysUnit")} className="w-40" />
            <p className="pb-2 text-[length:var(--ws-text-body-sm)]" aria-live="polite">
              {t("pm.tl.pert.targetResult", { target: fmt.number(intl, tgt, 1), date: fmt.date(intl, offsetToDate(model.startDate, tgt)), p: fmt.percent(intl, prob, 1) })}
            </p>
          </div>
        ) : (
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pm.tl.pert.noVariance")}</p>
        )}
        {three.length ? (
          <table className="w-full text-left text-[length:var(--ws-text-caption)]">
            <caption className="sr-only">{t("pm.tl.pert.tableCaption")}</caption>
            <thead>
              <tr className="text-ws-text-muted">
                {["code", "o", "m", "p", "te", "sd"].map((h) => <th key={h} scope="col" className="py-1 pr-2 font-semibold">{t(`pm.tl.pert.col.${h}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {three.map((x) => {
                const e = pert(x.pert!);
                return (
                  <tr key={x.id} className="border-t border-ws-border tabular-nums">
                    <th scope="row" className="py-1 pr-2 font-[family-name:var(--ws-font-mono)]">{x.code}</th>
                    <td>{x.pert!.o}</td><td>{x.pert!.m}</td><td>{x.pert!.p}</td>
                    <td>{fmt.number(intl, e.te, 2)}</td><td>{fmt.number(intl, e.sd, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        <Theory refKey="PERT">{t("pm.tl.pert.theory")}</Theory>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Monte Carlo
function MonteCarloCard({ tl, model }: PanelProps & { tl: TimelineView }) {
  const { t, intl } = useI18n();
  const [runs, setRuns] = useState(2000);
  const [sim, setSim] = useState<{ version: number; result: MonteCarloResult } | null>(null);
  const uncertain = model.tasks.some((x) => x.pert && x.pert.p > x.pert.o);
  const target = tl.pert?.target ?? tl.finish;
  const simulate = () => {
    const r = monteCarlo(
      model.tasks.map((x) => ({ id: x.id, duration: effectiveDuration(x), pert: x.milestone ? undefined : x.pert })),
      model.dependencies.map((d) => ({ from: d.from, to: d.to, type: d.type, lag: d.lagDays })),
      { runs, seed: model.version * 7919 + model.tasks.length },
    );
    if (!("error" in r)) setSim({ version: model.version, result: r });
  };
  const r = sim?.result;
  const maxCount = r ? Math.max(...r.histogram.map((b) => b.count)) : 1;
  const crit = r ? Object.entries(r.criticality).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) : [];
  const code = (id: string) => model.tasks.find((x) => x.id === id)?.code ?? id;
  const W = 520;
  const H = 150;
  return (
    <Card padding="sm" title={t("pm.tl.mc.title")} eyebrow={t("pm.tl.mc.eyebrow")}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("pm.tl.mc.runsLabel")}>
            {({ id }) => <Select id={id} value={String(runs)} onChange={(e) => setRuns(Number(e.target.value))} options={[500, 2000, 5000].map((n) => ({ value: String(n), label: fmt.number(intl, n, 0) }))} className="w-32" />}
          </Field>
          <Button variant="primary" onClick={simulate} disabled={!uncertain}>{t(sim ? "pm.tl.mc.rerun" : "pm.tl.mc.run", { runs: fmt.number(intl, runs, 0) })}</Button>
          {sim && sim.version !== model.version ? <p className="pb-2 text-[length:var(--ws-text-caption)] text-ws-warning-ink">{t("pm.tl.mc.stale", { n: sim.version })}</p> : null}
        </div>
        {!uncertain ? <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pm.tl.mc.none")}</p> : null}
        {r ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]" aria-live="polite" data-montecarlo>
            <div className="grid gap-2">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ["p50", r.p50], ["p80", r.p80], ["p95", r.p95], ["mean", r.mean],
                ] as const).map(([k, v]) => (
                  <div key={k} className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2">
                    <dt className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`pm.tl.mc.${k}`)}</dt>
                    <dd className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-lg)] tabular-nums">{t("pm.ui.daysShort", { n: fmt.number(intl, v, 1) })}{k === "mean" ? ` ± ${fmt.number(intl, r.sd, 1)}` : ""}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[length:var(--ws-text-body-sm)]">
                {t("pm.tl.mc.prob", { target: fmt.number(intl, target, 1), date: fmt.date(intl, offsetToDate(model.startDate, target)), p: fmt.percent(intl, probabilityWithin(r, target), 1) })}
                {tl.pert ? ` · ${t("pm.tl.mc.vsPert", { te: fmt.number(intl, tl.pert.te, 1), p: fmt.percent(intl, tl.pert.probability, 1) })}` : ""}
              </p>
              <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby="mc-hist-title">
                <title id="mc-hist-title">{t("pm.tl.mc.histogram")}</title>
                {r.histogram.map((b, i) => {
                  const bw = (W - 20) / r.histogram.length;
                  const h = (b.count / maxCount) * (H - 34);
                  const over = b.from >= target;
                  return (
                    <g key={i}>
                      <rect x={10 + i * bw + 1} y={H - 22 - h} width={Math.max(1, bw - 2)} height={h} className={over ? "fill-ws-warning" : "fill-ws-accent"}>
                        <title>{`${fmt.number(intl, b.from, 1)}–${fmt.number(intl, b.to, 1)}: ${b.count}`}</title>
                      </rect>
                      {i % 2 === 0 ? <text x={10 + i * bw + bw / 2} y={H - 8} textAnchor="middle" className="fill-ws-text-muted text-[10px] tabular-nums">{fmt.number(intl, b.from, 1)}</text> : null}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="grid content-start gap-1.5">
              <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("pm.tl.mc.criticality")}</p>
              <ul className="grid gap-1 text-[length:var(--ws-text-caption)]">
                {crit.map(([id, v]) => (
                  <li key={id} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2" data-crit={code(id)}>
                    <span className="font-[family-name:var(--ws-font-mono)]">{code(id)}</span>
                    <span className="h-2 rounded-[var(--ws-radius-pill)] bg-ws-surface-3"><span className="block h-full rounded-[var(--ws-radius-pill)] bg-ws-danger" style={{ width: `${v * 100}%` }} /></span>
                    <span className="text-right tabular-nums">{fmt.percent(intl, v, 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <Theory refKey="PERT">{t("pm.tl.mc.theory")}</Theory>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Curva S
function SCurve({ tl, model }: PanelProps & { tl: TimelineView }) {
  const { t, intl } = useI18n();
  const e = evmView(model);
  const W = 520;
  const H = 240;
  const P = { l: 56, r: 16, t: 16, b: 32 };
  const maxT = Math.max(1, ...tl.curve.map((c) => c.t), e.statusOffset);
  const maxV = Math.max(1, e.bac, ...tl.curve.map((c) => c.pv), e.ac, e.ev);
  const sx = (v: number) => P.l + (v / maxT) * (W - P.l - P.r);
  const sy = (v: number) => H - P.b - (v / maxV) * (H - P.t - P.b);
  const path = tl.curve.map((c, i) => `${i ? "L" : "M"}${sx(c.t).toFixed(1)},${sy(c.pv).toFixed(1)}`).join(" ");
  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxV);
  const stepX = Math.max(1, Math.ceil(maxT / 8));
  const sOff = Math.max(0, Math.min(maxT, e.statusOffset));
  return (
    <Card padding="sm" title={t("pm.tl.curve.title")} eyebrow={t("pm.tl.curve.eyebrow")}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby="scurve-title" aria-describedby="scurve-desc">
        <title id="scurve-title">{t("pm.tl.curve.title")}</title>
        <desc id="scurve-desc">{t("pm.tl.curve.desc", { pv: fmt.money(intl, e.pv), ev: fmt.money(intl, e.ev), ac: fmt.money(intl, e.ac), bac: fmt.money(intl, e.bac) })}</desc>
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} className="stroke-ws-border" strokeWidth={0.6} />
            <text x={P.l - 6} y={sy(v) + 4} textAnchor="end" className="fill-ws-text-muted text-[10px] tabular-nums">{fmt.number(intl, v / 1000, 0)}k</text>
          </g>
        ))}
        {Array.from({ length: Math.floor(maxT / stepX) + 1 }, (_, i) => i * stepX).map((d) => (
          <text key={d} x={sx(d)} y={H - P.b + 16} textAnchor="middle" className="fill-ws-text-muted text-[10px] tabular-nums">{d}</text>
        ))}
        <text x={W - P.r} y={H - 4} textAnchor="end" className="fill-ws-text-muted text-[10px]">{t("pm.tl.curve.days")}</text>
        <line x1={P.l} x2={W - P.r} y1={sy(e.bac)} y2={sy(e.bac)} className="stroke-ws-text-faint" strokeDasharray="4 3" />
        <text x={W - P.r} y={sy(e.bac) - 4} textAnchor="end" className="fill-ws-text-muted text-[10px]">{t("pm.tl.curve.bac")}</text>
        <path d={path} fill="none" className="stroke-ws-accent" strokeWidth={2.5} />
        <line x1={sx(sOff)} x2={sx(sOff)} y1={P.t} y2={H - P.b} className="stroke-ws-warning" strokeDasharray="5 3" strokeWidth={1.5} />
        <circle cx={sx(sOff)} cy={sy(e.pv)} r={4.5} className="fill-ws-accent" />
        <circle cx={sx(sOff)} cy={sy(e.ev)} r={4.5} className="fill-ws-success" />
        <rect x={sx(sOff) - 4} y={sy(e.ac) - 4} width={8} height={8} className="fill-ws-danger" />
      </svg>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[length:var(--ws-text-caption)] sm:grid-cols-4">
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-1 w-4 rounded bg-ws-accent" />{t("pm.tl.curve.pv")} <strong className="tabular-nums">{fmt.money(intl, e.pv)}</strong></li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-full bg-ws-success" />{t("pm.tl.curve.ev")} <strong className="tabular-nums">{fmt.money(intl, e.ev)}</strong></li>
        <li className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 bg-ws-danger" />{t("pm.tl.curve.ac")} <strong className="tabular-nums">{fmt.money(intl, e.ac)}</strong></li>
        <li>{t("pm.tl.curve.indexes", { cpi: fmt.number(intl, e.cpi, 2), spi: fmt.number(intl, e.spi, 2) })}</li>
      </ul>
      <Theory refKey="EVM_IDC" className="mt-2">{t("pm.tl.curve.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ Rede (atividade no nó)
const NODE_W = 168;
const NODE_H = 76;
const GAP_X = 44;
const GAP_Y = 18;

function Network({ tl, model, selected, onOpen }: PanelProps & { tl: TimelineView; onOpen: (id: string) => void }) {
  const { t, intl } = useI18n();
  const level = new Map<string, number>();
  for (const r of tl.rows) {
    const preds = model.dependencies.filter((d) => d.to === r.id).map((d) => level.get(d.from) ?? 0);
    level.set(r.id, preds.length ? Math.max(...preds) + 1 : 0);
  }
  const cols = new Map<number, TimelineRow[]>();
  for (const r of tl.rows) cols.set(level.get(r.id)!, [...(cols.get(level.get(r.id)!) ?? []), r]);
  const pos = new Map<string, { x: number; y: number }>();
  for (const [lv, rows] of cols) rows.forEach((r, i) => pos.set(r.id, { x: 12 + lv * (NODE_W + GAP_X), y: 12 + i * (NODE_H + GAP_Y) }));
  const width = 24 + cols.size * (NODE_W + GAP_X);
  const height = 24 + Math.max(...[...cols.values()].map((c) => c.length)) * (NODE_H + GAP_Y);
  const critical = new Set(tl.criticalPath);
  const n = (v: number) => fmt.number(intl, v, 1);
  return (
    <Card padding="sm" title={t("pm.tl.net.title")} eyebrow={t("pm.tl.net.eyebrow")}>
      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="net-title" className="block">
          <title id="net-title">{t("pm.tl.net.title")}</title>
          <defs>
            <marker id="net-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" className="fill-ws-text-muted" />
            </marker>
          </defs>
          {model.dependencies.map((d) => {
            const a = pos.get(d.from);
            const b = pos.get(d.to);
            if (!a || !b) return null;
            const crit = critical.has(d.from) && critical.has(d.to);
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            return (
              <g key={d.id}>
                <path d={`M${x1},${y1} C${x1 + GAP_X / 2},${y1} ${x2 - GAP_X / 2},${y2} ${x2 - 1},${y2}`} fill="none" className={crit ? "stroke-ws-danger" : "stroke-ws-text-muted"} strokeWidth={crit ? 2 : 1} markerEnd="url(#net-arrow)" />
                {d.type !== "FS" || d.lagDays ? <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" className="fill-ws-text-muted text-[9px]">{d.type}{d.lagDays ? (d.lagDays > 0 ? `+${d.lagDays}` : d.lagDays) : ""}</text> : null}
              </g>
            );
          })}
          {tl.rows.map((r) => {
            const p = pos.get(r.id)!;
            const crit = r.critical;
            const isSel = selected === makeRef("TASK", r.id);
            const cell = (cx: number, cy: number, v: string, k: string) => <text key={k} x={p.x + cx} y={p.y + cy} textAnchor="middle" className="fill-ws-text text-[10px] tabular-nums">{v}</text>;
            return (
              <g key={r.id} role="button" tabIndex={0} aria-label={t("pm.tl.net.node", { code: r.task.code, es: n(r.es), ef: n(r.ef), ls: n(r.ls), lf: n(r.lf), float: n(r.totalFloat) })}
                onClick={() => onOpen(r.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-ws-focus" data-node={r.task.code}>
                <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={8} className={cn(isSel ? "fill-ws-accent-soft" : "fill-ws-surface-1", crit ? "stroke-ws-danger" : "stroke-ws-border-strong")} strokeWidth={crit ? 2.2 : 1.2} />
                <line x1={p.x} x2={p.x + NODE_W} y1={p.y + 22} y2={p.y + 22} className="stroke-ws-border" />
                <line x1={p.x} x2={p.x + NODE_W} y1={p.y + NODE_H - 22} y2={p.y + NODE_H - 22} className="stroke-ws-border" />
                <line x1={p.x + NODE_W / 3} x2={p.x + NODE_W / 3} y1={p.y} y2={p.y + 22} className="stroke-ws-border" />
                <line x1={p.x + (2 * NODE_W) / 3} x2={p.x + (2 * NODE_W) / 3} y1={p.y} y2={p.y + 22} className="stroke-ws-border" />
                <line x1={p.x + NODE_W / 3} x2={p.x + NODE_W / 3} y1={p.y + NODE_H - 22} y2={p.y + NODE_H} className="stroke-ws-border" />
                <line x1={p.x + (2 * NODE_W) / 3} x2={p.x + (2 * NODE_W) / 3} y1={p.y + NODE_H - 22} y2={p.y + NODE_H} className="stroke-ws-border" />
                {cell(NODE_W / 6, 15, n(r.es), "es")}
                {cell(NODE_W / 2, 15, n(r.duration), "d")}
                {cell((5 * NODE_W) / 6, 15, n(r.ef), "ef")}
                <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2 + 4} textAnchor="middle" className={cn("text-[11px] font-semibold", crit ? "fill-ws-danger-ink" : "fill-ws-text")}>
                  {`${r.task.code} ${r.task.title}`.slice(0, 24)}
                </text>
                {cell(NODE_W / 6, NODE_H - 7, n(r.ls), "ls")}
                {cell(NODE_W / 2, NODE_H - 7, n(r.totalFloat), "f")}
                {cell((5 * NODE_W) / 6, NODE_H - 7, n(r.lf), "lf")}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pm.tl.net.key")}</p>
      <Theory refKey="CPM" className="mt-2">{t("pm.tl.net.theory")}</Theory>
    </Card>
  );
}

// ------------------------------------------------------------------ Tabela CPM
function CpmTable({ tl, selected, onOpen }: PanelProps & { tl: TimelineView; onOpen: (id: string) => void }) {
  const { t, intl } = useI18n();
  const n = (v: number) => fmt.number(intl, v, 2);
  return (
    <Card padding="sm" title={t("pm.tl.cpm.title")} eyebrow={t("pm.tl.cpm.eyebrow")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("pm.tl.cpm.title")}</caption>
          <thead>
            <tr className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
              {["code", "task", "duration", "es", "ef", "ls", "lf", "totalFloat", "freeFloat", "critical"].map((h) => <th key={h} scope="col" className="py-1.5 pr-3 font-semibold">{t(`pm.tl.cpm.col.${h}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {tl.rows.map((r) => (
              <tr key={r.id} className={cn("border-t border-ws-border tabular-nums", selected === makeRef("TASK", r.id) && "bg-ws-accent-soft")}>
                <th scope="row" className="py-1.5 pr-3 font-[family-name:var(--ws-font-mono)]">
                  <Button size="sm" variant="ghost" className="min-h-0 px-1 py-0" onClick={() => onOpen(r.id)} aria-label={t("pm.board.card.open", { code: r.task.code, title: r.task.title })}>{r.task.code}</Button>
                </th>
                <td className="max-w-[16rem] truncate pr-3">{r.task.title}</td>
                <td className="pr-3">{n(r.duration)}{r.task.pert ? <Badge tone="info" className="ml-1">PERT</Badge> : null}</td>
                <td className="pr-3">{n(r.es)}</td>
                <td className="pr-3">{n(r.ef)}</td>
                <td className="pr-3">{n(r.ls)}</td>
                <td className="pr-3">{n(r.lf)}</td>
                <td className="pr-3">{n(r.totalFloat)}</td>
                <td className="pr-3">{n(r.freeFloat)}</td>
                <td>{r.critical ? <Tag tone="danger">{t("pm.task.critical")}</Tag> : <span className="text-ws-text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Dependências (alternativa por teclado ao canvas)
function DependencyTable({ model, dispatch, readOnly }: PanelProps) {
  const { t } = useI18n();
  const code = (id: string) => model.tasks.find((x) => x.id === id)?.code ?? "?";
  const [draft, setDraft] = useState({ from: "", to: "", type: "FS" as DependencyType, lag: 0 });
  const options = [{ value: "", label: t("pm.ui.select") }, ...model.tasks.map((x) => ({ value: x.id, label: `${x.code} ${x.title}` }))];
  return (
    <Card padding="sm" title={t("pm.tl.deps.title")} eyebrow={t("pm.tl.deps.eyebrow")}>
      <div className="grid gap-3">
        <ul className="grid gap-1.5">
          {model.dependencies.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-body-sm)]" data-dep={d.id}>
              <span className="min-w-28 font-[family-name:var(--ws-font-mono)]">{code(d.from)} → {code(d.to)}</span>
              <Select aria-label={t("pm.tl.deps.typeOf", { dep: `${code(d.from)} → ${code(d.to)}` })} value={d.type} disabled={readOnly}
                onChange={(e) => dispatch({ type: "DEP_UPDATE", id: d.id, depType: e.target.value as DependencyType, lagDays: d.lagDays })}
                options={DEPENDENCY_TYPES.map((x) => ({ value: x, label: t(`pm.dep.${x}`) }))} className="min-h-[var(--ws-control-sm)] w-56" />
              <CommitNumber bare label={t("pm.tl.deps.lagOf", { dep: `${code(d.from)} → ${code(d.to)}` })} value={d.lagDays} disabled={readOnly}
                onCommit={(v) => dispatch({ type: "DEP_UPDATE", id: d.id, depType: d.type, lagDays: v })} className="min-h-[var(--ws-control-sm)] w-20" />
              {!readOnly ? <Button size="sm" variant="ghost" aria-label={t("pm.ui.removeItem", { item: `${code(d.from)} → ${code(d.to)}` })} onClick={() => dispatch({ type: "DEP_REMOVE", id: d.id })}>×</Button> : null}
            </li>
          ))}
        </ul>
        {!readOnly ? (
          <form
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.from || !draft.to) return;
              if (dispatch({ type: "DEP_ADD", from: draft.from, to: draft.to, depType: draft.type, lagDays: draft.lag }).ok) setDraft({ from: "", to: "", type: "FS", lag: 0 });
            }}
          >
            <Field label={t("pm.tl.deps.from")}>{({ id }) => <Select id={id} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} options={options} />}</Field>
            <Field label={t("pm.tl.deps.to")}>{({ id }) => <Select id={id} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} options={options} />}</Field>
            <Field label={t("pm.task.deps.type")}>{({ id }) => <Select id={id} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as DependencyType })} options={DEPENDENCY_TYPES.map((x) => ({ value: x, label: x }))} />}</Field>
            <CommitNumber label={t("pm.task.deps.lagLabel")} value={draft.lag} onCommit={(v) => setDraft({ ...draft, lag: Math.round(v) })} className="w-24" />
            <Button type="submit" disabled={!draft.from || !draft.to}>{t("pm.ui.add")}</Button>
          </form>
        ) : null}
        <Theory refKey="CPM">{t("pm.tl.deps.theory")}</Theory>
      </div>
    </Card>
  );
}
