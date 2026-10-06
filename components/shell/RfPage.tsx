"use client";
import type { ReactNode } from "react";
import { Badge, Card, EmptyState, ErrorState, Link, Tabs, cn, type TabItem } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { visibleTabs, type SubTab } from "@/lib/nav/matrix";
import type { PageEntry } from "@/lib/pages/registry";
import { RF_CATALOG, type RfEntry } from "@/lib/rf/catalog.gen";
import { useViewer } from "@/lib/viewer/ViewerProvider";
import { PageHeader } from "./PageHeader";
import { ViewerProfileSelect } from "./UserPanel";

/**
 * Página-esqueleto de um RF (etapa (b), ARQUITETURA §6): PageHeader com título da aba e chips do RF, bloco "O que esta
 * aba vai fazer" com a história e os CAs copiados do README (lib/rf/catalog.gen.ts), sub-abas da matriz e EmptyState com
 * WS Moji. Quando a matriz marca O (oculta) para o perfil de visualização, mostra o 403 ACESSO_NEGADO simulado.
 */
export interface RfPageProps {
  page: PageEntry;
  /** complemento do título (ex.: slug da empresa) */
  subtitle?: ReactNode;
  /** sub-abas (padrão: as do registro) */
  tabs?: readonly SubTab[];
  /** rótulo alternativo da sub-aba (ex.: EMPRESA renomeia abas do perfil) */
  tabLabel?: (tab: SubTab) => string;
  /** conteúdo específico de uma sub-aba (padrão: EmptyState) */
  renderTab?: (slug: string) => ReactNode;
  /** conteúdo acima do bloco de CAs (ex.: as preferências reais em /settings) */
  children?: ReactNode;
  /** esconde o bloco de CAs (quando a página já é funcional) */
  hideCas?: boolean;
  actions?: ReactNode;
  emptyTitleKey?: string;
}

export const rfById = (id: string): RfEntry | undefined => RF_CATALOG.find((r) => r.id === id);

export function RfBlock({ rf, open = false }: { rf: RfEntry; open?: boolean }) {
  const { t } = useI18n();
  return (
    <details open={open} className="group rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-[length:var(--ws-text-body-sm)] font-semibold marker:content-none focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)] rounded-[var(--ws-radius-md)]">
        <Badge tone="accent">{rf.id}</Badge>
        <span className="min-w-0 flex-1">{rf.title}</span>
        <span className="text-ws-text-muted transition-transform group-open:rotate-180" aria-hidden>⌄</span>
      </summary>
      <div className="grid gap-3 border-t border-ws-border p-3 text-[length:var(--ws-text-body-sm)]">
        {rf.hu ? <p><span className="font-semibold">{t("rf.story")}:</span> {rf.hu}</p> : null}
        {!rf.hu && rf.summary ? <p className="text-ws-text-muted">{rf.summary}</p> : null}
        {rf.route ? <p className="text-ws-text-muted"><span className="font-semibold text-ws-text">{t("rf.route")}:</span> {rf.route}</p> : null}
        {rf.coverage ? <p className="text-ws-text-muted"><span className="font-semibold text-ws-text">{t("rf.coverage")}:</span> {rf.coverage}</p> : null}
        {rf.cas.length ? (
          <ol className="grid gap-1.5" aria-label={t("rf.cas")}>
            {rf.cas.map((ca) => (
              <li key={ca.id} className="grid grid-cols-[auto_1fr] gap-2">
                <Badge tone={ca.kind === "enunciado" ? "info" : "neutral"} title={ca.kind === "enunciado" ? t("rf.kindEnunciado") : t("rf.kindRastreabilidade")} className="h-fit normal-case tracking-normal">{ca.id.replace(/^RF\d+\./, "")}</Badge>
                <span className="leading-snug">
                  {ca.text}
                  {ca.note ? <span className="text-ws-text-muted"> ({ca.note})</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-ws-text-muted">{t("rf.noCas")}</p>
        )}
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {t("rf.source")}: <Link href={`https://github.com/MatheusHaliski/Decia-app-2026/blob/main/docs/diagramas/${rf.id}/README.md`}>docs/diagramas/{rf.id}/README.md</Link>
        </p>
      </div>
    </details>
  );
}

export function RfPage({ page, subtitle, tabs, tabLabel, renderTab, children, hideCas, actions, emptyTitleKey }: RfPageProps) {
  const { t } = useI18n();
  const { profile } = useViewer();
  const cell = page.access[profile];
  const title = subtitle ? <>{t(page.titleKey)} <span className="text-ws-text-muted">· {subtitle}</span></> : t(page.titleKey);
  const rfs = page.rfs.map(rfById).filter((r): r is RfEntry => !!r);
  const tabSource = tabs ?? page.tabs;
  const tabItems: TabItem[] | null = tabSource
    ? visibleTabs(tabSource, profile).map((tb) => ({ slug: tb.slug, label: tabLabel ? tabLabel(tb) : t(tb.labelKey), proposal: tb.proposal }))
    : null;

  if (cell === "O") {
    return (
      <div className="grid gap-[var(--ws-space-4)]">
        <PageHeader title={title} glyph={page.glyph} rfs={page.rfs} proposal={page.note === "proposal"} />
        <ErrorState
          title={t("forbidden.title")}
          description={t("forbidden.description", { profile: t(`profile.${profile}`) })}
          code="403 ACESSO_NEGADO"
          action={<div className="flex items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("viewer.switchHint")} <ViewerProfileSelect /></div>}
        />
        {!hideCas && rfs.length ? <section aria-labelledby="rf-block" className="grid gap-2"><h2 id="rf-block" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("rf.whatThisTabDoes")}</h2>{rfs.map((rf) => <RfBlock key={rf.id} rf={rf} />)}</section> : null}
      </div>
    );
  }

  const accessBadge = (
    <Badge tone={cell === "E" ? "success" : "info"} title={t("access.hint")}>{t(`access.${cell}`, { profile: t(`profile.${profile}`) })}</Badge>
  );

  return (
    <div className="grid gap-[var(--ws-space-5)]">
      <PageHeader
        title={title}
        glyph={page.glyph}
        rfs={page.rfs}
        proposal={page.note === "proposal"}
        description={page.note === "sessionCards" ? t("rf.sessionCardsNote") : rfs[0]?.title}
        actions={<>{accessBadge}{actions}</>}
      />
      {children}
      {tabItems ? (
        <Tabs tabs={tabItems} label={t("a11y.subTabs")} param={page.tabParam ?? "tab"}>
          {(active) => renderTab?.(active) ?? (
            <EmptyState
              moji={page.moji ?? "vazio"}
              title={t(emptyTitleKey ?? "rf.emptyTitle", { tab: String(tabItems.find((x) => x.slug === active)?.label ?? active) })}
              description={t("rf.emptyDescription")}
            />
          )}
        </Tabs>
      ) : (
        <EmptyState moji={page.moji ?? "vazio"} title={t(emptyTitleKey ?? "rf.emptyTitleNoTab")} description={t("rf.emptyDescription")} />
      )}
      {!hideCas && rfs.length ? (
        <section aria-labelledby="rf-block" className="grid gap-2">
          <h2 id="rf-block" className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{t("rf.whatThisTabDoes")}</h2>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("rf.ptBrNote")}</p>
          <div className={cn("grid gap-2")}>{rfs.map((rf, i) => <RfBlock key={rf.id} rf={rf} open={i === 0} />)}</div>
        </section>
      ) : null}
      <Card tone="soft" padding="sm" className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
        {t("rf.matrixNote", { matrix: page.matrix, route: page.route, file: page.file })}
      </Card>
    </div>
  );
}
