"use client";
import type { ReactNode } from "react";
import { Badge, Button, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Sugestão da IA (G2, RF38.CA04): faísca ✦ com os tokens --ws-ai-spark*, origem explícita e aceitar/descartar com
 * facilidade ([REF-AMERSHI] G8/G9). A IA sugere estrutura; nunca decide — só entra no registro com aceite humano.
 */
export interface AiSuggestionProps {
  title: ReactNode;
  children?: ReactNode;
  status?: "SUGERIDA" | "ACEITA" | "DESCARTADA";
  onAccept?: () => void;
  onDismiss?: () => void;
  /** placeholder enquanto o serviço de IA não está conectado */
  disabled?: boolean;
  className?: string;
}

export function AiSuggestion({ title, children, status = "SUGERIDA", onAccept, onDismiss, disabled, className }: AiSuggestionProps) {
  const { t } = useI18n();
  return (
    <div className={cn("grid gap-2 rounded-[var(--ws-radius-md)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-3)] text-ws-text", status === "DESCARTADA" && "opacity-70", className)} data-origin="IA">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <Badge tone="spark">{t("decia.ai.badge")}</Badge>
        <span className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] font-semibold">{title}</span>
        {status !== "SUGERIDA" ? <Badge tone={status === "ACEITA" ? "success" : "neutral"}>{t(status === "ACEITA" ? "decia.ai.accepted" : "decia.ai.dismissed")}</Badge> : null}
      </div>
      {children ? <div className="text-[length:var(--ws-text-body-sm)] text-ws-text">{children}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        {status === "SUGERIDA" && (onAccept || onDismiss || disabled) ? (
          <>
            <Button size="sm" variant="spark" onClick={onAccept} disabled={disabled || !onAccept}>{t("decia.ai.accept")}</Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} disabled={disabled || !onDismiss}>{t("decia.ai.dismiss")}</Button>
          </>
        ) : null}
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("decia.ai.neverDecides")}</span>
      </div>
    </div>
  );
}
