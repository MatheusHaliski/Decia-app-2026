"use client";
import { Tag, cn } from "@/components/ui";
import { sensitivity, toScoringInput } from "@/lib/decia/rules";
import type { DecisionAggregate, DecisionLifecycle } from "@/lib/decia/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { formatDay } from "./hooks";
import { STATUS_META } from "./meta";

/** Sensibilidade dos pesos (§6.4): lista ordenada pela menor mudança; ≤ 10 pp = sensível; sem inversão = robusta. */
export function SensitivityPanel({ aggregate, limit = 5 }: { aggregate: DecisionAggregate; limit?: number }) {
  const { t } = useI18n();
  const s = sensitivity(toScoringInput(aggregate));
  const name = (id: string) => aggregate.criteria.find((c) => c.id === id)?.name ?? id;
  const label = (id: string) => aggregate.alternatives.find((a) => a.id === id)?.label ?? id;
  if (!s.applicable) return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="sensitivity">{t("decia.sensitivity.notApplicable")}</p>;
  return (
    <div className="grid gap-2" data-testid="sensitivity">
      {s.robust ? (
        <Tag tone="success" className="w-fit"><span aria-hidden>✓</span>{t("decia.sensitivity.robust")}</Tag>
      ) : s.sensitive ? (
        <Tag tone="warning" className="w-fit"><span aria-hidden>↯</span>{t("decia.sensitivity.sensitive")}</Tag>
      ) : (
        <Tag tone="info" className="w-fit">{t("decia.sensitivity.moderate")}</Tag>
      )}
      <ol className="grid gap-1.5">
        {s.flips.slice(0, limit).map((f) => (
          <li key={`${f.criterion}-${f.newLeader}`} className="flex flex-wrap items-baseline gap-2 text-[length:var(--ws-text-body-sm)]">
            <span className={cn("min-w-[3.5rem] font-[family-name:var(--ws-font-mono)] tabular-nums", f.delta <= 10 ? "text-ws-warning-ink" : "text-ws-text-muted")}>{t("decia.sensitivity.delta", { n: f.delta })}</span>
            <span className="min-w-0 flex-1">{t("decia.sensitivity.flip", { criterion: name(f.criterion), from: f.fromPct, to: f.toPct, alt: label(f.newLeader) })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Trade-offs explícitos: o que cada alternativa ganha e perde (prós × contras). */
export function TradeOffView({ aggregate }: { aggregate: DecisionAggregate }) {
  const { t } = useI18n();
  const alts = [...aggregate.alternatives].sort((a, b) => a.position - b.position);
  return (
    <ul className="grid gap-2 sm:grid-cols-2" data-testid="tradeoffs">
      {alts.map((a) => (
        <li key={a.id} className={cn("grid gap-1.5 rounded-[var(--ws-radius-md)] border border-ws-border p-3", a.status === "DESCARTADA" && "opacity-75")}>
          <p className="text-[length:var(--ws-text-body-sm)] font-semibold">{a.label} — {a.title}</p>
          <div className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
            {a.pros.length ? a.pros.map((p) => <p key={p}><span className="font-semibold text-ws-success-ink" aria-label={t("decia.tradeoff.pros")}>+</span> {p}</p>) : null}
            {a.cons.length ? a.cons.map((c) => <p key={c}><span className="font-semibold text-ws-danger-ink" aria-label={t("decia.tradeoff.cons")}>−</span> {c}</p>) : null}
            {!a.pros.length && !a.cons.length ? <p className="text-ws-text-muted">{t("decia.tradeoff.none")}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Linha do tempo dos estados (de decision_events), com ícone e texto. */
export function DecisionTimeline({ items }: { items: { status: DecisionLifecycle; at: string }[] }) {
  const { t, intl } = useI18n();
  if (!items.length) return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("decia.timeline.empty")}</p>;
  return (
    <ol className="relative grid gap-2 before:absolute before:bottom-2 before:left-[0.55rem] before:top-2 before:w-px before:bg-ws-border" aria-label={t("decia.timeline.title")}>
      {items.map((it, i) => (
        <li key={`${it.status}-${i}`} className="relative grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 text-[length:var(--ws-text-body-sm)]">
          <span aria-hidden className="z-[1] flex size-[1.15rem] items-center justify-center rounded-full border border-ws-border bg-ws-surface-1 text-[10px]">{STATUS_META[it.status].icon}</span>
          <span className={cn(i === items.length - 1 && "font-semibold")}>{t(`decia.status.${it.status}`)}</span>
          <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted">{formatDay(it.at, intl)}</span>
        </li>
      ))}
    </ol>
  );
}
