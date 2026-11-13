"use client";
import { Badge, Card, EmptyState, Link, Tag } from "@/components/ui";
import { readerHref } from "@/lib/memory/citation";
import type { ExplainedHit, TermMatch } from "@/lib/memory/types";
import { useI18n } from "@/lib/i18n/useI18n";
import { accessKey, formatPct, formatScore, hitAnchor, kindKey, originKey } from "./labels";
import { PassageText } from "./PassageText";

function MatchLine({ m }: { m: TermMatch }) {
  const { t, intl } = useI18n();
  if (m.via === "SINONIMO") return <li>{t("memory.hit.via.SINONIMO", { q: m.query, surface: m.surface, from: m.synonym?.from ?? m.query, to: m.synonym?.to ?? m.surface })}</li>;
  if (m.via === "APROXIMADO") return <li>{t("memory.hit.via.APROXIMADO", { q: m.query, surface: m.surface, pct: formatPct(m.similarity ?? 0, intl) })}</li>;
  return <li>{t("memory.hit.via.EXATO", { q: m.query, surface: m.surface })}</li>;
}

/** Cartão de um trecho: citação curta, trecho exato com destaque, pontuação e o porquê. */
export function HitCard({ hit, n }: { hit: ExplainedHit; n: number }) {
  const { t, intl } = useI18n();
  const e = hit.explanation;
  const c = e.components;
  const internal = hit.href && !hit.href.startsWith("/memory");
  return (
    <Card as="li" padding="md" id={hitAnchor(n)} tabIndex={-1} className="grid gap-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]" data-testid="memory-hit" data-doc={hit.docId}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{t("memory.hit.rank", { n })}</Badge>
        <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{hit.title}</span>
        <span className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text-muted" title={t("memory.hit.scoreHint")} data-testid="memory-hit-score">
          {t("memory.hit.score", { score: formatScore(hit.score, intl) })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag>{t(kindKey(hit.kind))}</Tag>
        <Tag>{hit.department ?? t("memory.noDepartment")}</Tag>
        <Tag>{hit.year ?? t("memory.noYear")}</Tag>
        <Tag tone={hit.accessClass === "PUBLICO" ? "success" : hit.accessClass === "INTERNO" ? "info" : "warning"}>{t(accessKey(hit.accessClass))}</Tag>
        <Tag tone={hit.origin === "EXEMPLO" ? "neutral" : hit.origin === "DECIA" ? "accent" : "yellow"}>{t(originKey(hit.origin))}</Tag>
      </div>
      <blockquote className="border-l-[3px] border-ws-accent pl-3 text-[length:var(--ws-text-body)] leading-relaxed text-ws-text" data-testid="memory-hit-passage">
        <PassageText text={hit.passage.text} highlights={e.highlights} />
      </blockquote>
      <p className="text-[length:var(--ws-text-body-sm)]">
        <span className="font-semibold">{t("memory.hit.citation")}:</span> <cite className="not-italic" data-testid="memory-hit-citation">{hit.citation}</cite>
      </p>
      <div className="flex flex-wrap gap-3 text-[length:var(--ws-text-body-sm)]">
        <Link href={readerHref(hit.docId, hit.passage)}>{t("memory.hit.openReader")}</Link>
        {internal ? <Link href={hit.href!}>{t("memory.hit.openSource")}</Link> : null}
      </div>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 px-3 py-2 text-[length:var(--ws-text-body-sm)]">
        <summary className="cursor-pointer font-semibold">{t("memory.hit.why")}</summary>
        <div className="mt-2 grid gap-1.5 text-ws-text-muted">
          <p className="font-semibold text-ws-text">{t("memory.hit.matched")}</p>
          <ul className="list-disc pl-5">{e.matched.map((m, i) => <MatchLine key={i} m={m} />)}</ul>
          {e.unmatched.length ? <p>{t("memory.hit.unmatched", { terms: e.unmatched.join(", ") })}</p> : null}
          <p>{t("memory.hit.coverage", { matched: e.coverage.matched, total: e.coverage.total })}</p>
          <p>{t("memory.hit.components", { w: formatScore(c.cosineWords, intl), c: formatScore(c.cosineChars, intl), b: formatScore(c.bm25Normalized, intl) })}</p>
          <p className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)]">
            {t("memory.hit.formula", { w: formatScore(c.cosineWords, intl), c: formatScore(c.cosineChars, intl), b: formatScore(c.bm25Normalized, intl), score: formatScore(hit.score, intl) })}
          </p>
        </div>
      </details>
    </Card>
  );
}

export function MemoryResults({ query, hits }: { query: string | null; hits: readonly ExplainedHit[] }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="memory-results-title" className="grid gap-3">
      <h2 id="memory-results-title" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("memory.results.title")}</h2>
      <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted" data-testid="memory-results-status">
        {query === null ? t("memory.results.idle") : hits.length ? t("memory.results.count", { n: hits.length, q: query }) : t("memory.results.none", { q: query })}
      </p>
      {query !== null && !hits.length ? <EmptyState compact moji="vazio" title={t("memory.results.none", { q: query })} description={t("memory.results.noneHint")} /> : null}
      {hits.length ? (
        <ol className="grid gap-3" aria-label={t("memory.results.title")}>
          {hits.map((h, i) => <HitCard key={`${h.docId}-${h.passage.start}`} hit={h} n={i + 1} />)}
        </ol>
      ) : null}
    </section>
  );
}
