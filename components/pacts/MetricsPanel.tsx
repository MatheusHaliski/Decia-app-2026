"use client";
import { Card } from "@/components/ui";
import type { Distribution, PactMetrics } from "@/lib/pacts/metrics";
import { PACT_STATES } from "@/lib/pacts/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { formatDays, formatPercent } from "./labels";

function Stat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId?: string }) {
  return (
    <div className="grid gap-0.5 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-3" data-testid={testId}>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{label}</p>
      <p className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold tabular-nums">{value}</p>
      {detail ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{detail}</p> : null}
    </div>
  );
}

/**
 * Métricas dos pactos (RF49.CA12): agregadas, com amostra; "sem dados" quando não há amostra (nunca zero); casos abertos,
 * recusados e cancelados visíveis; sem placar individual e sem "atraso evitado" (seria estimativa, não resultado).
 */
export function MetricsPanel({ metrics, scopeLabel }: { metrics: PactMetrics; scopeLabel: string }) {
  const { t, intl } = useI18n();
  const noData = t("pacts.metrics.noData");
  const dist = (d: Distribution) => (d.n ? t("pacts.metrics.medianP90", { median: formatDays(d.median!, intl), p90: formatDays(d.p90!, intl) }) : noData);
  const sample = (d: Distribution) => t("pacts.metrics.sample", { n: d.n });
  return (
    <Card as="section" aria-labelledby="pact-metrics-title" className="grid gap-3" data-testid="pact-metrics">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pact-metrics-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("pacts.metrics.title")}</h2>
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{scopeLabel} · {t("pacts.metrics.total", { n: metrics.total })}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={t("pacts.metrics.waitToCommit")} value={dist(metrics.waitToCommit)} detail={sample(metrics.waitToCommit)} testId="pact-metric-commit" />
        <Stat label={t("pacts.metrics.waitToValidation")} value={dist(metrics.waitToValidation)} detail={sample(metrics.waitToValidation)} testId="pact-metric-validation" />
        <Stat label={t("pacts.metrics.returns")} value={metrics.returnRate === null ? noData : formatPercent(metrics.returnRate, intl)} detail={t("pacts.metrics.returnsDetail", { returns: metrics.returns, deliveries: metrics.deliveries })} />
        <Stat label={t("pacts.metrics.onTime")} value={metrics.onTime.rate === null ? noData : formatPercent(metrics.onTime.rate, intl)} detail={t("pacts.metrics.onTimeDetail", { ok: metrics.onTime.onTime, n: metrics.onTime.eligible })} />
        <Stat label={t("pacts.metrics.renegotiations")} value={String(metrics.renegotiationsRequested)} detail={t("pacts.metrics.renegotiationsDetail", { accepted: metrics.renegotiationsAccepted })} />
        <Stat label={t("pacts.metrics.unblocks")} value={String(metrics.unblocksConfirmed)} detail={t("pacts.metrics.unblocksDetail", { n: metrics.validatedWithoutUnblock })} />
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[24rem] border-collapse text-[length:var(--ws-text-body-sm)]">
          <caption className="sr-only">{t("pacts.metrics.byStatus")}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-ws-border p-1.5 text-left">{t("pacts.metrics.status")}</th>
              <th scope="col" className="border-b border-ws-border p-1.5 text-right">{t("pacts.metrics.count")}</th>
            </tr>
          </thead>
          <tbody>
            {PACT_STATES.map((s) => (
              <tr key={s}>
                <th scope="row" className="border-b border-ws-border p-1.5 text-left font-normal">{t(`pacts.status.${s}`)}</th>
                <td className="border-b border-ws-border p-1.5 text-right tabular-nums">{metrics.byStatus[s]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("pacts.metrics.note")}</p>
    </Card>
  );
}
