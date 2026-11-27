"use client";
/**
 * Visualizador de card (tarefa ou projeto) em modal: Dialog do DS em tela cheia no celular, cabeçalho com a origem dos dados (API ou
 * DEMO), link compartilhável e as janelas segmentadas — Resumo preciso, Atividade, Relações, Arquivos (nuvem e este computador),
 * Prévia do produto e Melhorias ✦. 2 ou 3 painéis, escolha da janela de cada um e proporções lembradas por pessoa neste navegador.
 */
import { useEffect, useState } from "react";
import { Badge, Button, Dialog, useToast } from "@/components/ui";
import { defaultLayout, loadLayout, saveLayout, showWindow, withCount, WINDOW_IDS, type PaneCount, type ViewerLayout, type WindowId } from "@/lib/cardviewer/layout";
import { projectId, projectTitle } from "@/lib/cardviewer/subject";
import { withViewer } from "@/lib/cardviewer/url";
import { useI18n } from "@/lib/i18n/useI18n";
import { ViewerDataProvider, type ViewerContextValue } from "./context";
import { closeCardViewer } from "./open";
import { SegmentedPanes } from "./SegmentedPanes";
import { ActivityWindow } from "./windows/ActivityWindow";
import { FilesWindow } from "./windows/FilesWindow";
import { ImprovementsWindow } from "./windows/ImprovementsWindow";
import { PreviewWindow } from "./windows/PreviewWindow";
import { RelationsWindow } from "./windows/RelationsWindow";
import { SummaryWindow } from "./windows/SummaryWindow";

function WindowBody({ win }: { win: WindowId }) {
  switch (win) {
    case "resumo": return <SummaryWindow />;
    case "atividade": return <ActivityWindow />;
    case "relacoes": return <RelationsWindow />;
    case "arquivos": return <FilesWindow />;
    case "previa": return <PreviewWindow />;
    case "melhorias": return <ImprovementsWindow />;
  }
}

export function CardViewer({ value }: { value: ViewerContextValue }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { target, account } = value;
  const [layout, setLayout] = useState<ViewerLayout>(() => (typeof window === "undefined" ? defaultLayout() : loadLayout(account, target.kind)));
  const [announce, setAnnounce] = useState("");
  useEffect(() => saveLayout(account, target.kind, layout), [account, target.kind, layout]);

  const update = (next: ViewerLayout, msg?: string) => {
    setLayout(next);
    if (msg) setAnnounce(msg);
  };
  const setCount = (n: PaneCount) => update(withCount(layout, n), t("cardviewer.layout.count", { n }));
  /** aba de janela: a que já está num painel ganha o foco; a outra entra no último painel (Melhorias sempre a um clique) */
  const openWindow = (w: WindowId) => {
    const at = layout.panes.indexOf(w);
    if (at >= 0) {
      document.querySelector<HTMLElement>(`[data-testid="segmented-panes"] [data-window="${w}"]`)?.focus();
      return;
    }
    const next = showWindow(layout, w);
    update(next, t("cardviewer.layout.assigned", { n: next.panes.indexOf(w) + 1, window: t(`cardviewer.window.${w}`) }));
  };

  const title = value.task ? value.task.subject.title : value.project ? projectTitle(value.project.subject) : "";
  const source = value.task ? value.task.subject.source : "DEMO";
  const pageHref = value.task
    ? `/tasks/${value.task.subject.id}`
    : value.project?.subject.variant === "MESA" ? `/projects/${projectId(value.project.subject)}/edit` : `/projects/${target.id}`;

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${withViewer(window.location.search, target)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("cardviewer.linkCopied"), tone: "sucesso" });
    } catch {
      toast({ title: t("cardviewer.linkCopyFailed"), description: url, tone: "erro" });
    }
  };

  return (
    <Dialog
      open
      size="full"
      onOpenChange={(o) => { if (!o) closeCardViewer(target); }}
      title={title}
      description={t(`cardviewer.description.${target.kind}`)}
    >
      <ViewerDataProvider value={value}>
        <div className="flex min-h-0 flex-1 flex-col gap-[var(--ws-space-3)]" data-testid="card-viewer" data-kind={target.kind} data-source={source}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={source === "API" ? "info" : "warning"}>{source === "API" ? t("cardviewer.source.API") : t("cardviewer.source.DEMO")}</Badge>
            <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(`cardviewer.kind.${target.kind}`)}</span>
            <span className="flex-1" />
            <div role="group" aria-label={t("cardviewer.layout.panes")} className="flex items-center gap-1">
              {([2, 3] as const).map((n) => (
                <Button key={n} size="sm" variant={layout.count === n ? "default" : "ghost"} aria-pressed={layout.count === n} onClick={() => setCount(n)}>
                  {t("cardviewer.layout.nPanes", { n })}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => update(defaultLayout(layout.count), t("cardviewer.layout.reset"))}>{t("cardviewer.layout.reset")}</Button>
            </div>
            <Button size="sm" variant="ghost" onClick={copyLink}>{t("cardviewer.copyLink")}</Button>
            <Button size="sm" href={pageHref}>{t("cardviewer.openPage")}</Button>
          </div>
          <div role="group" aria-label={t("criador2.viewer.windows")} className="flex flex-wrap items-center gap-1 border-b border-ws-border pb-2" data-testid="viewer-window-tabs">
            {WINDOW_IDS.map((w) => {
              const shown = layout.panes.includes(w);
              return (
                <Button key={w} size="sm" variant={shown ? "default" : "ghost"} aria-pressed={shown} data-window-tab={w} onClick={() => openWindow(w)}
                  className={w === "melhorias" ? "text-ws-ai-spark-ink" : undefined}>
                  {t(`cardviewer.window.${w}`)}
                </Button>
              );
            })}
          </div>
          <p aria-live="polite" className="sr-only" data-testid="viewer-live">{announce}</p>
          <SegmentedPanes layout={layout} onLayout={update} render={(win) => <WindowBody win={win} />} />
        </div>
      </ViewerDataProvider>
    </Dialog>
  );
}
