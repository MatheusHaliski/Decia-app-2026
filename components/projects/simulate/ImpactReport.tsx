"use client";
/**
 * Relatório de impacto de um cenário (RF31.CA02, `ImpactReport`): novo término e caminho crítico (o que mudou nele), chance de
 * cumprir o prazo e P50/P80 do Monte Carlo, custo projetado (ENT/VNT) e uso da reserva, riscos que disparam e o cruzamento com o
 * Espelho de Conformidade — tudo comparado à linha de base e com o porquê de cada número.
 */
import type { ReactNode } from "react";
import { Link, Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Outcome, ScenarioResult, TriggeredRisk } from "@/lib/projects/simulation/engine";
import type { Effect } from "@/lib/projects/simulation/types";
import type { ProjectModel } from "@/lib/projects/types";
import { STATUS_TONE } from "../common";
import { fmt, type PeopleDirectory } from "../shared";
import { DeltaTag, fmtDays, formatVars, signed } from "./shared";

const CAPTION = "text-[length:var(--ws-text-caption)] text-ws-text-muted";
const BODY_SM = "text-[length:var(--ws-text-body-sm)]";

function Tile({ label, value, delta, note, testId }: { label: string; value: string; delta?: ReactNode; note?: ReactNode; testId?: string }) {
  return (
    <div className="grid content-start gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2.5" data-tile={testId}>
      <dt className={CAPTION}>{label}</dt>
      <dd className="grid gap-1">
        <span className="text-[length:var(--ws-text-body-lg)] font-semibold">{value}</span>
        {delta}
        {note ? <span className={CAPTION}>{note}</span> : null}
      </dd>
    </div>
  );
}

export function RiskList({ risks, people, emptyKey = "sim.risk.none" }: { risks: readonly TriggeredRisk[]; people: PeopleDirectory; emptyKey?: string }) {
  const { t, intl } = useI18n();
  if (!risks.length) return <p className={cn(BODY_SM, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t(emptyKey)}</p>;
  return (
    <ul className="grid gap-1.5">
      {risks.map((r) => (
        <li key={r.key} className="flex flex-wrap items-start gap-2" data-risk={r.id} data-new={r.isNew}>
          <Tag tone={STATUS_TONE[r.severity]}>
            <span aria-hidden>{r.severity === "CRITICO" ? "✕" : "!"}</span>
            {t(`pm.metricStatus.${r.severity}`)}
          </Tag>
          <span className={cn(BODY_SM, "min-w-0 flex-1")}>{t(`sim.risk.${r.id}`, formatVars(t, intl, r.vars, people))}</span>
          <Tag tone={r.isNew ? "warning" : "neutral"}>{t(r.isNew ? "sim.risk.new" : "sim.risk.existing")}</Tag>
        </li>
      ))}
    </ul>
  );
}

export function EffectList({ effects, people, labelOf }: { effects: readonly Effect[]; people: PeopleDirectory; labelOf: (lever: number) => string }) {
  const { t, intl } = useI18n();
  if (!effects.length) return <p className={CAPTION}>{t("sim.fx.none")}</p>;
  const groups = [...new Set(effects.map((e) => e.lever))];
  return (
    <ol className="grid gap-2">
      {groups.map((g) => (
        <li key={g} className="grid gap-1">
          <p className={cn(BODY_SM, "font-semibold")}>{labelOf(g)}</p>
          <ul className="grid gap-0.5 pl-3">
            {effects.filter((e) => e.lever === g).map((e, i) => (
              <li key={i} className={cn(BODY_SM, e.key === "invalid" || e.key === "cutUncovered" || e.key === "addCycle" ? "text-ws-danger-ink" : "text-ws-text")} data-effect={e.key}>
                {t(`sim.fx.${e.key}`, formatVars(t, intl, e.vars, people))}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function ImpactReport({ result: r, baseline, model, people, itemTitle, mirrorHref }: {
  result: ScenarioResult;
  baseline: Outcome;
  model: ProjectModel;
  people: PeopleDirectory;
  itemTitle: (itemId: string) => string;
  mirrorHref: string;
}) {
  const { t, intl } = useI18n();
  const d = r.deltas;
  const code = (id: string) => r.model.tasks.find((x) => x.id === id)?.code ?? model.tasks.find((x) => x.id === id)?.code ?? id;
  const why = (k: keyof Outcome["why"]) => t(`sim.why.${r.why[k].key}`, formatVars(t, intl, r.why[k].vars, people));
  const days = (v: number) => t("pm.ui.daysShort", { n: fmtDays(intl, v) });
  const money = (v: number) => fmt.money(intl, v);
  const levers = r.scenario.levers;

  return (
    <div className="grid gap-[var(--ws-space-4)]" data-impact={r.scenario.id}>
      {!r.schedule.ok ? <p role="alert" className="rounded-[var(--ws-radius-md)] border border-ws-danger bg-ws-danger-soft p-2 text-[length:var(--ws-text-body-sm)]">{t("sim.why.finishCycle")}</p> : null}
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-3" aria-live="polite" aria-label={t("sim.report.numbers")}>
        <Tile testId="finish" label={t("sim.report.finish")} value={`${fmt.date(intl, r.schedule.finishDate)} · ${t("sim.report.dayN", { n: fmtDays(intl, r.schedule.finish) })}`}
          delta={<DeltaTag value={d.finishDays} goodWhen="lower" text={signed(days(Math.abs(d.finishDays)), d.finishDays)} />} />
        <Tile testId="probability" label={t("sim.report.probability", { date: r.mc ? fmt.date(intl, r.mc.targetDate) : "—" })} value={r.mc ? fmt.percent(intl, r.mc.probability) : "—"}
          delta={<DeltaTag value={d.probabilityPts} goodWhen="higher" text={t("sim.report.pts", { n: signed(String(Math.abs(d.probabilityPts ?? 0)), d.probabilityPts ?? 0) })} />} />
        <Tile testId="p80" label={t("sim.report.p50p80")} value={r.mc ? `${days(r.mc.p50)} · ${days(r.mc.p80)}` : "—"}
          delta={<DeltaTag value={d.p80Days} goodWhen="lower" text={t("sim.report.p80Delta", { d: signed(days(Math.abs(d.p80Days ?? 0)), d.p80Days ?? 0) })} />} />
        <Tile testId="eac" label={t("sim.report.eac")} value={money(r.cost.eac)}
          delta={<DeltaTag value={d.eacBrl} goodWhen="lower" text={signed(money(Math.abs(d.eacBrl)), d.eacBrl)} />}
          note={t("sim.report.vac", { vac: money(r.cost.vac) })} />
        <Tile testId="reserve" label={t("sim.report.reserve")} value={`${money(r.cost.reserveUsed)} · ${fmt.percent(intl, r.cost.reserveUsedPct)}`}
          delta={<DeltaTag value={d.reserveUsedBrl} goodWhen="lower" text={signed(money(Math.abs(d.reserveUsedBrl)), d.reserveUsedBrl)} />}
          note={r.cost.shortfall > 0 ? <span className="font-semibold text-ws-danger-ink"><span aria-hidden>✕ </span>{t("sim.report.shortfall", { v: money(r.cost.shortfall) })}</span> : t("sim.report.ofContingency", { v: money(r.cost.contingency) })} />
        <Tile testId="compliance" label={t("sim.report.compliance")} value={r.compliance.percent === null ? "—" : fmt.percent(intl, r.compliance.percent / 100)}
          delta={<DeltaTag value={d.compliancePts} goodWhen="higher" text={t("sim.report.pts", { n: signed(String(Math.abs(d.compliancePts ?? 0)), d.compliancePts ?? 0) })} />} />
      </dl>

      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-2.5" open>
        <summary className="cursor-pointer text-[length:var(--ws-text-body-sm)] font-semibold">{t("sim.report.why")}</summary>
        <ul className="mt-2 grid gap-1">
          {(["finish", "probability", "p80", "eac", "vac", "reserve"] as const).map((k) => (
            <li key={k} className={BODY_SM} data-why={k}>{why(k)}</li>
          ))}
          <li className={CAPTION}>{t("sim.report.sameSeed", { seed: r.mc?.seed ?? "—", runs: r.mc?.runs ?? "—" })}</li>
        </ul>
      </details>

      <section aria-label={t("sim.report.critical")} className="grid gap-1.5">
        <h4 className="font-semibold">{t("sim.report.critical")}</h4>
        <p className={cn(BODY_SM, "flex flex-wrap items-center gap-1")} data-critical>
          {r.schedule.critical.length ? r.schedule.critical.map((id, i) => (
            <span key={id} className="inline-flex items-center gap-1">
              {i ? <span aria-hidden className="text-ws-text-muted">→</span> : null}
              <span className={cn("rounded-[var(--ws-radius-sm)] px-1.5 py-0.5 font-[family-name:var(--ws-font-mono)]", r.criticalChange.entered.includes(id) ? "bg-ws-warning-soft" : "bg-ws-surface-2")}>
                {code(id)}
                {r.schedule.constrained.includes(id) ? <span className="text-ws-text-muted"> · {t("sim.report.waits")}</span> : null}
                {r.criticalChange.entered.includes(id) ? <span className="text-ws-warning-ink"> · {t("sim.report.entered")}</span> : null}
              </span>
            </span>
          )) : "—"}
        </p>
        {r.criticalChange.left.length ? <p className={CAPTION}>{t("sim.report.left", { codes: r.criticalChange.left.map(code).join(", ") })}</p> : null}
        {r.criticalChange.removed.length ? <p className={CAPTION}>{t("sim.report.removedCritical", { codes: r.criticalChange.removed.map(code).join(", ") })}</p> : null}
        {!r.criticalChange.entered.length && !r.criticalChange.left.length && !r.criticalChange.removed.length ? <p className={CAPTION}>{t("sim.report.sameCritical")}</p> : null}
      </section>

      <section aria-label={t("sim.report.effects")} className="grid gap-1.5">
        <h4 className="font-semibold">{t("sim.report.effects")}</h4>
        <p className={CAPTION}>{t("sim.report.order")}</p>
        <EffectList effects={r.effects} people={people} labelOf={(i) => `${i + 1}. ${levers[i] ? t(`sim.lever.${levers[i]!.kind}`) : "—"}`} />
      </section>

      <section aria-label={t("sim.report.risks")} className="grid gap-1.5">
        <h4 className="font-semibold">{t("sim.report.risks")}</h4>
        <RiskList risks={r.risks} people={people} />
      </section>

      <section aria-label={t("sim.report.mirror")} className="grid gap-1.5" data-mirror-cross>
        <h4 className="font-semibold">{t("sim.report.mirror")}</h4>
        <p className={BODY_SM}>
          {t("sim.report.mirrorScore", {
            before: baseline.compliance.percent === null ? "—" : fmt.percent(intl, baseline.compliance.percent / 100),
            after: r.compliance.percent === null ? "—" : fmt.percent(intl, r.compliance.percent / 100),
          })}
        </p>
        {r.complianceDelta.lost.length ? <p className={cn(BODY_SM, "text-ws-danger-ink")}><span aria-hidden>✕ </span>{t("sim.report.mirrorLost", { items: r.complianceDelta.lost.map(itemTitle).join("; ") })}</p> : null}
        {r.complianceDelta.gained.length ? <p className={cn(BODY_SM, "text-ws-success-ink")}><span aria-hidden>✓ </span>{t("sim.report.mirrorGained", { items: r.complianceDelta.gained.map(itemTitle).join("; ") })}</p> : null}
        {!r.complianceDelta.lost.length && !r.complianceDelta.gained.length ? <p className={CAPTION}>{t("sim.report.mirrorSame")}</p> : null}
        <Link href={mirrorHref}>{t("sim.report.openMirror")}</Link>
      </section>
    </div>
  );
}
