"use client";
/**
 * Navegar em documento longo (RF52.CA03): sumário a partir dos títulos e busca dentro da peça com destaque,
 * contagem "n de m" e anterior/próximo. Ir a um título ou resultado foca o bloco e seleciona exatamente o trecho;
 * Enter/Shift+Enter no campo de busca avançam sem tirar o foco do campo.
 */
import { useMemo, useState, type KeyboardEvent } from "react";
import { Button, Card, Field, Input, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { outline, searchBlocks, stepMatch, type SearchMatch } from "@/lib/letters/io/navigate";
import type { LetterBlock } from "@/lib/letters/types";
import { excerptContext } from "./shared";

const SHOWN = 50;

export interface NavigatorCardProps {
  blocks: readonly LetterBlock[];
  label: (blockId: string) => string;
  /** seleciona [start, end) no bloco; `focus` = levar o foco ao editor */
  onGoTo: (blockId: string, start: number, end: number, focus: boolean) => void;
  /** resultados atuais (para destacar os blocos no editor) */
  onMatches?: (matches: readonly SearchMatch[], current: number) => void;
}

export function NavigatorCard({ blocks, label, onGoTo, onMatches }: NavigatorCardProps) {
  const { t, intl } = useI18n();
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(-1);
  const toc = useMemo(() => outline(blocks), [blocks]);
  const matches = useMemo(() => searchBlocks(blocks, query), [blocks, query]);
  const nf = new Intl.NumberFormat(intl);
  const idx = current >= 0 && current < matches.length ? current : matches.length ? 0 : -1;

  const go = (i: number, focus: boolean) => {
    const m = matches[i];
    if (!m) return;
    setCurrent(i);
    onMatches?.(matches, i);
    onGoTo(m.blockId, m.start, m.end, focus);
  };
  const step = (dir: 1 | -1, focus: boolean) => go(current < 0 ? (dir === 1 ? 0 : matches.length - 1) : stepMatch(idx, matches.length, dir), focus);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    step(e.shiftKey ? -1 : 1, false);
  };
  const onQuery = (q: string) => {
    setQuery(q);
    setCurrent(-1);
    onMatches?.(searchBlocks(blocks, q), -1);
  };

  return (
    <Card title={t("letters.io.nav.title")} eyebrow="RF52" data-testid="letters-navigator">
      <div className="grid gap-[var(--ws-space-4)] md:grid-cols-2">
        <nav aria-labelledby="letters-toc-title" className="grid content-start gap-1.5">
          <h3 id="letters-toc-title" className="text-[length:var(--ws-text-body-sm)] font-semibold">{t("letters.io.nav.outline")}</h3>
          {toc.length ? (
            <ol className="grid gap-0.5" data-testid="letters-toc">
              {toc.map((e) => (
                <li key={e.blockId} className={cn(e.level === 2 && "pl-3", e.level === 3 && "pl-6")}>
                  <Button size="sm" variant="ghost" className="h-auto min-h-0 w-full justify-start py-1 text-left font-normal" aria-label={t("letters.io.nav.goToHeading", { title: e.text })} onClick={() => onGoTo(e.blockId, 0, 0, true)}>
                    <span className={cn("line-clamp-2", e.level === 1 && "font-semibold")}>{e.text}</span>
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("letters.io.nav.outlineEmpty")}</p>
          )}
        </nav>

        <div className="grid content-start gap-2" role="search" aria-label={t("letters.io.nav.search")}>
          <Field label={t("letters.io.nav.search")} hint={t("letters.io.nav.searchHint")}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="search" leading="buscar" value={query} maxLength={200} onChange={(e) => onQuery(e.target.value)} onKeyDown={onKey} data-testid="letters-search" />}
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-[length:var(--ws-text-body-sm)]" aria-live="polite" data-testid="letters-search-status">
              {!query.trim()
                ? ""
                : matches.length
                  ? current >= 0
                    ? t("letters.io.nav.position", { current: nf.format(idx + 1), total: nf.format(matches.length), block: label(matches[idx]!.blockId) })
                    : t("letters.io.nav.found", { total: nf.format(matches.length) })
                  : t("letters.io.nav.noResults", { query: query.trim() })}
            </p>
            <Button size="sm" variant="default" disabled={!matches.length} onClick={() => step(-1, true)}>{t("letters.io.nav.prev")}</Button>
            <Button size="sm" variant="default" disabled={!matches.length} onClick={() => step(1, true)}>{t("letters.io.nav.next")}</Button>
          </div>
          {matches.length ? (
            <ol className="grid max-h-64 gap-1 overflow-y-auto" aria-label={t("letters.io.nav.resultsList")} data-testid="letters-search-results">
              {matches.slice(0, SHOWN).map((m, i) => {
                const text = blocks.find((b) => b.id === m.blockId)?.text ?? "";
                const c = excerptContext(text, m.start, m.end, 32);
                return (
                  <li key={`${m.blockId}-${m.start}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-current={i === idx && current >= 0 ? "true" : undefined}
                      className={cn("h-auto min-h-0 w-full justify-start whitespace-normal py-1 text-left font-normal", i === idx && current >= 0 && "bg-ws-accent-soft")}
                      aria-label={t("letters.io.nav.goToResult", { n: i + 1, block: label(m.blockId) })}
                      onClick={() => go(i, true)}
                    >
                      <span className="grid gap-0.5">
                        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{label(m.blockId)}</span>
                        <span className="break-words">
                          {c.before}
                          <mark className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-0.5 text-ws-text">{c.match}</mark>
                          {c.after}
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {matches.length > SHOWN ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("letters.io.nav.firstOnly", { count: SHOWN })}</p> : null}
        </div>
      </div>
    </Card>
  );
}
