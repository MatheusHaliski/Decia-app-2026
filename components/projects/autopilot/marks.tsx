"use client";
/**
 * Marcas do Autopiloto (RF30, D-12): "✦" = proposta da IA (simulada e determinística — regras sobre o texto e as receitas);
 * "✎" = a pessoa mudou. Sempre com texto para leitor de tela, nunca só cor.
 */
import { cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";

export function ProposalMark({ edited, className }: { edited?: boolean; className?: string }) {
  const { t } = useI18n();
  const label = t(edited ? "autopilot.mark.edited" : "autopilot.mark.ai");
  return (
    <span title={label} className={cn("inline-flex shrink-0 items-center font-semibold", edited ? "text-ws-text-muted" : "text-ws-ai-spark-ink", className)} data-mark={edited ? "edited" : "ai"}>
      <span aria-hidden>{edited ? "✎" : "✦"}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
