"use client";
/**
 * Janela "Prévia do produto": a entrega compilada, do jeito mais seguro (regras em `lib/cardviewer/preview.ts`).
 *  • Imagem (png, jpg, webp, gif) e SVG: `<img>` a partir do conteúdo autenticado (`/api/tasks/{id}/attachments/{id}/content`) num
 *    object URL — SVG nunca entra inline no DOM, então não roda script; zoom: ajustar, 100 %, − e +.
 *  • Página web anexada: iframe isolado com `sandbox` SEM scripts; botão explícito liga só `allow-scripts` (nunca
 *    `allow-same-origin`, então a página continua sem acesso ao app) e só para conteúdo da própria nuvem.
 *  • Link https da tarefa: iframe com `sandbox` vazio e `referrerpolicy=no-referrer`, aviso de site externo e "abrir em nova aba".
 *  • Planilha .xlsx: fotografia do topo (primeiras 20 linhas × 10 colunas, valores em cache, nada executado); .xlsm recusada.
 *  • Outros: metadados e abrir/baixar.
 * Sem API de arquivos (laboratório, projetos), exemplos DEMO marcados.
 */
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState, ErrorState, Field, Link, LoadingState, Select, useToast } from "@/components/ui";
import { describeError } from "@/lib/api/client";
import { demoCandidates } from "@/lib/cardviewer/demo";
import { isHttpsUrl } from "@/lib/cardviewer/files";
import { iframeSandbox, previewCandidates, stepZoom, type PreviewCandidate, type Zoom } from "@/lib/cardviewer/preview";
import { projectTitle } from "@/lib/cardviewer/subject";
import { readXlsxTop, XlsxError, type XlsxSnapshot } from "@/lib/cardviewer/xlsx";
import { useI18n } from "@/lib/i18n/useI18n";
import { attachmentsApi } from "@/lib/tasks/client";
import { formatBytes, formatDateTime, isBlob, openOrDownload } from "@/lib/tasks/files";
import { useViewerData } from "../context";
import { XlsxTable } from "./XlsxTable";

type Loaded = { status: "idle" } | { status: "loading" } | { status: "error"; text: string } | { status: "ok"; blob: Blob; url: string | null };

export function PreviewWindow() {
  const { t } = useI18n();
  const { task, project } = useViewerData();

  const candidates = useMemo<PreviewCandidate[]>(() => {
    if (task?.view) {
      const s = task.subject;
      const links = [...s.references, ...(isHttpsUrl(s.sourceRef) ? [{ label: s.sourceRef, url: s.sourceRef }] : [])];
      return previewCandidates(task.files.attachments, links);
    }
    const title = task ? task.subject.title : project ? projectTitle(project.subject) : "";
    return demoCandidates(title);
  }, [task, project]);

  const [chosen, setChosen] = useState<string>("");
  const current = candidates.find((c) => c.id === chosen) ?? candidates[0];

  if (task?.view && task.files.status === "loading") return <LoadingState label={t("cardviewer.files.loading")} />;
  if (task?.view && task.files.status === "error") return <ErrorState title={t("cardviewer.files.loadError")} description={task.files.error} onRetry={task.files.reload} />;
  if (!current) return <div data-testid="window-previa"><EmptyState compact title={t("cardviewer.preview.none")} description={t("cardviewer.preview.noneHint")} /></div>;

  return (
    <div className="grid gap-3" data-testid="window-previa">
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t("cardviewer.preview.choose")} className="min-w-0 flex-1">
          {({ id }) => (
            <Select id={id} value={current.id} onChange={(e) => setChosen(e.target.value)}
              options={candidates.map((c) => ({ value: c.id, label: `${c.name} · ${t(`cardviewer.preview.kind.${c.kind}`)}` }))} />
          )}
        </Field>
        {current.source === "DEMO" ? <Badge tone="warning">DEMO</Badge> : null}
      </div>
      <PreviewBody key={current.id} c={current} />
    </div>
  );
}

function useBlob(c: PreviewCandidate, taskId: string | undefined): Loaded {
  const [state, setState] = useState<Loaded>({ status: "idle" });
  useEffect(() => {
    if (c.kind === "URL" || c.kind === "MACRO") return;
    let alive = true;
    let url: string | null = null;
    setState({ status: "loading" });
    const load = c.demo ? c.demo() : taskId && c.attachmentId ? attachmentsApi.content(taskId, c.attachmentId) : Promise.reject(new Error("sem conteúdo"));
    load.then((b) => {
      if (!alive) return;
      if (!isBlob(b)) throw new Error("conteúdo inválido");
      // tipo do object URL vem da decisão de prévia, nunca do servidor: SVG como imagem, HTML como página isolada
      const typed = c.kind === "SVG" ? new Blob([b], { type: "image/svg+xml" }) : c.kind === "HTML" ? new Blob([b], { type: "text/html" }) : b;
      url = c.kind === "XLSX" || c.kind === "OUTRO" || typeof URL.createObjectURL !== "function" ? null : URL.createObjectURL(typed);
      setState({ status: "ok", blob: typed, url });
    }).catch((e) => { if (alive) setState({ status: "error", text: describeError(e) }); });
    return () => {
      alive = false;
      if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
    };
  }, [c, taskId]);
  return state;
}

function PreviewBody({ c }: { c: PreviewCandidate }) {
  const { t, intl } = useI18n();
  const { task } = useViewerData();
  const loaded = useBlob(c, task?.subject.id);
  const meta = (
    <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
      {[c.mime, c.size !== undefined ? formatBytes(c.size, intl) : null, c.date ? formatDateTime(c.date, intl) : null].filter(Boolean).join(" · ")}
    </p>
  );

  if (c.kind === "MACRO") return <div className="grid gap-2" data-preview="MACRO"><ErrorState title={t("cardviewer.xlsx.refused")} description={t("cardviewer.xlsx.reason.MACRO")} />{meta}</div>;
  if (c.kind === "URL") return <ExternalPage c={c} />;
  if (loaded.status === "loading" || loaded.status === "idle") return <LoadingState label={t("cardviewer.preview.loading")} />;
  if (loaded.status === "error") return <ErrorState title={t("cardviewer.preview.error")} description={loaded.text} />;
  if (c.kind === "IMAGEM" || c.kind === "SVG") return <ImageView c={c} url={loaded.url} meta={meta} />;
  if (c.kind === "HTML") return <CloudPage c={c} url={loaded.url} meta={meta} />;
  if (c.kind === "XLSX") return <XlsxView blob={loaded.blob} meta={meta} />;
  return (
    <div className="grid gap-2" data-preview="OUTRO">
      <p className="text-[length:var(--ws-text-body-sm)]">{t("cardviewer.preview.other", { name: c.name })}</p>
      {meta}
      <div><Button size="sm" onClick={() => openOrDownload(loaded.blob, c.name, false)}>{t("cardviewer.files.download")}</Button></div>
    </div>
  );
}

function ImageView({ c, url, meta }: { c: PreviewCandidate; url: string | null; meta: React.ReactNode }) {
  const { t, intl } = useI18n();
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const pct = (z: number) => new Intl.NumberFormat(intl, { style: "percent" }).format(z);
  const style = zoom === "fit" || !natural ? undefined : { width: `${Math.round(natural.w * zoom)}px`, maxWidth: "none" };
  return (
    <div className="grid gap-2" data-preview={c.kind}>
      <div role="toolbar" aria-label={t("cardviewer.preview.zoomTools")} className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant={zoom === "fit" ? "default" : "ghost"} aria-pressed={zoom === "fit"} onClick={() => setZoom("fit")}>{t("cardviewer.preview.fit")}</Button>
        <Button size="sm" variant={zoom === 1 ? "default" : "ghost"} aria-pressed={zoom === 1} onClick={() => setZoom(1)}>{t("cardviewer.preview.actual")}</Button>
        <Button size="sm" variant="ghost" aria-label={t("cardviewer.preview.zoomOut")} onClick={() => setZoom((z) => stepZoom(z, -1))}>−</Button>
        <Button size="sm" variant="ghost" aria-label={t("cardviewer.preview.zoomIn")} onClick={() => setZoom((z) => stepZoom(z, 1))}>+</Button>
        <span aria-live="polite" className="text-[length:var(--ws-text-caption)] text-ws-text-muted" data-testid="zoom-level">{zoom === "fit" ? t("cardviewer.preview.fitted") : pct(zoom)}</span>
      </div>
      <div className="max-h-[60dvh] overflow-auto rounded-[var(--ws-radius-sm)] border border-ws-border bg-ws-surface-2 p-2 text-ws-text">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL (blob:) do conteúdo autenticado; next/image não serve blob
          <img src={url} alt={t("cardviewer.preview.imageAlt", { name: c.name })} style={style}
            className={zoom === "fit" ? "mx-auto block max-h-[56dvh] max-w-full object-contain" : "block"}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        ) : <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("cardviewer.preview.error")}</p>}
      </div>
      {c.kind === "SVG" ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.preview.svgSafe")}</p> : null}
      {natural ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("cardviewer.preview.dimensions", { w: natural.w, h: natural.h })}</p> : null}
      {meta}
    </div>
  );
}

function CloudPage({ c, url, meta }: { c: PreviewCandidate; url: string | null; meta: React.ReactNode }) {
  const { t } = useI18n();
  const [scripts, setScripts] = useState(false);
  return (
    <div className="grid gap-2" data-preview="HTML">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={scripts ? "danger" : "default"} aria-pressed={scripts} onClick={() => setScripts((v) => !v)}>
          {scripts ? t("cardviewer.preview.blockScripts") : t("cardviewer.preview.allowScripts")}
        </Button>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted" aria-live="polite">{scripts ? t("cardviewer.preview.scriptsOn") : t("cardviewer.preview.scriptsOff")}</span>
      </div>
      {url ? (
        <iframe key={String(scripts)} src={url} title={t("cardviewer.preview.pageTitle", { name: c.name })} sandbox={iframeSandbox(c.source, scripts)} referrerPolicy="no-referrer"
          className="h-[60dvh] w-full rounded-[var(--ws-radius-sm)] border border-ws-border bg-ws-surface-0" data-testid="preview-iframe" />
      ) : null}
      {meta}
    </div>
  );
}

function ExternalPage({ c }: { c: PreviewCandidate }) {
  const { t } = useI18n();
  const host = (() => {
    try {
      return new URL(c.url!).hostname;
    } catch {
      return c.url ?? "";
    }
  })();
  return (
    <div className="grid gap-2" data-preview="URL">
      <p role="note" className="rounded-[var(--ws-radius-sm)] bg-ws-warning-soft px-2 py-1 text-[length:var(--ws-text-caption)]"><span aria-hidden>! </span>{t("cardviewer.preview.external", { host })}</p>
      <iframe src={c.url} title={t("cardviewer.preview.pageTitle", { name: c.name })} sandbox={iframeSandbox("LINK", false)} referrerPolicy="no-referrer"
        className="h-[60dvh] w-full rounded-[var(--ws-radius-sm)] border border-ws-border bg-ws-surface-0" data-testid="preview-iframe" />
      <div><Link href={c.url!}>{t("cardviewer.preview.openTab")}</Link></div>
    </div>
  );
}

function XlsxView({ blob, meta }: { blob: Blob; meta: React.ReactNode }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState<{ snap?: XlsxSnapshot; error?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const buf = typeof blob.arrayBuffer === "function" ? blob.arrayBuffer() : new Response(blob).arrayBuffer();
    buf.then((b) => readXlsxTop(new Uint8Array(b)))
      .then((snap) => { if (alive) setState({ snap }); })
      .catch((e) => { if (alive) setState({ error: e instanceof XlsxError ? e.code : "ZIP_INVALIDO" }); });
    return () => { alive = false; };
  }, [blob, toast]);
  if (!state) return <LoadingState label={t("cardviewer.xlsx.reading")} />;
  if (state.error) return <div className="grid gap-2" data-preview="XLSX"><ErrorState title={t("cardviewer.xlsx.refused")} description={t(`cardviewer.xlsx.reason.${state.error}`)} />{meta}</div>;
  return <div className="grid gap-2" data-preview="XLSX"><XlsxTable snap={state.snap!} />{meta}</div>;
}
