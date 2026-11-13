"use client";
import { Fragment } from "react";
import { cn } from "@/components/ui";
import type { Span } from "@/lib/memory/text";

/**
 * Trecho com os termos casados destacados (`<mark>`), sem alterar o texto: os destaques são posições sobre o trecho exato.
 * O destaque tem cor de token E sublinhado (não depende só da cor).
 */
export function PassageText({ text, highlights, className }: { text: string; highlights: readonly Span[]; className?: string }) {
  const marks = [...highlights].filter((h) => h.start >= 0 && h.end <= text.length && h.end > h.start).sort((a, b) => a.start - b.start);
  const parts: { text: string; mark: boolean }[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start < pos) continue;
    if (m.start > pos) parts.push({ text: text.slice(pos, m.start), mark: false });
    parts.push({ text: text.slice(m.start, m.end), mark: true });
    pos = m.end;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), mark: false });
  return (
    <span className={cn("whitespace-pre-line", className)}>
      {parts.map((p, i) =>
        p.mark ? (
          <mark key={i} className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-0.5 text-ws-text underline decoration-ws-warning decoration-2 underline-offset-2">
            {p.text}
          </mark>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </span>
  );
}
