"use client";
/**
 * Editor 3D do Drawings (RF60–RF63): viewport com render fisicamente baseado e path tracing, barra, lista de objetos e inspetor.
 * Carregado só no navegador (`next/dynamic` com `ssr: false`) — three.js e o path tracer não entram no bundle das outras páginas.
 */
import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { useToast } from "@/components/ui";
import type { ViewportStats } from "@/lib/drawings3d/engine/Viewport3D";
import type { PrimitiveKind } from "@/lib/drawings3d/model";
import { useEditor3D } from "@/lib/drawings3d/useEditor3D";
import { useI18n } from "@/lib/i18n/useI18n";
import { Inspector3D } from "./Inspector3D";
import { Outliner3D } from "./Outliner3D";
import { Toolbar3D } from "./Toolbar3D";
import { Viewport3DCanvas, type ViewportApi } from "./Viewport3DCanvas";

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

function statusText(t: (k: string, v?: Record<string, string | number>) => string, s: ViewportStats | null): string {
  if (!s || s.mode === "raster") return t("d3.status.raster");
  if (s.mode === "preparing") return t("d3.status.preparing");
  return s.samples >= s.targetSamples ? t("d3.status.done", { samples: s.samples }) : t("d3.status.tracing", { samples: s.samples, target: s.targetSamples });
}

const isTyping = (target: EventTarget) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

export default function Editor3D() {
  const { t } = useI18n();
  const { toast } = useToast();
  const nameOf = useCallback((kind: PrimitiveKind) => t(`d3.kind.${kind}`), [t]);
  const editor = useEditor3D(nameOf);
  const apiRef = useRef<ViewportApi | null>(null);
  const [stats, setStats] = useState<ViewportStats | null>(null);
  const [exporting, setExporting] = useState(false);

  const capture = () => {
    const png = apiRef.current?.capture();
    if (png) download(png, "drawings-3d.png");
  };
  const exportGlb = async () => {
    setExporting(true);
    try {
      const blob = await apiRef.current?.exportGlb();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      download(url, "drawings-3d.glb");
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast({ title: t("d3.exportFail"), tone: "erro" });
    } finally {
      setExporting(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const actions: Record<string, () => void> = {
      ...(mod ? { z: e.shiftKey ? editor.redo : editor.undo, y: editor.redo } : {
        w: () => editor.setGizmoMode("translate"), e: () => editor.setGizmoMode("rotate"), r: () => editor.setGizmoMode("scale"),
        f: () => apiRef.current?.frame(!!editor.selectedId), delete: editor.remove, backspace: editor.remove, escape: () => editor.select(null),
      }),
    };
    const action = actions[key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  return (
    <section aria-label={t("d3.title")} className="grid gap-3" data-testid="editor-3d" onKeyDown={onKeyDown}>
      <Toolbar3D editor={editor} onFrame={() => apiRef.current?.frame(!!editor.selectedId)} onCapture={capture} onExport={exportGlb} exporting={exporting} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-1">
          <div tabIndex={0} aria-label={t("d3.viewportRegion")} className="relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]">
            <Viewport3DCanvas editor={editor} apiRef={apiRef} onStats={setStats} />
            <p className="pointer-events-none absolute bottom-2 left-2 rounded-[var(--ws-radius-sm)] border border-ws-border bg-ws-surface-1/85 px-2 py-1 font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-caption)] text-ws-text" data-testid="d3-status" data-mode={stats?.mode ?? "raster"} data-samples={stats?.samples ?? 0}>
              {statusText(t, stats)}
            </p>
          </div>
          <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("d3.hint")}</p>
        </div>
        <aside className="grid content-start gap-3">
          <Outliner3D editor={editor} />
          <Inspector3D editor={editor} />
        </aside>
      </div>
    </section>
  );
}
