"use client";
/**
 * Relatório de critérios da chancela (RF39.CA04, `criteriaReportJson`): cada critério com o valor calculado pelo sistema, o mínimo
 * e "atende"/"não atende" em texto (nunca só cor), e a síntese ✦ da IA simulada montada só com esses números (D-12).
 */
import { AiText } from "@/components/points/shared";
import { Tag } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { CriterionResult } from "@/lib/seals/types";

export function criterionValue(r: CriterionResult, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (typeof r.value === "boolean") return t(r.value ? "common.yes" : "common.no");
  if (r.criterion === "CONFORMIDADE_MIN") return t("seals.report.percent", { n: r.value, min: r.threshold ?? 0 });
  if (r.criterion === "SEM_PENDENCIA") return t("seals.report.pending", { n: r.value });
  return t("seals.report.count", { n: r.value, min: r.threshold ?? 0 });
}

export function CriteriaReport({ results, compact = false }: { results: readonly CriterionResult[]; compact?: boolean }) {
  const { t } = useI18n();
  const met = results.filter((r) => r.met).length;
  const missing = results.filter((r) => !r.met).map((r) => t(`seals.criterion.${r.criterion}`));
  return (
    <div className="grid gap-2" data-testid="criteria-report">
      <ul className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
        {results.map((r) => (
          <li key={r.criterion} className="flex flex-wrap items-center gap-2">
            <Tag tone={r.met ? "success" : "danger"}>{t(r.met ? "seals.report.met" : "seals.report.notMet")}</Tag>
            <span className="font-semibold">{t(`seals.criterion.${r.criterion}`)}</span>
            <span className="text-ws-text-muted">{criterionValue(r, t)}</span>
          </li>
        ))}
      </ul>
      {!compact ? (
        <p className="text-[length:var(--ws-text-caption)]">
          <AiText>{missing.length ? t("seals.report.summaryMissing", { met, total: results.length, missing: missing.join(", ") }) : t("seals.report.summaryAll", { total: results.length })}</AiText>
        </p>
      ) : null}
    </div>
  );
}
