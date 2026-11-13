"use client";
/**
 * Texto da demanda com o trecho de origem realçado (D-12: todo fato extraído mostra de onde veio). O trecho ativo rola para a
 * vista e é anunciado em região "polite" para leitor de tela.
 */
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Span } from "@/lib/projects/autopilot/text";

export function SourceText({ text, highlight, onClear }: { text: string; highlight: Span | null; onClear: () => void }) {
  const { t } = useI18n();
  const markRef = useRef<HTMLElement>(null);
  const valid = highlight && highlight.start >= 0 && highlight.end <= text.length && highlight.end > highlight.start ? highlight : null;

  useEffect(() => {
    if (valid) markRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [valid]);

  return (
    <section aria-labelledby="ap-source-title" className="grid content-start gap-2 rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] lg:sticky lg:top-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ap-source-title" className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("autopilot.source.title")}</h3>
        {valid ? <Button size="sm" variant="ghost" onClick={onClear}>{t("autopilot.source.clear")}</Button> : null}
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("autopilot.source.hint")}</p>
      <div className="max-h-[60dvh] overflow-auto whitespace-pre-wrap break-words rounded-[var(--ws-radius-md)] bg-ws-surface-2 p-[var(--ws-space-3)] font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] leading-relaxed text-ws-text" data-source-text>
        {valid ? (
          <>
            {text.slice(0, valid.start)}
            <mark ref={markRef} className="rounded-[var(--ws-radius-sm)] bg-ws-ai-spark-soft px-0.5 font-semibold text-ws-text outline outline-1 outline-ws-ai-spark" data-highlight>
              {text.slice(valid.start, valid.end)}
            </mark>
            {text.slice(valid.end)}
          </>
        ) : text}
      </div>
      <p className="sr-only" aria-live="polite">{valid ? t("autopilot.source.showing", { text: text.slice(valid.start, valid.end).replace(/\s+/g, " ").slice(0, 160) }) : ""}</p>
    </section>
  );
}
