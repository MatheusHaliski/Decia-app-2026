"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { AuthorshipSummary } from "@/lib/social/authorship";
import { cn } from "@/components/ui";

function labelFor(summary: AuthorshipSummary, t: (key: string, values?: Record<string, string | number>) => string) {
  const percentage = summary.aiPercentage;
  const category = summary.category === "HUMAN"
    ? t("social.authorship.human")
    : summary.category === "HUMAN_AI"
      ? t("social.authorship.mixed", { percentage: percentage ?? "—" })
      : summary.category === "AI"
        ? t("social.authorship.ai", { percentage: percentage ?? "—" })
        : t("social.authorship.unverified");
  const evidence = summary.evidence === "TRACE"
    ? t("social.authorship.trace")
    : summary.evidence === "SELF_DECLARED"
      ? t("social.authorship.selfDeclared")
      : t("social.authorship.unverifiedEvidence");
  return `${category} · ${evidence}`;
}

export function AuthorshipBadge({ summary }: { summary: AuthorshipSummary }) {
  const { t } = useI18n();
  const label = labelFor(summary, t);
  const icon = summary.category === "HUMAN" ? "✎" : summary.category === "AI" ? "✦" : summary.category === "HUMAN_AI" ? "✎✦" : "?";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="authorship-badge"
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-[var(--ws-radius-sm)] px-1.5 py-0.5 text-[length:var(--ws-text-caption)] font-medium",
        summary.category === "HUMAN" ? "bg-ws-node-blue-soft text-ws-node-blue-ink"
          : summary.category === "UNVERIFIED" ? "bg-ws-surface-2 text-ws-text-muted"
            : "bg-ws-ai-spark-soft text-ws-ai-spark-ink",
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
