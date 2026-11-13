/**
 * Sugestões da "IA" do Drawings 2D (RF74 prévia fantasma; D-12): regras DETERMINÍSTICAS sobre a geometria — nenhum
 * modelo é chamado. Cada sugestão é um patch pronto (revisão esperada por objeto), com o que leu (`dependsOn`, para
 * invalidar quando algo muda) e as formas "depois" para desenhar em transparência. Todo número citado no rótulo vem do
 * cálculo. Camadas travadas ou ocultas para a pessoa não recebem sugestão.
 *
 * - FECHAR_LACUNA: polilinha aberta cujas pontas quase se tocam (0 < d ≤ tolerância) → fecha.
 * - ALINHAR: retângulos com topo ou eixo vertical quase iguais → leva ao valor mais comum (empate: o menor).
 * - ENCAIXAR_GRADE: âncoras fora da grade → `snapPoint` (lib/studio/selection); não repete objeto já sugerido acima.
 * - COMPLETAR_SIMETRIA: eixo = centro do contorno principal; retângulo/círculo sem par espelhado → propõe a cópia.
 * - PROPOR_COTAS: na camada de anotação, cotas de altura da fachada e da cumeeira que faltam (valor medido).
 */
import { snapPoint } from "@/lib/studio/selection";
import { patchTargets, type Label, type PatchOp } from "./engine";
import { boundsTouch, cotaLine, distance, layerById, round2, shapeBounds, validGeom, insideSheet, type Bounds, type Drawing2D, type Point, type Shape2D, type ShapeGeom, type ViewState } from "./model";

export const SUGGESTION_KINDS = ["FECHAR_LACUNA", "ALINHAR", "ENCAIXAR_GRADE", "COMPLETAR_SIMETRIA", "PROPOR_COTAS"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export interface Suggestion {
  /** determinístico: tipo + alvo (a mesma situação gera o mesmo id) */
  id: string;
  kind: SuggestionKind;
  layerId: string;
  label: Label;
  ops: PatchOp[];
  /** objetos alterados ou criados */
  targetIds: string[];
  /** objetos lidos para calcular (alvos + referências): mudou algum → a sugestão fica obsoleta */
  dependsOn: string[];
  /** objetos existentes de que a sugestão trata (escopo da seleção no modo Assistido) */
  scopeIds: string[];
  /** regiões tocadas antes e depois */
  regionIds: string[];
  /** formas "depois", desenhadas em transparência */
  ghosts: Shape2D[];
}

export interface SuggestOptions {
  /** quanto conta como "quase" (unidades de desenho); padrão 8 */
  tolerance?: number;
  /** nomes das formas criadas (vêm do i18n da tela) */
  names?: { mirror(source: string): string; heightCota: string; ridgeCota: string };
}

const DEFAULT_NAMES: NonNullable<SuggestOptions["names"]> = {
  mirror: (source) => `${source} (simétrica)`,
  heightCota: "Cota da altura",
  ridgeCota: "Cota da cumeeira",
};

const r2 = round2;
const byId = (a: Shape2D, b: Shape2D) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
type Rect = Extract<ShapeGeom, { kind: "retangulo" }>;
type Circle = Extract<ShapeGeom, { kind: "circulo" }>;
const isRect = (s: Shape2D): s is Shape2D & { geom: Rect } => s.geom.kind === "retangulo";

/** Grupos de valores próximos (cadeia a partir do primeiro de cada grupo, sem "arrastar" a tolerância). */
function clusters<T>(items: readonly T[], value: (t: T) => number, tol: number): T[][] {
  const sorted = [...items].sort((a, b) => value(a) - value(b));
  const out: T[][] = [];
  for (const item of sorted) {
    const last = out.at(-1);
    if (last && value(item) - value(last[0]!) <= tol) last.push(item);
    else out.push([item]);
  }
  return out.filter((c) => c.length > 1);
}

/** Valor de referência do grupo: o mais repetido; empate → o menor (determinístico). */
function referenceValue(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
}

/** Contorno principal (polilinha de maior caixa nas camadas de estrutura): define eixo de simetria e cotas. */
export function mainOutline(doc: Drawing2D): Shape2D | null {
  const tones = new Map(doc.layers.map((l) => [l.id, l.tone]));
  const candidates = doc.shapes.filter((s) => s.geom.kind === "polilinha" && tones.get(s.layerId) === "estrutura" && s.geom.points.length >= 4);
  const area = (s: Shape2D) => { const b = shapeBounds(s.geom); return b.width * b.height; };
  return [...candidates].sort((a, b) => area(b) - area(a) || byId(a, b))[0] ?? null;
}

/** Cobertura: polilinha aberta de estrutura cujo ponto mais alto fica acima do contorno. */
function roofOf(doc: Drawing2D, outline: Shape2D): Shape2D | null {
  const top = shapeBounds(outline.geom).y;
  const tones = new Map(doc.layers.map((l) => [l.id, l.tone]));
  return [...doc.shapes].sort(byId).find((s) => s.id !== outline.id && s.geom.kind === "polilinha" && !s.geom.closed && tones.get(s.layerId) === "estrutura" && shapeBounds(s.geom).y < top) ?? null;
}

function build(doc: Drawing2D, base: Omit<Suggestion, "regionIds" | "ghosts">): Suggestion | null {
  const targets = patchTargets(doc, base.ops);
  if (!targets.ok) return null;
  const regionIds = [...new Set(targets.targets.flatMap((t) => t.regionIds))];
  const ghosts: Shape2D[] = base.ops.flatMap((op): Shape2D[] => {
    if (op.op === "add") return [{ ...op.shape, rev: 0 }];
    if (op.op === "update") {
      const cur = doc.shapes.find((s) => s.id === op.id);
      return cur ? [{ ...cur, geom: op.geom }] : [];
    }
    return [];
  });
  return { ...base, regionIds, ghosts };
}

const updateOp = (s: Shape2D, geom: ShapeGeom): PatchOp => ({ op: "update", id: s.id, expectedRev: s.rev, before: s.geom, geom });

/* ── FECHAR_LACUNA ───────────────────────────────────────────────────────────────────────────────────────────── */

function closeGaps(doc: Drawing2D, shapes: readonly Shape2D[], tol: number): Suggestion[] {
  const out: Suggestion[] = [];
  for (const s of shapes) {
    if (s.geom.kind !== "polilinha" || s.geom.closed || s.geom.points.length < 3) continue;
    const first = s.geom.points[0]!;
    const last = s.geom.points.at(-1)!;
    const gap = distance(first, last);
    if (gap <= 0 || gap > tol) continue;
    const geom: ShapeGeom = { kind: "polilinha", points: s.geom.points.slice(0, -1), closed: true };
    if (!validGeom(geom)) continue;
    const sug = build(doc, {
      id: `FECHAR_LACUNA:${s.id}`, kind: "FECHAR_LACUNA", layerId: s.layerId,
      label: { key: "drw2d.sug.FECHAR_LACUNA", vars: { name: s.name, gap: r2(gap * doc.metersPerUnit * 100) } },
      ops: [updateOp(s, geom)], targetIds: [s.id], dependsOn: [s.id], scopeIds: [s.id],
    });
    if (sug) out.push(sug);
  }
  return out;
}

/* ── ALINHAR ─────────────────────────────────────────────────────────────────────────────────────────────────── */

function align(doc: Drawing2D, shapes: readonly Shape2D[], tol: number): Suggestion[] {
  const rects = shapes.filter(isRect);
  const want = new Map<string, { y?: number; x?: number; refs: Set<string> }>();
  const note = (s: Shape2D, patchv: { y?: number; x?: number }, refs: readonly Shape2D[]) => {
    const cur = want.get(s.id) ?? { refs: new Set<string>() };
    want.set(s.id, { ...cur, ...patchv, refs: new Set([...cur.refs, ...refs.filter((r) => r.id !== s.id).map((r) => r.id)]) });
  };
  for (const group of clusters(rects, (s) => s.geom.y, tol)) {
    const ref = referenceValue(group.map((s) => s.geom.y));
    for (const s of group) if (s.geom.y !== ref) note(s, { y: ref }, group);
  }
  const cx = (s: Shape2D & { geom: Rect }) => s.geom.x + s.geom.w / 2;
  for (const group of clusters(rects, cx, tol)) {
    const ref = referenceValue(group.map(cx));
    for (const s of group) if (cx(s) !== ref) note(s, { x: ref - s.geom.w / 2 }, group);
  }
  const out: Suggestion[] = [];
  for (const s of [...rects].sort(byId)) {
    const w = want.get(s.id);
    if (!w) continue;
    const geom: Rect = { ...s.geom, x: w.x ?? s.geom.x, y: w.y ?? s.geom.y };
    const refs = [...w.refs].sort();
    const refNames = refs.map((id) => doc.shapes.find((x) => x.id === id)?.name ?? id).join(", ");
    const label: Label = w.x !== undefined && w.y !== undefined
      ? { key: "drw2d.sug.ALINHAR.both", vars: { name: s.name, refs: refNames, dx: r2(geom.x - s.geom.x), dy: r2(geom.y - s.geom.y) } }
      : w.y !== undefined
        ? { key: "drw2d.sug.ALINHAR.top", vars: { name: s.name, refs: refNames, from: r2(s.geom.y), to: r2(geom.y) } }
        : { key: "drw2d.sug.ALINHAR.column", vars: { name: s.name, refs: refNames, from: r2(s.geom.x), to: r2(geom.x) } };
    const sug = build(doc, { id: `ALINHAR:${s.id}`, kind: "ALINHAR", layerId: s.layerId, label, ops: [updateOp(s, geom)], targetIds: [s.id], dependsOn: [s.id, ...refs], scopeIds: [s.id] });
    if (sug) out.push(sug);
  }
  return out;
}

/* ── ENCAIXAR_GRADE ──────────────────────────────────────────────────────────────────────────────────────────── */

function snapGeom(g: ShapeGeom, grid: number): ShapeGeom | null {
  const p = (q: Point) => snapPoint(q, grid, true);
  switch (g.kind) {
    case "linha":
      return { ...g, a: p(g.a), b: p(g.b) };
    case "polilinha":
      return { ...g, points: g.points.map(p) };
    case "retangulo": {
      const q = p({ x: g.x, y: g.y });
      return { ...g, x: q.x, y: q.y };
    }
    case "circulo": {
      const q = p({ x: g.cx, y: g.cy });
      return { ...g, cx: q.x, cy: q.y };
    }
    case "texto": {
      const q = p({ x: g.x, y: g.y });
      return { ...g, x: q.x, y: q.y };
    }
    case "cota":
      return null; // a cota segue a geometria que mede; não se encaixa sozinha
  }
}

function maxShift(a: ShapeGeom, b: ShapeGeom): number {
  const pts = (g: ShapeGeom): Point[] => {
    switch (g.kind) {
      case "linha": return [g.a, g.b];
      case "polilinha": return [...g.points];
      case "retangulo": return [{ x: g.x, y: g.y }];
      case "circulo": return [{ x: g.cx, y: g.cy }];
      case "texto": return [{ x: g.x, y: g.y }];
      case "cota": return [g.a, g.b];
    }
  };
  const pa = pts(a);
  const pb = pts(b);
  return Math.max(0, ...pa.map((q, i) => (pb[i] ? distance(q, pb[i]!) : 0)));
}

function snapToGrid(doc: Drawing2D, shapes: readonly Shape2D[], skip: ReadonlySet<string>): Suggestion[] {
  const out: Suggestion[] = [];
  for (const s of [...shapes].sort(byId)) {
    if (skip.has(s.id)) continue;
    const geom = snapGeom(s.geom, doc.grid);
    if (!geom || JSON.stringify(geom) === JSON.stringify(s.geom) || !validGeom(geom) || !insideSheet(doc, geom)) continue;
    const sug = build(doc, {
      id: `ENCAIXAR_GRADE:${s.id}`, kind: "ENCAIXAR_GRADE", layerId: s.layerId,
      label: { key: "drw2d.sug.ENCAIXAR_GRADE", vars: { name: s.name, grid: doc.grid, shift: r2(maxShift(s.geom, geom)) } },
      ops: [updateOp(s, geom)], targetIds: [s.id], dependsOn: [s.id], scopeIds: [s.id],
    });
    if (sug) out.push(sug);
  }
  return out;
}

/* ── COMPLETAR_SIMETRIA ──────────────────────────────────────────────────────────────────────────────────────── */

function mirror(g: Rect | Circle, axis: number): Rect | Circle {
  return g.kind === "retangulo" ? { ...g, x: r2(2 * axis - g.x - g.w) } : { ...g, cx: r2(2 * axis - g.cx) };
}

function similar(a: ShapeGeom, b: ShapeGeom, tol: number): boolean {
  if (a.kind === "retangulo" && b.kind === "retangulo") return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.w - b.w) <= tol && Math.abs(a.h - b.h) <= tol;
  if (a.kind === "circulo" && b.kind === "circulo") return Math.abs(a.cx - b.cx) <= tol && Math.abs(a.cy - b.cy) <= tol && Math.abs(a.r - b.r) <= tol;
  return false;
}

/** Sobreposição com área (encostar não conta) — a cópia espelhada não pode cair em cima de outro objeto. */
const overlapsArea = (a: Bounds, b: Bounds) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function completeSymmetry(doc: Drawing2D, shapes: readonly Shape2D[], tol: number, names: NonNullable<SuggestOptions["names"]>): Suggestion[] {
  const outline = mainOutline(doc);
  if (!outline) return [];
  const box = shapeBounds(outline.geom);
  const axis = r2(box.x + box.width / 2);
  const out: Suggestion[] = [];
  const candidates = [...shapes].sort(byId).filter((s) => s.geom.kind === "retangulo" || s.geom.kind === "circulo");
  for (const s of candidates) {
    const g = s.geom as Rect | Circle;
    const center = g.kind === "retangulo" ? g.x + g.w / 2 : g.cx;
    if (Math.abs(center - axis) <= tol) continue; // sobre o eixo: é o próprio par
    const m = mirror(g, axis);
    if (shapes.some((o) => o.id !== s.id && similar(o.geom, m, tol))) continue;
    const mBox = shapeBounds(m);
    const blockers = shapes.filter((o) => o.id !== s.id && overlapsArea(shapeBounds(o.geom), mBox));
    if (blockers.length || !boundsTouch(mBox, box) || !insideSheet(doc, m)) continue;
    const id = `${s.id}-sim`;
    if (doc.shapes.some((o) => o.id === id)) continue;
    const sug = build(doc, {
      id: `COMPLETAR_SIMETRIA:${s.id}`, kind: "COMPLETAR_SIMETRIA", layerId: s.layerId,
      label: { key: "drw2d.sug.COMPLETAR_SIMETRIA", vars: { name: s.name, axis } },
      ops: [{ op: "add", shape: { id, layerId: s.layerId, name: names.mirror(s.name), geom: m, ...(s.group ? { group: s.group } : {}) } }],
      targetIds: [id], dependsOn: [s.id, outline.id, id], scopeIds: [s.id],
    });
    if (sug) out.push(sug);
  }
  return out;
}

/* ── PROPOR_COTAS ────────────────────────────────────────────────────────────────────────────────────────────── */

function proposeCotas(doc: Drawing2D, layerId: string, tol: number, names: NonNullable<SuggestOptions["names"]>): Suggestion[] {
  if (layerById(doc, layerId)?.tone !== "anotacao") return [];
  const outline = mainOutline(doc);
  if (!outline) return [];
  const box = shapeBounds(outline.geom);
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const ground = box.y + box.height;
  const cotas = doc.shapes.filter((s) => s.geom.kind === "cota") as (Shape2D & { geom: Extract<ShapeGeom, { kind: "cota" }> })[];
  /** já existe cota vertical medindo de y1 a y2 (em qualquer x, qualquer ordem)? */
  const hasVertical = (y1: number, y2: number) => cotas.some(({ geom: c }) => Math.abs(c.a.x - c.b.x) <= tol && ((Math.abs(c.a.y - y1) <= tol && Math.abs(c.b.y - y2) <= tol) || (Math.abs(c.a.y - y2) <= tol && Math.abs(c.b.y - y1) <= tol)));
  const out: Suggestion[] = [];
  const propose = (key: "altura" | "cumeeira", geom: Extract<ShapeGeom, { kind: "cota" }>, name: string, deps: string[]) => {
    const id = `cota-${key}-${outline.id}`;
    if (doc.shapes.some((s) => s.id === id) || !insideSheet(doc, geom)) return;
    const meters = r2(cotaLine(geom).length * doc.metersPerUnit);
    const sug = build(doc, {
      id: `PROPOR_COTAS:${key}`, kind: "PROPOR_COTAS", layerId,
      label: { key: `drw2d.sug.PROPOR_COTAS.${key}`, vars: { meters } },
      ops: [{ op: "add", shape: { id, layerId, name, geom } }],
      targetIds: [id], dependsOn: [...deps, id], scopeIds: [outline.id],
    });
    if (sug) out.push(sug);
  };
  if (!hasVertical(ground, top)) {
    // linha de cota à direita do contorno, na margem
    propose("altura", { kind: "cota", a: { x: right, y: ground }, b: { x: right, y: top }, offset: 140 }, names.heightCota, [outline.id]);
  }
  const roof = roofOf(doc, outline);
  if (roof) {
    const ridge = shapeBounds(roof.geom).y;
    if (!hasVertical(ground, ridge)) {
      // à esquerda do contorno (normal da cota para baixo→cima aponta para a direita: deslocamento negativo)
      propose("cumeeira", { kind: "cota", a: { x: left, y: ground }, b: { x: left, y: ridge }, offset: -70 }, names.ridgeCota, [outline.id, roof.id]);
    }
  }
  return out;
}

/* ── Entrada ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Todas as sugestões para as camadas editáveis que a pessoa vê (destravadas e visíveis), em ordem de prioridade e de id.
 * Um objeto recebe no máximo uma sugestão de posição (fechar/alinhar antes de encaixar na grade).
 */
export function suggest(doc: Drawing2D, view: Pick<ViewState, "hiddenLayerIds">, opts: SuggestOptions = {}): Suggestion[] {
  const tol = opts.tolerance ?? 8;
  const names = opts.names ?? DEFAULT_NAMES;
  const layers = [...doc.layers].filter((l) => !l.locked && !view.hiddenLayerIds.includes(l.id)).sort((a, b) => a.depth - b.depth);
  const out: Suggestion[] = [];
  for (const layer of layers) {
    const shapes = doc.shapes.filter((s) => s.layerId === layer.id).sort(byId);
    const gaps = closeGaps(doc, shapes, tol);
    const aligns = align(doc, shapes, tol);
    const moved = new Set([...gaps, ...aligns].flatMap((s) => s.targetIds));
    out.push(...gaps, ...aligns, ...snapToGrid(doc, shapes, moved), ...completeSymmetry(doc, shapes, tol, names), ...proposeCotas(doc, layer.id, tol, names));
  }
  const order = new Map(SUGGESTION_KINDS.map((k, i) => [k, i]));
  return out.sort((a, b) => order.get(a.kind)! - order.get(b.kind)! || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * "Revisão do escopo": impressão digital (FNV-1a) das revisões dos objetos lidos. Qualquer mudança neles — editar,
 * remover, criar o que a sugestão ia criar — muda o número; mudanças em outros objetos não (RF66: revisão por objeto).
 */
export function scopeFingerprint(doc: Pick<Drawing2D, "shapes">, ids: readonly string[]): number {
  const revs = new Map(doc.shapes.map((s) => [s.id, s.rev]));
  const text = [...new Set(ids)].sort().map((id) => `${id}:${revs.get(id) ?? "-"}`).join(";");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
