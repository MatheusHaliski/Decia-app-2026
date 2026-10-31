"use client";
/**
 * Canvas da viewport 3D: cria a fachada `Viewport3D` uma vez, repassa a ela as mudanças do editor (cena, seleção, ferramenta,
 * qualidade) e expõe captura/exportação/enquadramento por `apiRef`. Sem WebGL 2 mostra o motivo em vez de uma tela preta.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import { EmptyState } from "@/components/ui";
import { Viewport3D, type ViewportStats } from "@/lib/drawings3d/engine/Viewport3D";
import type { Editor3D } from "@/lib/drawings3d/useEditor3D";
import { useI18n } from "@/lib/i18n/useI18n";

export interface ViewportApi {
  capture(): string | null;
  exportGlb(): Promise<Blob | null>;
  frame(onlySelected?: boolean): void;
}

function supportsWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function Viewport3DCanvas({ editor, apiRef, onStats }: { editor: Editor3D; apiRef: RefObject<ViewportApi | null>; onStats: (s: ViewportStats) => void }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport3D | null>(null);
  const [failed, setFailed] = useState(false);
  const { scene, selectedId, gizmoMode, quality, select, setTransform } = editor;
  const handlers = useRef({ select, setTransform, onStats });
  useEffect(() => {
    handlers.current = { select, setTransform, onStats };
  }, [select, setTransform, onStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!supportsWebGL2()) {
      setFailed(true);
      return;
    }
    let viewport: Viewport3D;
    try {
      viewport = new Viewport3D(canvas, {
        onSelect: (id) => handlers.current.select(id),
        onTransformCommit: (id, tr) => handlers.current.setTransform(id, tr),
        onStats: (s) => handlers.current.onStats(s),
      });
    } catch {
      setFailed(true);
      return;
    }
    viewportRef.current = viewport;
    apiRef.current = {
      capture: () => viewport.capture(),
      exportGlb: () => viewport.exportGlb(),
      frame: (only) => viewport.frame(only),
    };
    const observer = new ResizeObserver(([entry]) => {
      if (entry) viewport.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      apiRef.current = null;
      viewportRef.current = null;
      viewport.dispose();
    };
  }, [apiRef]);

  useEffect(() => viewportRef.current?.setScene(scene), [scene]);
  useEffect(() => viewportRef.current?.setSelection(selectedId), [selectedId, scene]);
  useEffect(() => viewportRef.current?.setGizmoMode(gizmoMode), [gizmoMode]);
  useEffect(() => viewportRef.current?.setQuality(quality), [quality]);

  if (failed) {
    return <EmptyState moji="vazio" title={t("d3.noWebgl.title")} description={t("d3.noWebgl.hint")} />;
  }
  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none select-none outline-none"
      aria-label={t("d3.canvasLabel")}
      role="img"
      data-testid="viewport-3d"
    />
  );
}
