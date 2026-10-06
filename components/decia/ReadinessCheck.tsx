"use client";
import { Tag, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Readiness } from "@/lib/decia/rules";
import { CHECK_META, READINESS_META } from "./meta";

/** Resumo da prontidão (§6.7): nível em texto + número de alertas — nunca um número de 0 a 100. */
export function ReadinessSummary({ readiness, className }: { readiness: Readiness; className?: string }) {
  const { t } = useI18n();
  const m = READINESS_META[readiness.level];
  const alerts = readiness.checks.filter((c) => c.state === "ALERTA").length;
  const missing = readiness.checks.filter((c) => c.state === "FALTA").length;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-[length:var(--ws-text-caption)] font-semibold text-ws-text", className)} data-testid="readiness">
      <Tag tone={m.tone} className="whitespace-nowrap"><span aria-hidden>{m.icon}</span>{t(`decia.readiness.${readiness.level}`)}</Tag>
      {alerts ? <span className="text-ws-text-muted">{t(alerts === 1 ? "decia.readiness.alertsOne" : "decia.readiness.alertsMany", { n: alerts })}</span> : null}
      {missing ? <span className="text-ws-text-muted">{t(missing === 1 ? "decia.readiness.missingOne" : "decia.readiness.missingMany", { n: missing })}</span> : null}
    </span>
  );
}

/** Checklist completo (OK / ALERTA / FALTA por item), com o estado sempre em texto. */
export function ReadinessCheck({ readiness, className }: { readiness: Readiness; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("grid gap-2", className)}>
      <ReadinessSummary readiness={readiness} />
      <ul className="grid gap-1" aria-label={t("decia.readiness.checklist")}>
        {readiness.checks.map((c) => {
          const m = CHECK_META[c.state];
          return (
            <li key={c.key} className="flex items-start gap-2 text-[length:var(--ws-text-body-sm)]" data-state={c.state}>
              <Tag tone={m.tone} className="min-w-[4.75rem] justify-center whitespace-nowrap"><span aria-hidden>{m.icon}</span>{t(`decia.check.${c.state}`)}</Tag>
              <span className="pt-0.5">{t(`decia.readiness.check.${c.key}`)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
