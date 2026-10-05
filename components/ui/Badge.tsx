import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Badge (contador/etiqueta curta) e Tag (etiqueta de protocolo, DESIGN_SYSTEM.md §3). Tons semânticos por token:
 * neutro · accent · success · warning · danger · info · spark (IA) · node-*. `pulse` para EM_USO/EM_DECISAO.
 */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "spark" | "red" | "yellow" | "green" | "blue" | "brown" | "orange";

const TONE: Record<Tone, string> = {
  neutral: "bg-ws-surface-2 text-ws-text-muted border-ws-border",
  accent: "bg-ws-accent-soft text-ws-accent-ink border-transparent",
  success: "bg-ws-success-soft text-ws-success-ink border-transparent",
  warning: "bg-ws-warning-soft text-ws-warning-ink border-transparent",
  danger: "bg-ws-danger-soft text-ws-danger-ink border-transparent",
  info: "bg-ws-info-soft text-ws-info-ink border-transparent",
  spark: "bg-ws-ai-spark-soft text-ws-ai-spark-ink border-transparent",
  red: "bg-ws-node-red-soft text-ws-node-red-ink border-transparent",
  yellow: "bg-ws-node-yellow-soft text-ws-node-yellow-ink border-transparent",
  green: "bg-ws-node-green-soft text-ws-node-green-ink border-transparent",
  blue: "bg-ws-node-blue-soft text-ws-node-blue-ink border-transparent",
  brown: "bg-ws-node-brown-soft text-ws-node-brown-ink border-transparent",
  orange: "bg-ws-node-orange-soft text-ws-node-orange-ink border-transparent",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** contador numérico: fundo cheio em danger (como .ws-nav__badge) */
  count?: boolean;
  className?: string;
  title?: string;
}

export function Badge({ children, tone = "neutral", count = false, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--ws-radius-pill)] border font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-label)] font-bold uppercase tracking-[var(--ws-text-label--tracking)] leading-none",
        count ? "min-w-[1.25rem] px-1.5 py-0.5 bg-ws-danger text-ws-on-danger border-transparent tabular-nums normal-case tracking-normal" : cn("px-2 py-1", TONE[tone]),
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface TagProps {
  children: ReactNode;
  tone?: Tone;
  /** traço tracejado (RASCUNHO) */
  dashed?: boolean;
  /** anel pulsando (EM_USO / EM_DECISAO), respeita reduced-motion */
  pulse?: boolean;
  /** cheia (carimbo) */
  filled?: boolean;
  className?: string;
}

const FILLED: Partial<Record<Tone, string>> = {
  accent: "bg-ws-accent text-ws-on-accent", success: "bg-ws-success text-ws-on-success", warning: "bg-ws-warning text-ws-on-warning",
  danger: "bg-ws-danger text-ws-on-danger", info: "bg-ws-info text-ws-on-info", spark: "bg-ws-ai-spark text-ws-on-ai-spark", neutral: "bg-ws-ink text-ws-cream",
};

export function Tag({ children, tone = "neutral", dashed, pulse, filled, className }: TagProps) {
  return (
    <span
      data-pulse={pulse || undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--ws-radius-sm)] border px-2 py-0.5 text-[length:var(--ws-text-caption)] font-semibold leading-tight",
        filled ? cn("border-transparent", FILLED[tone] ?? FILLED.neutral) : TONE[tone],
        dashed && "border-dashed border-ws-border-strong",
        pulse && "motion-safe:animate-pulse",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Chip do RF ("RF27") usado no cabeçalho das páginas-esqueleto. */
export function RfChip({ id, primary = false }: { id: string; primary?: boolean }) {
  return (
    <Badge tone={primary ? "accent" : "neutral"} className={primary ? "text-[length:var(--ws-text-caption)] px-2.5 py-1" : undefined} title={id}>
      {id}
    </Badge>
  );
}
