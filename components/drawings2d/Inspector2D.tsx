"use client";
/**
 * Inspetor do objeto selecionado: escolha do objeto por lista (alternativa ao clique), camada, regiões, revisão do objeto,
 * se a pessoa pode editá-lo agora e por quê (reserva alheia com dono e prazo), e campos numéricos — alternativa ao arraste
 * (WCAG 2.5.7). Cada campo grava um patch com a revisão esperada; o valor da cota é medido, nunca digitado (RF58.CA07).
 */
import { useState, type KeyboardEvent } from "react";
import { Button, Card, Checkbox, Field, Input, Select, cn } from "@/components/ui";
import { coveredBy, findConflict } from "@/lib/pieces/collab";
import { explainConflict, regionNames } from "@/lib/drawings2d/explain";
import { layerById, measureMeters, regionsOfShape, shapeById, type ShapeGeom } from "@/lib/drawings2d/model";
import { LockIcon } from "./icons";
import type { EditorModel } from "./useEditorModel";

type Translate = EditorModel["t"];
interface NumSpec {
  key: string;
  label: string;
  get(g: ShapeGeom): number;
  set(g: ShapeGeom, v: number): ShapeGeom;
}

/** Campos numéricos de cada tipo (unidades de desenho = cm na peça de demonstração). */
function numFields(g: ShapeGeom, t: Translate): NumSpec[] {
  const f = (key: string, labelKey: string, get: (g: ShapeGeom) => number, set: (g: ShapeGeom, v: number) => ShapeGeom): NumSpec => ({ key, label: t(labelKey), get, set });
  switch (g.kind) {
    case "retangulo":
      return [
        f("x", "drw2d.field.x", (q) => (q.kind === "retangulo" ? q.x : 0), (q, v) => (q.kind === "retangulo" ? { ...q, x: v } : q)),
        f("y", "drw2d.field.y", (q) => (q.kind === "retangulo" ? q.y : 0), (q, v) => (q.kind === "retangulo" ? { ...q, y: v } : q)),
        f("w", "drw2d.field.w", (q) => (q.kind === "retangulo" ? q.w : 0), (q, v) => (q.kind === "retangulo" ? { ...q, w: v } : q)),
        f("h", "drw2d.field.h", (q) => (q.kind === "retangulo" ? q.h : 0), (q, v) => (q.kind === "retangulo" ? { ...q, h: v } : q)),
      ];
    case "circulo":
      return [
        f("cx", "drw2d.field.cx", (q) => (q.kind === "circulo" ? q.cx : 0), (q, v) => (q.kind === "circulo" ? { ...q, cx: v } : q)),
        f("cy", "drw2d.field.cy", (q) => (q.kind === "circulo" ? q.cy : 0), (q, v) => (q.kind === "circulo" ? { ...q, cy: v } : q)),
        f("r", "drw2d.field.r", (q) => (q.kind === "circulo" ? q.r : 0), (q, v) => (q.kind === "circulo" ? { ...q, r: v } : q)),
      ];
    case "linha":
      return [
        f("x1", "drw2d.field.x1", (q) => (q.kind === "linha" ? q.a.x : 0), (q, v) => (q.kind === "linha" ? { ...q, a: { ...q.a, x: v } } : q)),
        f("y1", "drw2d.field.y1", (q) => (q.kind === "linha" ? q.a.y : 0), (q, v) => (q.kind === "linha" ? { ...q, a: { ...q.a, y: v } } : q)),
        f("x2", "drw2d.field.x2", (q) => (q.kind === "linha" ? q.b.x : 0), (q, v) => (q.kind === "linha" ? { ...q, b: { ...q.b, x: v } } : q)),
        f("y2", "drw2d.field.y2", (q) => (q.kind === "linha" ? q.b.y : 0), (q, v) => (q.kind === "linha" ? { ...q, b: { ...q.b, y: v } } : q)),
      ];
    case "texto":
      return [
        f("x", "drw2d.field.x", (q) => (q.kind === "texto" ? q.x : 0), (q, v) => (q.kind === "texto" ? { ...q, x: v } : q)),
        f("y", "drw2d.field.y", (q) => (q.kind === "texto" ? q.y : 0), (q, v) => (q.kind === "texto" ? { ...q, y: v } : q)),
        f("size", "drw2d.field.size", (q) => (q.kind === "texto" ? q.size : 0), (q, v) => (q.kind === "texto" ? { ...q, size: v } : q)),
      ];
    case "cota":
      return [f("offset", "drw2d.field.offset", (q) => (q.kind === "cota" ? q.offset : 0), (q, v) => (q.kind === "cota" ? { ...q, offset: v } : q))];
    case "polilinha":
      return [];
  }
}

/** Campo com rascunho local: grava ao sair do campo ou com Enter; valor inválido volta ao atual. */
function DraftField({ label, value, numeric, onCommit, testId }: { label: string; value: string; numeric: boolean; onCommit: (v: string) => void; testId?: string }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const v = draft.trim();
    if (v === value) return;
    if (numeric && !Number.isFinite(Number(v.replace(",", ".")))) {
      setDraft(value);
      return;
    }
    onCommit(numeric ? String(Number(v.replace(",", "."))) : v);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") setDraft(value);
  };
  return (
    <Field label={label}>
      {({ id }) => <Input id={id} value={draft} inputMode={numeric ? "decimal" : "text"} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={onKeyDown} className="min-h-[var(--ws-control-sm)]" data-testid={testId} />}
    </Field>
  );
}

export function Inspector2D({ m }: { m: EditorModel }) {
  const { t, doc, state, explain, view, meId, now, selection } = m;
  if (!doc || !state || !explain) return null;
  const shape = selection.length === 1 ? shapeById(doc, selection[0]!) : undefined;
  const visible = doc.shapes.filter((s) => !view.hiddenLayerIds.includes(s.layerId));
  const picker = (
    <Select
      aria-label={t("drw2d.inspector.pick")}
      value={selection.length === 1 ? selection[0]! : ""}
      onChange={(e) => m.pick(e.target.value || null, false)}
      data-testid="drw2d-pick"
      options={[{ value: "", label: t("drw2d.inspector.pickNone") }, ...visible.map((s) => ({ value: s.id, label: `${s.name} · ${layerById(doc, s.layerId)?.name ?? s.layerId}` }))]}
    />
  );
  if (!shape) {
    return (
      <Card as="section" padding="sm" aria-labelledby="drw2d-inspector-h" data-testid="inspector-2d">
        <h3 id="drw2d-inspector-h" className="mb-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">{t("drw2d.inspector.title")}</h3>
        {picker}
        <p className="mt-1 text-[length:var(--ws-text-caption)] text-ws-text-muted">{selection.length > 1 ? t("drw2d.inspector.many", { count: selection.length }) : t("drw2d.inspector.none")}</p>
      </Card>
    );
  }
  const layer = layerById(doc, shape.layerId);
  const regions = regionsOfShape(doc, shape);
  const q = { pieceId: doc.pieceId, layerId: shape.layerId, regionIds: regions, userId: meId };
  const conflict = findConflict(state.locks, q, now);
  const hidden = view.hiddenLayerIds.includes(shape.layerId);
  const status: { ok: boolean; text: string } = layer?.locked
    ? { ok: false, text: t("drw2d.inspector.layerLocked", { layer: layer.name }) }
    : hidden
      ? { ok: false, text: t("drw2d.inspector.layerHidden", { layer: layer?.name ?? shape.layerId }) }
      : conflict
        ? { ok: false, text: explainConflict(explain, regions, shape.layerId, conflict) }
        : coveredBy(state.locks, q, now)
          ? { ok: true, text: t("drw2d.inspector.yours") }
          : { ok: true, text: t("drw2d.inspector.free") };
  const g = shape.geom;
  return (
    <Card as="section" padding="sm" aria-labelledby="drw2d-inspector-h" data-testid="inspector-2d">
      <h3 id="drw2d-inspector-h" className="mb-1 font-[family-name:var(--ws-font-display)] text-[length:var(--ws-text-body)] font-semibold">{t("drw2d.inspector.title")}</h3>
      {picker}
      <div className="mt-2 grid gap-1 text-[length:var(--ws-text-body-sm)]">
        <p className="font-semibold">{shape.name}</p>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">
          {t(`drw2d.kind.${g.kind}`)} · {layer?.name ?? shape.layerId} · {t("drw2d.inspector.rev", { rev: shape.rev })}
        </p>
        <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("drw2d.inspector.regions", { regions: regionNames(state, regions) })}</p>
        <p className={cn("rounded-[var(--ws-radius-sm)] px-2 py-1 text-[length:var(--ws-text-caption)]", status.ok ? "bg-ws-success-soft text-ws-success-ink" : "bg-ws-danger-soft text-ws-danger-ink")} data-testid="inspector-status">
          <LockIcon locked={!status.ok} /> {status.text}
        </p>
        {!layer?.locked ? (
          <Button size="sm" variant="ghost" className="justify-self-start" onClick={m.reserveHere}>{t("drw2d.inspector.reserve")}</Button>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {numFields(g, t).map((f) => (
          <DraftField key={`${shape.id}:${shape.rev}:${f.key}`} label={f.label} value={String(f.get(g))} numeric onCommit={(v) => m.setGeom(shape.id, f.set(g, Number(v)))} testId={`field-${f.key}`} />
        ))}
      </div>
      {g.kind === "texto" ? (
        <div className="mt-2">
          <DraftField key={`${shape.id}:${shape.rev}:text`} label={t("drw2d.field.text")} value={g.text} numeric={false} onCommit={(v) => m.setGeom(shape.id, { ...g, text: v })} />
        </div>
      ) : null}
      {g.kind === "polilinha" ? (
        <div className="mt-2">
          <Checkbox checked={g.closed} onCheckedChange={(closed) => m.setGeom(shape.id, { ...g, closed })} label={t("drw2d.field.closed")} hint={t("drw2d.field.points", { count: g.points.length })} />
        </div>
      ) : null}
      {g.kind === "cota" ? (
        <p className="mt-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("drw2d.inspector.measured", { value: m.formatMeters(measureMeters(g, doc.metersPerUnit)) })}</p>
      ) : null}
    </Card>
  );
}
