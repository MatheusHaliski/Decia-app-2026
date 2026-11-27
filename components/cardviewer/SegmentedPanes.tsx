"use client";
/**
 * Janelas segmentadas do visualizador (generaliza a `SplitView` da Mesa para 2 ou 3 painéis): cada painel tem a sua janela escolhida
 * num seletor, e os divisores entre eles são arrastáveis e operáveis por teclado (role="separator", ← → com Shift para passos
 * maiores, Home/End). Telas estreitas empilham os painéis (sem divisores). O layout é lembrado por pessoa neste navegador.
 */
import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Select, cn } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { assignWindow, gridColumns, resizeAt, resizeToPoint, separatorValue, STEP, WINDOW_IDS, type ViewerLayout, type WindowId } from "@/lib/cardviewer/layout";

export interface SegmentedPanesProps {
  layout: ViewerLayout;
  onLayout: (next: ViewerLayout, announce?: string) => void;
  render: (win: WindowId, paneIndex: number) => ReactNode;
  /** janelas oferecidas (ex.: sem "Melhorias" quando a IA está desligada continua aparecendo, mas com o aviso) */
  windows?: readonly WindowId[];
}

export function SegmentedPanes({ layout, onLayout, render, windows = WINDOW_IDS }: SegmentedPanesProps) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);

  const onPointerDown = (sep: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    let ratios = layout.ratios;
    const move = (ev: globalThis.PointerEvent) => {
      ratios = resizeToPoint(ratios, sep, (ev.clientX - rect.left) / rect.width);
      onLayout({ ...layout, ratios });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKey = (sep: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? STEP * 2 : STEP;
    let ratios: number[];
    if (e.key === "ArrowLeft") ratios = resizeAt(layout.ratios, sep, -step);
    else if (e.key === "ArrowRight") ratios = resizeAt(layout.ratios, sep, step);
    else if (e.key === "Home") ratios = resizeAt(layout.ratios, sep, -1);
    else if (e.key === "End") ratios = resizeAt(layout.ratios, sep, 1);
    else return;
    e.preventDefault();
    onLayout({ ...layout, ratios }, t("cardviewer.layout.resized", { n: separatorValue(ratios, sep) }));
  };

  const cells: ReactNode[] = [];
  layout.panes.forEach((win, i) => {
    const headingId = `cv-pane-${i}`;
    cells.push(
      <section key={`p${i}`} aria-labelledby={headingId} className="flex min-h-[18rem] min-w-0 flex-col overflow-hidden rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-surface-1 lg:min-h-0" data-pane={i} data-window={win}>
        <header className="flex flex-wrap items-center gap-2 border-b border-ws-border bg-ws-surface-2 px-2 py-1.5">
          <h3 id={headingId} className="min-w-0 flex-1 truncate font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">
            {t(`cardviewer.window.${win}`)}
          </h3>
          <Select
            aria-label={t("cardviewer.layout.choose", { n: i + 1 })}
            value={win}
            className="w-auto min-w-0 max-w-[12rem] py-0.5 text-[length:var(--ws-text-body-sm)]"
            onChange={(e) => {
              const next = e.target.value as WindowId;
              onLayout(assignWindow(layout, i, next), t("cardviewer.layout.assigned", { n: i + 1, window: t(`cardviewer.window.${next}`) }));
            }}
            options={windows.map((w) => ({ value: w, label: t(`cardviewer.window.${w}`) }))}
          />
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-[var(--ws-space-3)]">{render(win, i)}</div>
      </section>,
    );
    if (i < layout.panes.length - 1) {
      cells.push(
        <div
          key={`s${i}`}
          role="separator"
          aria-orientation="vertical"
          aria-label={t("cardviewer.layout.separator", { a: t(`cardviewer.window.${win}`), b: t(`cardviewer.window.${layout.panes[i + 1]}`) })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={separatorValue(layout.ratios, i)}
          tabIndex={0}
          onPointerDown={onPointerDown(i)}
          onKeyDown={onKey(i)}
          className="group hidden cursor-col-resize justify-center outline-none lg:flex"
          data-separator={i}
        >
          <span className="h-full w-1 rounded-[var(--ws-radius-pill)] bg-ws-border transition-colors group-hover:bg-ws-accent group-focus-visible:bg-ws-accent group-focus-visible:[box-shadow:var(--ws-focus-ring)]" />
        </div>,
      );
    }
  });

  return (
    <div
      ref={box}
      className={cn("grid min-h-0 flex-1 gap-[var(--ws-space-3)] lg:gap-0 lg:[grid-template-columns:var(--cv-cols)]")}
      style={{ "--cv-cols": gridColumns(layout.ratios) } as CSSProperties}
      data-testid="segmented-panes"
      data-ratios={layout.ratios.join(",")}
    >
      {cells}
    </div>
  );
}
