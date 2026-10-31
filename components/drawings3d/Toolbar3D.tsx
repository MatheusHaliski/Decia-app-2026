"use client";
/** Barra do editor 3D: adicionar, desfazer/refazer, excluir, ferramenta do gizmo, enquadrar, qualidade, imagem e GLB. */
import { Button, Select } from "@/components/ui";
import { PRIMITIVE_KINDS, type PrimitiveKind } from "@/lib/drawings3d/model";
import { QUALITY, QUALITY_ORDER, type QualityId } from "@/lib/drawings3d/quality";
import type { GizmoMode } from "@/lib/drawings3d/engine/Viewport3D";
import type { Editor3D } from "@/lib/drawings3d/useEditor3D";
import { useI18n } from "@/lib/i18n/useI18n";

const GIZMO_MODES: readonly GizmoMode[] = ["translate", "rotate", "scale"];

export interface Toolbar3DProps {
  editor: Editor3D;
  onFrame: () => void;
  onCapture: () => void;
  onExport: () => void;
  exporting: boolean;
}

export function Toolbar3D({ editor, onFrame, onCapture, onExport, exporting }: Toolbar3DProps) {
  const { t } = useI18n();
  const undoTitle = editor.undoLabelKey ? t("d3.undoWhat", { action: t(editor.undoLabelKey) }) : t("d3.undo");
  const redoTitle = editor.redoLabelKey ? t("d3.redoWhat", { action: t(editor.redoLabelKey) }) : t("d3.redo");
  return (
    <div role="toolbar" aria-label={t("d3.toolbar")} className="flex flex-wrap items-center gap-2" data-testid="toolbar-3d">
      <div className="w-44">
        <Select
          aria-label={t("d3.add")}
          value=""
          data-testid="d3-add"
          onChange={(e) => e.target.value && editor.add(e.target.value as PrimitiveKind)}
          options={[{ value: "", label: t("d3.add") }, ...PRIMITIVE_KINDS.map((k) => ({ value: k, label: t(`d3.kind.${k}`) }))]}
        />
      </div>
      <Button size="sm" variant="ghost" onClick={editor.undo} disabled={!editor.canUndo} title={undoTitle} data-testid="d3-undo">{t("d3.undo")}</Button>
      <Button size="sm" variant="ghost" onClick={editor.redo} disabled={!editor.canRedo} title={redoTitle} data-testid="d3-redo">{t("d3.redo")}</Button>
      <Button size="sm" variant="ghost" onClick={editor.remove} disabled={!editor.selectedId} data-testid="d3-remove">{t("d3.remove")}</Button>
      <div role="group" aria-label={t("d3.gizmoGroup")} className="flex gap-1">
        {GIZMO_MODES.map((m) => (
          <Button key={m} size="sm" variant={editor.gizmoMode === m ? "secondary" : "ghost"} aria-pressed={editor.gizmoMode === m} onClick={() => editor.setGizmoMode(m)}>
            {t(`d3.gizmo.${m}`)}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="ghost" onClick={onFrame}>{t("d3.frame")}</Button>
      <div className="w-56">
        <Select
          aria-label={t("d3.quality")}
          title={t(QUALITY[editor.quality].hintKey)}
          value={editor.quality}
          data-testid="d3-quality"
          onChange={(e) => editor.setQuality(e.target.value as QualityId)}
          options={QUALITY_ORDER.map((q) => ({ value: q, label: t(QUALITY[q].labelKey) }))}
        />
      </div>
      <Button size="sm" variant="secondary" onClick={onCapture} data-testid="d3-capture">{t("d3.capture")}</Button>
      <Button size="sm" variant="secondary" onClick={onExport} busy={exporting} data-testid="d3-export">{t("d3.export")}</Button>
      <Button size="sm" variant="ghost" onClick={editor.reset}>{t("d3.reset")}</Button>
    </div>
  );
}
