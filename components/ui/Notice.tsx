"use client";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Glyph, type GlyphName } from "./glyphs/Glyph";

/**
 * Notice: faixa de aviso em texto (modo demonstração, "Em breve", dicas). O tom vem do token e o estado nunca é só cor: há sempre
 * um rótulo em texto (`label`, ex.: "Modo demonstração") antes da mensagem. `role="note"` por padrão (informação estável); use
 * `role="status"` quando a faixa aparecer em resposta a uma ação.
 */
export type NoticeTone = "info" | "warning" | "success" | "neutral" | "spark";

const TONE: Record<NoticeTone, string> = {
  info: "bg-ws-info-soft border-ws-border",
  warning: "bg-ws-warning-soft border-ws-border",
  success: "bg-ws-success-soft border-ws-border",
  neutral: "bg-ws-surface-1 border-ws-border",
  spark: "bg-ws-ai-spark-soft border-ws-border",
};

export interface NoticeProps {
  /** rótulo curto em texto, em destaque (o "o que é" do aviso) */
  label: ReactNode;
  children: ReactNode;
  tone?: NoticeTone;
  glyph?: GlyphName;
  action?: ReactNode;
  role?: "note" | "status" | "region";
  /** nome acessível quando `role="region"` */
  ariaLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function Notice({ label, children, tone = "info", glyph, action, role = "note", ariaLabel, className, ...rest }: NoticeProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      data-testid={rest["data-testid"]}
      className={cn("flex flex-wrap items-start gap-x-3 gap-y-1 rounded-[var(--ws-radius-md)] border px-[var(--ws-space-3)] py-[var(--ws-space-2)] text-[length:var(--ws-text-body-sm)] text-ws-text", TONE[tone], className)}
    >
      {glyph ? <Glyph name={glyph} size={20} decorative className="mt-0.5 shrink-0" /> : null}
      <p className="min-w-0 flex-1 basis-60">
        <strong className="font-semibold">{label}</strong> <span className="text-ws-text-muted">{children}</span>
      </p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
