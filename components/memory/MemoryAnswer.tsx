"use client";
import { Badge, Link } from "@/components/ui";
import type { MemoryAnswer } from "@/lib/memory/answer";
import { useI18n } from "@/lib/i18n/useI18n";
import { hitAnchor } from "./labels";

/**
 * Resposta da IA ✦ (simulada, D-12): só frases exatas dos trechos recuperados, cada uma com a citação numerada que leva ao
 * cartão do trecho. Sem trecho relevante, diz que não encontrou fonte — nunca responde de memória.
 */
export function MemoryAnswerPanel({ answer, stale }: { answer: MemoryAnswer; stale: boolean }) {
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="memory-answer-title"
      aria-live="polite"
      data-origin="IA"
      data-testid="memory-answer"
      className="grid gap-2 rounded-[var(--ws-radius-lg)] border border-ws-ai-spark bg-ws-ai-spark-soft p-[var(--ws-space-4)] text-ws-text"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="text-ws-ai-spark-ink">✦</span>
        <h2 id="memory-answer-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold text-ws-ai-spark-ink">{t("memory.answer.title")}</h2>
        <Badge tone="spark">{t("memory.answer.badge")}</Badge>
      </div>
      {stale ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.answer.stale")}</p> : null}
      {answer.status === "SEM_FONTE" ? (
        <div data-testid="memory-answer-nosource" className="grid gap-1">
          <p className="font-semibold text-ws-ai-spark-ink">✦ {t("memory.answer.noSource")}</p>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("memory.answer.noSourceHint")}</p>
        </div>
      ) : (
        <>
          <p className="text-[length:var(--ws-text-body-sm)] text-ws-ai-spark-ink">✦ {t("memory.answer.intro", { n: answer.items.length })}</p>
          <ol className="grid gap-2">
            {answer.items.map((item) => (
              <li key={item.n} className="grid gap-0.5" data-testid="memory-answer-item">
                <p className="text-[length:var(--ws-text-body)] leading-relaxed">
                  “{item.quote.text}”{" "}
                  <Link href={`#${hitAnchor(item.hitIndex + 1)}`} aria-label={t("memory.answer.cite", { n: item.n })} className="font-[family-name:var(--ws-font-mono)] font-semibold">
                    [{item.n}]
                  </Link>
                </p>
                <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">[{item.n}] {item.citation}</p>
              </li>
            ))}
          </ol>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("memory.answer.footer")}</p>
        </>
      )}
    </section>
  );
}
