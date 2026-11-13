"use client";
/**
 * Métricas ágeis no quadro Scrum (aula de projetos, Tema 4): a META DA SPRINT (compromisso do backlog da sprint) com o timebox,
 * a velocidade (planejado × entregue por sprint), o burndown da sprint atual, o fluxo cumulativo (CFD) e os tempos de fluxo
 * (lead e cycle time) com o WIP. Esforço = dias de trabalho estimados (o modelo não usa story points).
 */
import { useMemo, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { effectiveDuration } from "@/lib/projects/derive";
import { averageVelocity, burndown, cfd, flowTimes, velocity, type AgileTask } from "@/lib/projects/engine/agile";
import { CommitText, Theory } from "./common";
import { fmt, type PanelProps } from "./shared";

export function AgileMetrics({ model, dispatch, readOnly }: PanelProps) {
  const { t, intl } = useI18n();
  const today = model.statusDate;
  const tasks: AgileTask[] = useMemo(
    () => model.tasks.filter((x) => !x.milestone).map((x) => ({ id: x.id, status: x.status, effort: effectiveDuration(x), sprint: x.sprint, createdAt: x.createdAt, startedAt: x.startedAt, doneAt: x.doneAt })),
    [model.tasks],
  );
  const sprints = model.sprints ?? [];
  const current = sprints.find((s) => s.number === (model.currentSprint ?? 1));
  const vel = velocity(tasks, sprints);
  const avg = averageVelocity(vel, sprints, today);
  const burn = current ? burndown(tasks, current, today) : [];
  const firstDay = tasks.map((x) => x.createdAt).filter((d): d is string => Boolean(d)).sort()[0]?.slice(0, 10) ?? model.startDate;
  const flow = cfd(tasks, firstDay, today);
  const times = flowTimes(tasks);
  const n1 = (v: number | null) => fmt.number(intl, v, 1);

  return (
    <section aria-labelledby="agile-title" className="grid gap-[var(--ws-space-3)]" data-agile>
      <h3 id="agile-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body-lg)] font-semibold">{t("pm.agile.title")}</h3>
      <div className="grid gap-[var(--ws-space-3)] lg:grid-cols-2">
        <SprintCard key={`${model.currentSprint ?? 1}`} model={model} dispatch={dispatch} readOnly={readOnly} />
        <Card padding="sm" title={t("pm.agile.velocity")} eyebrow={t("pm.agile.effortUnit")}>
          {vel.length ? (
            <ul className="grid gap-2" aria-label={t("pm.agile.velocity")}>
              {vel.map((v) => {
                const max = Math.max(1, ...vel.map((x) => x.planned));
                return (
                  <li key={v.number} className="grid gap-1 text-[length:var(--ws-text-caption)]" data-velocity={v.number}>
                    <span className="flex justify-between gap-2"><span className="font-semibold">{t("pm.board.scrum.sprintN", { n: v.number })}</span><span className="tabular-nums">{t("pm.agile.velocityRow", { done: n1(v.done), planned: n1(v.planned) })}</span></span>
                    <span className="relative h-3 rounded-[var(--ws-radius-pill)] border border-ws-border bg-ws-surface-2" style={{ width: `${Math.max(4, (v.planned / max) * 100)}%` }}>
                      <span className="absolute inset-y-0 left-0 rounded-[var(--ws-radius-pill)] bg-ws-success" style={{ width: `${v.planned ? (v.done / v.planned) * 100 : 0}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pm.agile.noSprints")}</p>}
          <p className="mt-2 text-[length:var(--ws-text-body-sm)]">{avg === null ? t("pm.agile.avgNone") : t("pm.agile.avg", { v: n1(avg) })}</p>
        </Card>
        <Card padding="sm" title={t("pm.agile.burndown", { n: model.currentSprint ?? 1 })} eyebrow={current ? `${fmt.date(intl, current.start)} – ${fmt.date(intl, current.end)}` : undefined}>
          {burn.length ? <BurnChart points={burn} /> : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("pm.agile.noSprints")}</p>}
        </Card>
        <Card padding="sm" title={t("pm.agile.cfd")} eyebrow={t("pm.agile.cfdEyebrow")}>
          <CfdChart points={flow} />
          <dl className="mt-2 grid grid-cols-3 gap-2 text-[length:var(--ws-text-caption)]">
            <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.agile.lead")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{times.lead === null ? "—" : t("pm.ui.daysShort", { n: n1(times.lead) })}</dd></div>
            <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.agile.cycle")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{times.cycle === null ? "—" : t("pm.ui.daysShort", { n: n1(times.cycle) })}</dd></div>
            <div className="rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-2"><dt className="text-ws-text-muted">{t("pm.agile.wip")}</dt><dd className="text-[length:var(--ws-text-body)] font-semibold tabular-nums">{times.wip}</dd></div>
          </dl>
        </Card>
      </div>
      <Theory refKey="SCRUM_METRICAS">{t("pm.agile.theory")}</Theory>
    </section>
  );
}

function SprintCard({ model, dispatch, readOnly }: Pick<PanelProps, "model" | "dispatch" | "readOnly">) {
  const { t } = useI18n();
  const n = model.currentSprint ?? 1;
  const s = (model.sprints ?? []).find((x) => x.number === n);
  const [start, setStart] = useState(s?.start ?? model.statusDate);
  const [end, setEnd] = useState(s?.end ?? model.statusDate);
  const save = (goal = s?.goal) => dispatch({ type: "SPRINT_SET", number: n, start, end, goal });
  return (
    <Card padding="sm" title={t("pm.agile.sprintGoal", { n })} eyebrow={t("pm.board.scrum.commitment.META_DA_SPRINT")}>
      <div className="grid gap-2">
        <CommitText label={t("pm.agile.goalLabel")} value={s?.goal ?? ""} disabled={readOnly} placeholder={t("pm.agile.goalPlaceholder")} onCommit={(v) => save(v)} multiline />
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label={t("pm.agile.start")}>{({ id }) => <Input id={id} type="date" value={start} disabled={readOnly} onChange={(e) => setStart(e.target.value)} className="w-40" />}</Field>
          <Field label={t("pm.agile.end")}>{({ id }) => <Input id={id} type="date" value={end} disabled={readOnly} onChange={(e) => setEnd(e.target.value)} className="w-40" />}</Field>
          {!readOnly ? <Button type="submit" size="sm">{t("pm.agile.saveTimebox")}</Button> : null}
        </form>
        {!s ? <p className="text-[length:var(--ws-text-caption)] text-ws-warning-ink">{t("pm.agile.noTimebox")}</p> : null}
      </div>
    </Card>
  );
}

function BurnChart({ points }: { points: ReturnType<typeof burndown> }) {
  const { t, intl } = useI18n();
  const W = 420;
  const H = 170;
  const P = { l: 34, r: 10, t: 10, b: 26 };
  const max = Math.max(1, ...points.map((p) => p.ideal), ...points.map((p) => p.remaining ?? 0));
  const x = (i: number) => P.l + (i / Math.max(1, points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const ideal = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.ideal).toFixed(1)}`).join(" ");
  const real = points.filter((p) => p.remaining !== null).map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.remaining!).toFixed(1)}`).join(" ");
  const last = [...points].reverse().find((p) => p.remaining !== null);
  return (
    <figure className="grid gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t("pm.agile.burnDesc", { remaining: fmt.number(intl, last?.remaining ?? null, 1) })} data-burndown>
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="stroke-ws-border" />
        <text x={P.l - 6} y={y(max) + 4} textAnchor="end" className="fill-ws-text-muted text-[10px] tabular-nums">{fmt.number(intl, max, 0)}</text>
        <text x={P.l - 6} y={H - P.b + 4} textAnchor="end" className="fill-ws-text-muted text-[10px]">0</text>
        <path d={ideal} fill="none" className="stroke-ws-text-faint" strokeDasharray="5 4" strokeWidth={1.5} />
        {real ? <path d={real} fill="none" className="stroke-ws-accent" strokeWidth={2.5} /> : null}
        {points.map((p, i) => (i % 3 === 0 || i === points.length - 1 ? <text key={p.day} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ws-text-muted text-[9px]">{fmt.date(intl, p.day)}</text> : null))}
      </svg>
      <figcaption className="flex gap-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block h-0.5 w-4 bg-ws-text-faint" />{t("pm.agile.ideal")}</span>
        <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block h-1 w-4 rounded bg-ws-accent" />{t("pm.agile.remaining")}</span>
      </figcaption>
    </figure>
  );
}

function CfdChart({ points }: { points: ReturnType<typeof cfd> }) {
  const { t } = useI18n();
  const W = 420;
  const H = 150;
  const P = { l: 24, r: 8, t: 8, b: 18 };
  const max = Math.max(1, ...points.map((p) => p.todo + p.doing + p.done));
  const x = (i: number) => P.l + (i / Math.max(1, points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const band = (lo: (p: (typeof points)[number]) => number, hi: (p: (typeof points)[number]) => number) => {
    const top = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(hi(p)).toFixed(1)}`).join(" ");
    const bottom = [...points].reverse().map((p, k) => `L${x(points.length - 1 - k).toFixed(1)},${y(lo(p)).toFixed(1)}`).join(" ");
    return `${top} ${bottom} Z`;
  };
  return (
    <figure className="grid gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t("pm.agile.cfd")} data-cfd>
        <path d={band(() => 0, (p) => p.done)} className="fill-ws-success opacity-80" />
        <path d={band((p) => p.done, (p) => p.done + p.doing)} className="fill-ws-accent opacity-70" />
        <path d={band((p) => p.done + p.doing, (p) => p.done + p.doing + p.todo)} className="fill-ws-surface-3" />
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="stroke-ws-border" />
      </svg>
      <figcaption className="flex flex-wrap gap-3 text-[length:var(--ws-text-caption)] text-ws-text-muted">
        <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 bg-ws-surface-3" />{t("pm.status.A_FAZER")}</span>
        <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 bg-ws-accent" />{t("pm.status.EM_ANDAMENTO")}</span>
        <span className="inline-flex items-center gap-1"><span aria-hidden className="inline-block size-2.5 bg-ws-success" />{t("pm.status.CONCLUIDA")}</span>
      </figcaption>
    </figure>
  );
}
