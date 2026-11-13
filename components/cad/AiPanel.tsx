"use client";
/**
 * Painel ✦ da bancada (D-12): a "IA" simulada só resume e alerta a partir dos números calculados na tela e responde quando a
 * pessoa pede (SOB_SOLICITACAO, D-136). Nada sai do navegador; nenhum número é inventado.
 */
import { Badge, Button } from "@/components/ui";
import type { AiNote } from "@/lib/cad/assistant";
import type { CadText } from "./useCadText";

export interface AiPanelProps {
  /** null = ainda não pedido */
  notes: readonly AiNote[] | null;
  onAsk: () => void;
  disabled?: boolean;
  text: CadText;
}

const ICON: Record<AiNote["tone"], string> = { RESUMO: "✦", ALERTA: "⚠", PROXIMO: "→" };

export function AiPanel({ notes, onAsk, disabled, text }: AiPanelProps) {
  const { t } = text;
  return (
    <section aria-labelledby="cad-ai-title" className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-3)]" data-testid="cad-ai" data-origin="SISTEMA">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <Badge tone="spark">{t("cad.ai.badge")}</Badge>
        <h2 id="cad-ai-title" className="min-w-0 flex-1 text-[length:var(--ws-text-body)] font-semibold">{t("cad.ai.title")}</h2>
      </div>
      {notes ? (
        <ul className="grid gap-1.5" aria-live="polite" data-testid="cad-ai-notes">
          {notes.map((n, i) => (
            <li key={`${n.code}-${i}`} data-note={n.code} data-tone={n.tone} className="flex gap-2 text-[length:var(--ws-text-body-sm)] text-ws-text">
              <span aria-hidden className="text-ws-ai-spark-ink">{ICON[n.tone]}</span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <span className="sr-only">{t(`cad.ai.tone.${n.tone}`)}: </span>
                {text.note(n)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]">{t("cad.ai.intro")}</p>
          <Button size="sm" variant="spark" onClick={onAsk} disabled={disabled} data-testid="cad-ai-ask">✦ {t("cad.ai.ask")}</Button>
        </div>
      )}
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cad.ai.engineNote")}</p>
    </section>
  );
}
