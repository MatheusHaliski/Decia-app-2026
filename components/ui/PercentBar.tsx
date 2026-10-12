"use client";
import { useI18n } from "@/lib/i18n/useI18n";
import { cn } from "./cn";

/**
 * PercentBar (DECIA_SESSAO_E_MESA.md §B.5 "rumo à decisão"; PhaseBar simplificada): valor 0–100 com o número em texto
 * (nunca só a cor), role=progressbar. Tom por token; `segments` desenha marcos (fases) sobre a trilha.
 */
export interface PercentBarProps {
  value: number;
  label: string;
  tone?: "accent" | "success" | "warning" | "danger" | "info" | "spark";
  segments?: number;
  showValue?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const FILL: Record<NonNullable<PercentBarProps["tone"]>, string> = {
  accent: "bg-ws-accent", success: "bg-ws-success", warning: "bg-ws-warning", danger: "bg-ws-danger", info: "bg-ws-info", spark: "[background:var(--ws-gradient-brand)]",
};

export function PercentBar({ value, label, tone = "accent", segments, showValue = true, className, size = "md" }: PercentBarProps) {
  const { intl } = useI18n();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const text = new Intl.NumberFormat(intl, { style: "percent" }).format(v / 100);
  return (
    <div className={cn("grid gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[length:var(--ws-text-caption)]">
        <span className="font-semibold text-ws-text">{label}</span>
        {showValue ? <span className="font-[family-name:var(--ws-font-mono)] tabular-nums text-ws-text-muted">{text}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={text}
        className={cn("relative w-full overflow-hidden rounded-[var(--ws-radius-pill)] bg-ws-surface-3", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <span className={cn("block h-full rounded-[var(--ws-radius-pill)] transition-[width] duration-[var(--ws-duration-slow)]", FILL[tone])} style={{ width: `${v}%` }} />
        {segments && segments > 1
          ? Array.from({ length: segments - 1 }).map((_, i) => (
              <span key={i} aria-hidden className="absolute top-0 h-full w-px bg-ws-surface-1" style={{ left: `${((i + 1) / segments) * 100}%` }} />
            ))
          : null}
      </div>
    </div>
  );
}
