/**
 * Comandos do editor 2D → patches (RF58/RF66). Cada comando lê a revisão de cada objeto no momento em que é montado
 * (`expectedRev`) e a revisão global (`baseRevision`); quem grava confere as duas coisas na transação. Os mesmos
 * construtores servem ao mouse, ao teclado, aos campos numéricos (WCAG 2.5.7) e à colaboradora simulada.
 */
import type { DrawingPatch, Label, PatchOp } from "./engine";
import { geomEquals, shapeById, translateGeom, type Drawing2D, type Point, type Shape2D, type ShapeGeom, type ShapeKind } from "./model";

let seq = 0;
/** Id curto e único na aba; o servidor (quando houver) atribui o definitivo. */
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

const patch = (doc: Drawing2D, actorId: string, ops: PatchOp[], label: Label): DrawingPatch => ({
  id: newId("p"),
  actorId,
  origin: "MANUAL",
  baseRevision: doc.revision,
  ops,
  label,
});

/** Move um ou mais objetos (dx, dy em unidades de desenho). Sem deslocamento ou sem objeto → null. */
export function movePatch(doc: Drawing2D, actorId: string, ids: readonly string[], dx: number, dy: number): DrawingPatch | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return null;
  const shapes = ids.map((id) => shapeById(doc, id)).filter((s): s is Shape2D => !!s);
  if (!shapes.length) return null;
  const ops: PatchOp[] = shapes.map((s) => ({ op: "update", id: s.id, expectedRev: s.rev, before: s.geom, geom: translateGeom(s.geom, dx, dy) }));
  const label: Label = shapes.length === 1
    ? { key: "drw2d.op.move", vars: { name: shapes[0]!.name, dx, dy } }
    : { key: "drw2d.op.moveMany", vars: { count: shapes.length, dx, dy } };
  return patch(doc, actorId, ops, label);
}

/** Troca a geometria de um objeto (campos numéricos, texto, fechar polilinha). Igual à atual → null. */
export function setGeomPatch(doc: Drawing2D, actorId: string, id: string, geom: ShapeGeom, label?: Label): DrawingPatch | null {
  const s = shapeById(doc, id);
  if (!s || geomEquals(s.geom, geom)) return null;
  return patch(doc, actorId, [{ op: "update", id, expectedRev: s.rev, before: s.geom, geom }], label ?? { key: "drw2d.op.edit", vars: { name: s.name } });
}

export function insertPatch(doc: Drawing2D, actorId: string, shape: Omit<Shape2D, "rev">): DrawingPatch {
  return patch(doc, actorId, [{ op: "add", shape }], { key: "drw2d.op.insert", vars: { name: shape.name } });
}

export function removePatch(doc: Drawing2D, actorId: string, ids: readonly string[]): DrawingPatch | null {
  const shapes = ids.map((id) => shapeById(doc, id)).filter((s): s is Shape2D => !!s);
  if (!shapes.length) return null;
  const label: Label = shapes.length === 1 ? { key: "drw2d.op.remove", vars: { name: shapes[0]!.name } } : { key: "drw2d.op.removeMany", vars: { count: shapes.length } };
  return patch(doc, actorId, shapes.map((s) => ({ op: "remove", id: s.id, expectedRev: s.rev })), label);
}

/** Forma padrão de cada tipo, centrada em `at` (inserção por botão: alternativa ao arraste). */
export function defaultGeom(kind: ShapeKind, at: Point, text = "Texto"): ShapeGeom {
  const { x, y } = at;
  switch (kind) {
    case "linha":
      return { kind, a: { x: x - 50, y }, b: { x: x + 50, y } };
    case "polilinha":
      return { kind, points: [{ x: x - 50, y: y + 30 }, { x, y: y - 30 }, { x: x + 50, y: y + 30 }], closed: false };
    case "retangulo":
      return { kind, x: x - 40, y: y - 30, w: 80, h: 60 };
    case "circulo":
      return { kind, cx: x, cy: y, r: 30 };
    case "texto":
      return { kind, x: x - 30, y: y + 6, text, size: 12 };
    case "cota":
      return { kind, a: { x: x - 50, y }, b: { x: x + 50, y }, offset: 30 };
  }
}
