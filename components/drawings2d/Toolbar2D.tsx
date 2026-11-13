"use client";
/**
 * Barra do editor 2D: inserir forma (por botão, alternativa ao desenho por arraste), excluir, desfazer/refazer, mostrar
 * divisórias e rótulos (preferência da pessoa — não libera reserva, RF65.CA05), encaixe na grade ao mover, "Capturar PNG"
 * com fundo e escala (RF74) e restaurar o exemplo da demonstração.
 */
import { useState } from "react";
import { Button, Select } from "@/components/ui";
import { EXPORT_SCALES } from "@/lib/drawings2d/export";
import { SHAPE_KINDS, type ShapeKind } from "@/lib/drawings2d/model";
import type { CaptureBackground } from "./capture";
import type { EditorModel } from "./useEditorModel";

export function Toolbar2D({ m }: { m: EditorModel }) {
  const { t, snap } = m;
  const [background, setBackground] = useState<CaptureBackground>("tema");
  const [scale, setScale] = useState<number>(2);
  if (!snap) return null;
  return (
    <div className="grid gap-2">
      <div role="toolbar" aria-label={t("drw2d.toolbar")} className="flex flex-wrap items-center gap-2" data-testid="toolbar-2d">
        <div className="w-44">
          <Select
            aria-label={t("drw2d.insert")}
            value=""
            data-testid="drw2d-insert"
            onChange={(e) => e.target.value && void m.insert(e.target.value as ShapeKind)}
            options={[{ value: "", label: t("drw2d.insert") }, ...SHAPE_KINDS.map((k) => ({ value: k, label: t(`drw2d.kind.${k}`) }))]}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => void m.removeSelection()} disabled={!m.selection.length} data-testid="drw2d-remove">{t("drw2d.remove")}</Button>
        <Button size="sm" variant="ghost" onClick={m.undo} disabled={!snap.canUndo} title={snap.undoLabel ? t("drw2d.undoWhat", { what: m.labelText(snap.undoLabel) }) : undefined} data-testid="drw2d-undo">{t("drw2d.undo")}</Button>
        <Button size="sm" variant="ghost" onClick={m.redo} disabled={!snap.canRedo} title={snap.redoLabel ? t("drw2d.redoWhat", { what: m.labelText(snap.redoLabel) }) : undefined} data-testid="drw2d-redo">{t("drw2d.redo")}</Button>
        <Button size="sm" variant={m.showRegions ? "secondary" : "ghost"} aria-pressed={m.showRegions} onClick={() => m.setShowRegions(!m.showRegions)}>{t("drw2d.showRegions")}</Button>
        <Button size="sm" variant={m.snapToGrid ? "secondary" : "ghost"} aria-pressed={m.snapToGrid} onClick={() => m.setSnapToGrid(!m.snapToGrid)}>{t("drw2d.snapGrid")}</Button>
        <Button size="sm" variant="ghost" onClick={() => void m.restore()}>{t("drw2d.restore")}</Button>
      </div>
      <div role="group" aria-label={t("drw2d.capture.group")} className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select aria-label={t("drw2d.capture.background")} value={background} onChange={(e) => setBackground(e.target.value as CaptureBackground)} options={[{ value: "tema", label: t("drw2d.capture.bgTheme") }, { value: "transparente", label: t("drw2d.capture.bgTransparent") }]} />
        </div>
        <div className="w-32">
          <Select aria-label={t("drw2d.capture.scale")} value={String(scale)} onChange={(e) => setScale(Number(e.target.value))} options={EXPORT_SCALES.map((s) => ({ value: String(s), label: t("drw2d.capture.scaleOption", { scale: s }) }))} />
        </div>
        <Button size="sm" variant="secondary" onClick={() => void m.capture(background, scale)} busy={m.capturing} data-testid="drw2d-capture">{t("drw2d.capture.button")}</Button>
        <span className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("drw2d.capture.hint")}</span>
      </div>
    </div>
  );
}
