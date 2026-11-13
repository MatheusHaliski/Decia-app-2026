"use client";
/**
 * Drawings 2D colaborativo (RF66 + RF74, DEMO): prancheta vetorial com camadas e regiões, reservas transacionais com prazo
 * e token entre abas do mesmo navegador (BroadcastChannel), presença de quem colabora, colaboradora simulada e prévia
 * fantasma da IA. Carregado só no navegador (`next/dynamic`). Teclado como alternativa ao mouse: [ ] seleciona,
 * setas movem, R reserva, L libera, G pede sugestões, Enter aceita a sugestão do objeto, Ctrl+Z desfaz.
 */
import { useId, type KeyboardEvent } from "react";
import { Badge, Button, LoadingState, Tag } from "@/components/ui";
import { explainDenial, lockSummary } from "@/lib/drawings2d/explain";
import { DEMO_PIECE_ID } from "@/lib/drawings2d/fixture";
import { pendingItems } from "@/lib/drawings2d/ghost";
import { Canvas2D } from "./Canvas2D";
import { GhostPanel } from "./GhostPanel";
import { Inspector2D } from "./Inspector2D";
import { HistoryPanel, LayersPanel, PeoplePanel, RegionsPanel } from "./Panels";
import { Toolbar2D } from "./Toolbar2D";
import { useEditorModel } from "./useEditorModel";

const isTyping = (target: EventTarget) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

export default function Editor2D({ pieceId = DEMO_PIECE_ID }: { pieceId?: string }) {
  const m = useEditorModel(pieceId);
  const helpId = useId();
  const { t, snap, doc, state, explain } = m;
  if (!snap || !doc || !state || !explain) return <LoadingState label={t("drw2d.loading")} />;

  const pending = pendingItems(m.proposal);
  const ghosts = (m.proposal?.items ?? [])
    .map((item, i) => ({ item, index: i + 1 }))
    .filter(({ item }) => item.status === "PENDENTE")
    .map(({ item, index }) => ({ id: item.suggestion.id, index, shapes: item.suggestion.ghosts }));
  const activeLayer = doc.layers.find((l) => l.id === m.view.activeLayerId);

  /** Enter na prancheta: aceita a sugestão do objeto selecionado, se houver exatamente uma (alvo certo, RF74.CA08). */
  const acceptForSelection = () => {
    const forSel = pending.filter((i) => i.suggestion.scopeIds.some((id) => m.selection.includes(id)));
    if (forSel.length === 1) m.accept([forSel[0]!.suggestion.id]);
    else m.announce(t(forSel.length ? "drw2d.kbd.manySuggestions" : "drw2d.kbd.noSuggestion", { count: forSel.length }));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTyping(e.target)) return;
    const mod = e.ctrlKey || e.metaKey;
    const step = e.altKey ? 1 : e.shiftKey ? doc.grid * 5 : doc.grid;
    const map: Record<string, () => void> = mod
      ? { z: e.shiftKey ? m.redo : m.undo, y: m.redo }
      : {
          arrowleft: () => m.nudge(-step, 0),
          arrowright: () => m.nudge(step, 0),
          arrowup: () => m.nudge(0, -step),
          arrowdown: () => m.nudge(0, step),
          "]": () => m.cycleSelection(1),
          "[": () => m.cycleSelection(-1),
          delete: () => void m.removeSelection(),
          backspace: () => void m.removeSelection(),
          escape: () => {
            m.setSelection([]);
            m.setFocusRegion(null);
          },
          r: m.reserveHere,
          l: m.releaseHere,
          g: m.requestSuggestions,
          enter: acceptForSelection,
        };
    const action = map[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
  };

  return (
    <section aria-label={t("drw2d.title")} className="grid grid-cols-[minmax(0,1fr)] gap-3" data-testid="editor-2d">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-h3)] font-semibold">{doc.title}</h2>
        <Badge tone="warning" title={t("drw2d.demoHint")}>{t("drw2d.demo")}</Badge>
        <span data-testid="drw2d-revision"><Tag>{t("drw2d.revision", { revision: doc.revision })}</Tag></span>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t(snap.transport === "broadcast" ? "drw2d.sync.short" : "drw2d.sync.localShort")}</span>
      </header>
      <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("drw2d.intro")}</p>
      <Toolbar2D m={m} />
      {snap.draft ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-[var(--ws-radius-md)] border border-ws-warning bg-ws-warning-soft p-3 text-[length:var(--ws-text-body-sm)] text-ws-warning-ink" data-testid="draft-banner">
          <span className="min-w-0 flex-1">{t("drw2d.draft.title", { what: m.labelText(snap.draft.label) })} {explainDenial(snap.draft.denial, explain)}</span>
          <Button size="sm" onClick={m.reapplyDraft}>{t("drw2d.draft.reapply")}</Button>
          <Button size="sm" variant="ghost" onClick={m.discardDraft}>{t("drw2d.draft.discard")}</Button>
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-2">
          <div
            tabIndex={0}
            role="application"
            aria-roledescription={t("drw2d.canvasRole")}
            aria-label={t("drw2d.canvasLabel", { title: doc.title, layer: activeLayer?.name ?? "" })}
            aria-describedby={helpId}
            onKeyDown={onKeyDown}
            className="overflow-hidden rounded-[var(--ws-radius-lg)] border border-ws-border bg-ws-surface-2 focus-visible:outline-none focus-visible:[box-shadow:var(--ws-focus-ring)]"
            data-testid="canvas-focus"
          >
            <Canvas2D
              doc={doc}
              view={m.view}
              locks={m.locks}
              participants={state.participants}
              meId={m.meId}
              peers={snap.peers}
              selection={m.selection}
              focusRegion={m.focusRegion}
              showRegions={m.showRegions}
              ghosts={ghosts}
              ghostOpacity={m.ghostOpacity / 100}
              snapToGrid={m.snapToGrid}
              label={t("drw2d.canvasImage", { title: doc.title, count: doc.shapes.length, revision: doc.revision })}
              lockText={(lock) => lockSummary(lock, explain)}
              formatMeters={m.formatMeters}
              onPick={m.pick}
              onPickRegion={m.setFocusRegion}
              onMove={m.move}
              onCursor={m.setCursor}
            />
          </div>
          <p role="status" aria-live="polite" className="min-h-[1.5em] text-[length:var(--ws-text-body-sm)] text-ws-text" data-testid="drw2d-live">{m.announcement}</p>
          <p id={helpId} className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("drw2d.kbd.help")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <LayersPanel m={m} />
            <HistoryPanel m={m} />
          </div>
        </div>
        <aside className="grid content-start gap-3" aria-label={t("drw2d.side")}>
          <PeoplePanel m={m} />
          <RegionsPanel m={m} />
          <Inspector2D m={m} />
          <GhostPanel m={m} />
        </aside>
      </div>
    </section>
  );
}
