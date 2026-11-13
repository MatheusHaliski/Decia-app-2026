"use client";
/**
 * Comparação ANTES × DEPOIS por palavra, acessível: removido em <del> riscado com "−" e rótulo para leitor de tela, inserido em
 * <ins> sublinhado com "+" — a cor é só reforço (WCAG 1.4.1). Duas visões: lado a lado (antes | depois) e unificada.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { diffWords, type DiffPart } from "@/lib/decia/audit/diff";

function Part({ p }: { p: DiffPart }) {
  const { t } = useI18n();
  if (p.op === "IGUAL") return <span>{p.text}</span>;
  if (p.op === "REMOVIDO") {
    return (
      <del className="rounded-[var(--ws-radius-sm)] bg-ws-danger-soft px-0.5 text-ws-danger-ink line-through decoration-2" data-op="removido">
        <span className="sr-only">{t("audit.diff.srRemoved")}</span><span aria-hidden className="font-semibold no-underline">−</span>{p.text}
      </del>
    );
  }
  return (
    <ins className="rounded-[var(--ws-radius-sm)] bg-ws-success-soft px-0.5 text-ws-success-ink underline decoration-2 underline-offset-2" data-op="inserido">
      <span className="sr-only">{t("audit.diff.srInserted")}</span><span aria-hidden className="font-semibold">+</span>{p.text}
    </ins>
  );
}

export interface WordDiffProps { before: string; after: string; beforeLabel: string; afterLabel: string; defaultView?: "LADO_A_LADO" | "UNIFICADO" }

export function WordDiff({ before, after, beforeLabel, afterLabel, defaultView = "LADO_A_LADO" }: WordDiffProps) {
  const { t } = useI18n();
  const [view, setView] = useState(defaultView);
  const d = useMemo(() => diffWords(before, after), [before, after]);
  const box = "min-h-12 whitespace-pre-wrap rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)] [overflow-wrap:anywhere]";
  return (
    <div className="grid gap-2" data-testid="word-diff">
      <div className="flex flex-wrap items-center gap-2">
        <p aria-live="polite" className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="diff-summary">
          {d.identical ? t("audit.diff.identical") : t("audit.diff.summary", { removed: d.removedWords, inserted: d.insertedWords })}
          {d.truncated ? ` ${t("audit.diff.truncated")}` : ""}
        </p>
        <div role="group" aria-label={t("audit.diff.viewLabel")} className="flex gap-1">
          <Button size="sm" variant={view === "LADO_A_LADO" ? "primary" : "ghost"} aria-pressed={view === "LADO_A_LADO"} onClick={() => setView("LADO_A_LADO")}>{t("audit.diff.sideBySide")}</Button>
          <Button size="sm" variant={view === "UNIFICADO" ? "primary" : "ghost"} aria-pressed={view === "UNIFICADO"} onClick={() => setView("UNIFICADO")}>{t("audit.diff.unified")}</Button>
        </div>
      </div>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("audit.diff.legend")}</p>
      {view === "LADO_A_LADO" ? (
        <div className="grid gap-2 md:grid-cols-2">
          <section aria-label={beforeLabel} className="grid gap-1">
            <h4 className="text-[length:var(--ws-text-caption)] font-semibold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{beforeLabel}</h4>
            <div className={box} data-testid="diff-before">{before ? d.parts.filter((p) => p.op !== "INSERIDO").map((p, i) => <Part key={i} p={p} />) : <span className="text-ws-text-muted">{t("audit.diff.empty")}</span>}</div>
          </section>
          <section aria-label={afterLabel} className="grid gap-1">
            <h4 className="text-[length:var(--ws-text-caption)] font-semibold uppercase tracking-[var(--ws-text-label--tracking)] text-ws-text-muted">{afterLabel}</h4>
            <div className={box} data-testid="diff-after">{after ? d.parts.filter((p) => p.op !== "REMOVIDO").map((p, i) => <Part key={i} p={p} />) : <span className="text-ws-text-muted">{t("audit.diff.empty")}</span>}</div>
          </section>
        </div>
      ) : (
        <div className={box} data-testid="diff-unified" aria-label={t("audit.diff.unifiedLabel", { before: beforeLabel, after: afterLabel })}>
          {d.parts.length ? d.parts.map((p, i) => <Part key={i} p={p} />) : <span className="text-ws-text-muted">{t("audit.diff.empty")}</span>}
        </div>
      )}
    </div>
  );
}
