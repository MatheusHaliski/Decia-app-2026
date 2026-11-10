"use client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Badge, Card, EmptyState, Field, Input, Link, Tabs, Tag, type Tone } from "@/components/ui";
import { ECOSYSTEMS, SOURCE_ITEMS, ecosystemInfo, filterItems, itemsByEcosystem, type Ecosystem, type LinkableLevel, type SourceItem } from "@/lib/connectors/catalog";
import { useConnectorLabels } from "./labels";

const LINKABLE_TONE: Record<LinkableLevel, Tone> = { SIM: "success", PARCIAL: "warning", NAO: "neutral" };
const CAPTION = "text-[length:var(--ws-text-caption)]";

/**
 * Catálogo de fontes por ecossistema (contracts/connectors/sources.json): para cada aplicativo, o que vira — tipo de tarefa,
 * formatos, se dá para manter vínculo e por onde chega hoje (conta conectada, link ou planejado). Os detalhes técnicos da pesquisa
 * (MIME, API, escopos, observações) ficam recolhidos e em português, como foram levantados.
 */
export function SourceCatalog() {
  const L = useConnectorLabels();
  const { t } = L;
  const [eco, setEco] = useState<Ecosystem>("google");
  const [query, setQuery] = useState("");
  const all = useMemo(() => itemsByEcosystem(eco), [eco]);
  const labels = useCallback((it: SourceItem) => [L.kind(it.sourceKind), L.type(it.taskType)], [L]);
  const items = useMemo(() => filterItems(all, query, labels), [all, query, labels]);
  return (
    <Card as="section" title={t("connectors.catalog.title")} eyebrow={t("connectors.catalog.eyebrow", { count: SOURCE_ITEMS.length })} data-testid="source-catalog">
      <div className="grid grid-cols-1 gap-[var(--ws-space-3)]">
        <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("connectors.catalog.intro")}</p>
        <Field label={t("connectors.catalog.filter")}>
          {({ id }) => <Input id={id} type="search" leading="buscar" value={query} maxLength={80} onChange={(e) => setQuery(e.target.value)} data-testid="catalog-filter" />}
        </Field>
        <Tabs
          tabs={ECOSYSTEMS.map((e) => ({ slug: e, label: t(`connectors.ecosystem.${e}`), badge: <Badge>{itemsByEcosystem(e).length}</Badge> }))}
          param={null}
          value={eco}
          onChange={(s) => setEco(s as Ecosystem)}
          label={t("connectors.catalog.ecosystems")}
          look="pills"
        >
          {() => (
            <div className="grid grid-cols-1 gap-[var(--ws-space-3)]">
              <p className={`${CAPTION} text-ws-text-muted`} aria-live="polite" data-testid="catalog-count">{t("connectors.catalog.count", { shown: items.length, total: all.length })}</p>
              {items.length ? (
                <ul className="grid grid-cols-1 gap-2" aria-label={t("connectors.catalog.listLabel", { ecosystem: t(`connectors.ecosystem.${eco}`) })}>
                  {items.map((it) => <CatalogItem key={it.id} item={it} />)}
                </ul>
              ) : (
                <EmptyState compact moji="vazio" title={t("connectors.catalog.empty")} />
              )}
              <EcosystemFootnotes eco={eco} />
            </div>
          )}
        </Tabs>
      </div>
    </Card>
  );
}

function CatalogItem({ item }: { item: SourceItem }) {
  const L = useConnectorLabels();
  const { t } = L;
  return (
    <li data-testid="catalog-item" data-source-kind={item.sourceKind}>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
        <summary className="grid grid-cols-1 cursor-pointer list-none gap-1.5 rounded-[var(--ws-radius-md)] p-3 marker:content-none hover:bg-ws-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-semibold">{item.app}</span>
            <span className={`${CAPTION} text-ws-text-muted`}>{L.kind(item.sourceKind)} · <span className="font-[family-name:var(--ws-font-mono)]">{item.sourceKind}</span></span>
          </span>
          <span className={`flex flex-wrap items-center gap-1.5 ${CAPTION}`}>
            <span className="text-ws-text-muted">{t("connectors.catalog.becomes")}</span>
            <Tag tone="accent">{L.type(item.taskType)}</Tag>
            <Badge tone={LINKABLE_TONE[item.linkable]} title={t("connectors.catalog.linkableHint")}>{t(`connectors.linkable.${item.linkable}`)}</Badge>
            {item.via.length
              ? item.via.map((v) => <Badge key={v} tone={v === "CONTA" ? "info" : "accent"} title={t(`connectors.via.${v}Hint`)}>{t(`connectors.via.${v}`)}</Badge>)
              : <Badge tone="neutral" title={t("connectors.via.PLANEJADOHint")}>{t("connectors.via.PLANEJADO")}</Badge>}
          </span>
          <span className={`${CAPTION} text-ws-text-muted`}>
            {t("connectors.catalog.formats")} <span className="font-[family-name:var(--ws-font-mono)]">{item.formats.length ? item.formats.join(" · ") : "—"}</span>
          </span>
        </summary>
        <dl className={`grid grid-cols-1 gap-2 border-t border-ws-border p-3 ${CAPTION} [overflow-wrap:anywhere]`}>
          <Detail term={t("connectors.catalog.artifact")}>{item.artifact}</Detail>
          <Detail term={t("connectors.catalog.mime")} mono>{[...item.nativeMime, ...item.extensions].join(" · ") || "—"}</Detail>
          <Detail term={t("connectors.catalog.exports")}>{item.exportFormats.join(" · ") || "—"}</Detail>
          <Detail term={t("connectors.catalog.api")}>{item.api}</Detail>
          <Detail term={t("connectors.catalog.scopes")} mono>{item.scopes.join(" · ") || t("connectors.catalog.noScopes")}</Detail>
          <Detail term={t("connectors.catalog.linkableHow")}>{item.linkableHow}</Detail>
          <Detail term={t("connectors.catalog.notes")}>{item.notes}</Detail>
          <p className="text-ws-text-muted">{t("connectors.catalog.ptBrNote")}</p>
        </dl>
      </details>
    </li>
  );
}

function Detail({ term, children, mono }: { term: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-0.5">
      <dt className="font-semibold text-ws-text">{term}</dt>
      <dd className={mono ? "font-[family-name:var(--ws-font-mono)] text-ws-text-muted" : "text-ws-text-muted"}>{children}</dd>
    </div>
  );
}

/** Fontes primárias e o que a pesquisa não conseguiu conferir — transparência sobre o próprio levantamento. */
function EcosystemFootnotes({ eco }: { eco: Ecosystem }) {
  const { t } = useConnectorLabels();
  const info = ecosystemInfo(eco);
  if (!info) return null;
  return (
    <div className={`grid grid-cols-1 gap-2 ${CAPTION}`}>
      <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2">
        <summary className="cursor-pointer font-semibold">{t("connectors.catalog.sources", { count: info.sources.length, date: info.generatedAt })}</summary>
        <ul className="mt-2 grid gap-1 [overflow-wrap:anywhere]">
          {info.sources.map((s) => (
            <li key={s.url + s.title}><Link href={s.url}>{s.title}</Link></li>
          ))}
        </ul>
      </details>
      {info.naoConferido.length ? (
        <details className="rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-2 p-2">
          <summary className="cursor-pointer font-semibold">{t("connectors.catalog.unverified", { count: info.naoConferido.length })}</summary>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-ws-text-muted">
            {info.naoConferido.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
