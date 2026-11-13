/**
 * Documento vetorial 2D do Drawings (RF58 formas, RF65 camadas e regiões, RF66 edição colaborativa): dados puros, sem DOM.
 *
 * Eixos independentes (DRAWINGS_CAMADAS_COLABORACAO_DECIA): camada (organização autoral, travada ou não no documento),
 * região (retângulo espacial hierárquico "fachada/terreo" ou grupo nomeado de objetos) e objeto (forma com revisão
 * própria). Visibilidade e camada ativa são preferências de cada pessoa (`ViewState`), nunca do documento: ocultar uma
 * camada não esconde nada de quem colabora e não libera reserva (RF65.CA05).
 */
import type { LayerStack } from "@/lib/pieces/layers";
import { geometryBounds, hitTest, type Bounds, type Geometry, type Point } from "@/lib/studio/selection";

export type { Bounds, Point };

export const SHAPE_KINDS = ["linha", "polilinha", "retangulo", "circulo", "texto", "cota"] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export type ShapeGeom =
  | { kind: "linha"; a: Point; b: Point }
  | { kind: "polilinha"; points: readonly Point[]; closed: boolean }
  | { kind: "retangulo"; x: number; y: number; w: number; h: number }
  | { kind: "circulo"; cx: number; cy: number; r: number }
  /** texto ancorado na linha de base, à esquerda; `size` é a altura da letra em unidades de desenho */
  | { kind: "texto"; x: number; y: number; text: string; size: number }
  /** cota alinhada de `a` a `b`, com a linha de cota deslocada `offset` na normal; o valor é sempre medido, nunca digitado */
  | { kind: "cota"; a: Point; b: Point; offset: number };

export interface Shape2D {
  id: string;
  layerId: string;
  /** nome legível ("Janela S2"): dado do documento, exibido como está */
  name: string;
  geom: ShapeGeom;
  /** revisão do objeto (RF66.CA04): sobe a cada patch aplicado nele; patch com revisão esperada antiga é recusado */
  rev: number;
  /** região por grupo: o objeto pertence a ela onde quer que esteja (e não às áreas espaciais) */
  group?: string;
}

/** Estilo visual da camada (mapeado para tokens na tela e no PNG). */
export const LAYER_TONES = ["estrutura", "esquadria", "anotacao", "referencia"] as const;
export type LayerTone = (typeof LAYER_TONES)[number];

export interface DocLayer {
  id: string;
  name: string;
  /** 0 = mais profunda; desenha de baixo para cima */
  depth: number;
  /** travada no documento: ninguém edita (RF65; `authorizePatch` → CAMADA_TRAVADA) */
  locked: boolean;
  tone: LayerTone;
}

export type Region2D =
  | { id: string; name: string; kind: "AREA"; bounds: Bounds }
  | { id: string; name: string; kind: "GRUPO" };

export interface Drawing2D {
  pieceId: string;
  title: string;
  /** revisão global: ordena os patches da peça (cada patch aplicado soma 1) */
  revision: number;
  width: number;
  height: number;
  /** metros por unidade de desenho — cotas calculadas sobre a geometria real (RF58.CA07) */
  metersPerUnit: number;
  grid: number;
  layers: readonly DocLayer[];
  regions: readonly Region2D[];
  shapes: readonly Shape2D[];
}

/** Preferências de visualização de UMA pessoa (não vão para o documento compartilhado). */
export interface ViewState {
  activeLayerId: string;
  hiddenLayerIds: readonly string[];
}

const EPS = 1e-9;
const finite = (...values: number[]) => values.every((v) => Number.isFinite(v));
const finitePoint = (p: Point) => finite(p.x, p.y);
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const round2 = (v: number) => Math.round(v * 100) / 100;

/** Largura aproximada do texto (fonte de traço técnico ~0,6 da altura por caractere). */
export const textWidth = (text: string, size: number) => Math.max(1, text.length) * size * 0.6;

/** Pontos da cota: extremos medidos, extremos na linha de cota e meio da linha (onde vai o valor). */
export function cotaLine(g: Extract<ShapeGeom, { kind: "cota" }>): { a2: Point; b2: Point; mid: Point; length: number } {
  const dx = g.b.x - g.a.x;
  const dy = g.b.y - g.a.y;
  const length = Math.hypot(dx, dy);
  const nx = length > EPS ? -dy / length : 0;
  const ny = length > EPS ? dx / length : 0;
  const a2 = { x: g.a.x + nx * g.offset, y: g.a.y + ny * g.offset };
  const b2 = { x: g.b.x + nx * g.offset, y: g.b.y + ny * g.offset };
  return { a2, b2, mid: { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 }, length };
}

/** Valor da cota em metros, calculado sobre a geometria (nunca o texto). */
export const measureMeters = (g: Extract<ShapeGeom, { kind: "cota" }>, metersPerUnit: number) => round2(distance(g.a, g.b) * metersPerUnit);

/** Geometria equivalente da biblioteca de seleção (hit-test e caixa envolvente reaproveitados de lib/studio/selection). */
export function toGeometry(g: ShapeGeom): Geometry {
  switch (g.kind) {
    case "linha":
      return { kind: "segment", start: g.a, end: g.b };
    case "polilinha":
      return { kind: "path", points: [...g.points], closed: g.closed };
    case "retangulo":
      return { kind: "rect", x: g.x, y: g.y, width: g.w, height: g.h };
    case "circulo":
      return { kind: "circle", cx: g.cx, cy: g.cy, radius: g.r };
    case "texto":
      return { kind: "rect", x: g.x, y: g.y - g.size, width: textWidth(g.text, g.size), height: g.size };
    case "cota": {
      const { a2, b2 } = cotaLine(g);
      return { kind: "path", points: [g.a, a2, b2, g.b], closed: false };
    }
  }
}

export function shapeBounds(g: ShapeGeom): Bounds {
  const b = geometryBounds(toGeometry(g));
  if (g.kind !== "cota") return b;
  // o valor da cota fica sobre a linha: a caixa inclui a altura do rótulo
  const pad = 14;
  return { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
}

export function translateGeom(g: ShapeGeom, dx: number, dy: number): ShapeGeom {
  const p = (q: Point) => ({ x: q.x + dx, y: q.y + dy });
  switch (g.kind) {
    case "linha":
      return { ...g, a: p(g.a), b: p(g.b) };
    case "polilinha":
      return { ...g, points: g.points.map(p) };
    case "retangulo":
      return { ...g, x: g.x + dx, y: g.y + dy };
    case "circulo":
      return { ...g, cx: g.cx + dx, cy: g.cy + dy };
    case "texto":
      return { ...g, x: g.x + dx, y: g.y + dy };
    case "cota":
      return { ...g, a: p(g.a), b: p(g.b) };
  }
}

/**
 * Geometria válida e não degenerada (RF58.CA01): números finitos, linha e cota com comprimento, retângulo com área,
 * círculo com raio, polilinha com dois pontos distintos (três para fechada), texto não vazio.
 */
export function validGeom(g: ShapeGeom): boolean {
  switch (g.kind) {
    case "linha":
      return finitePoint(g.a) && finitePoint(g.b) && distance(g.a, g.b) > EPS;
    case "polilinha": {
      if (!g.points.every(finitePoint)) return false;
      const distinct = new Set(g.points.map((q) => `${q.x},${q.y}`)).size;
      return distinct >= (g.closed ? 3 : 2);
    }
    case "retangulo":
      return finite(g.x, g.y, g.w, g.h) && g.w > EPS && g.h > EPS;
    case "circulo":
      return finite(g.cx, g.cy, g.r) && g.r > EPS;
    case "texto":
      return finite(g.x, g.y, g.size) && g.size > EPS && g.text.trim().length > 0 && g.text.length <= 120;
    case "cota":
      return finitePoint(g.a) && finitePoint(g.b) && Number.isFinite(g.offset) && distance(g.a, g.b) > EPS;
  }
}

export function geomEquals(a: ShapeGeom, b: ShapeGeom): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A forma inteira (com o rótulo da cota) cabe na folha? */
export function insideSheet(doc: Pick<Drawing2D, "width" | "height">, g: ShapeGeom): boolean {
  const b = g.kind === "cota" ? geometryBounds(toGeometry(g)) : shapeBounds(g);
  return b.x >= -EPS && b.y >= -EPS && b.x + b.width <= doc.width + EPS && b.y + b.height <= doc.height + EPS;
}

/* ── Camadas ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const layerById = (doc: Pick<Drawing2D, "layers">, id: string) => doc.layers.find((l) => l.id === id);
export const shapeById = (doc: Pick<Drawing2D, "shapes">, id: string) => doc.shapes.find((s) => s.id === id);

/** Pilha de camadas como UMA pessoa a vê (visibilidade e camada ativa dela), no formato de `lib/pieces/layers`. */
export function viewStack(doc: Pick<Drawing2D, "layers">, view: ViewState): LayerStack {
  const hidden = new Set(view.hiddenLayerIds);
  const layers = [...doc.layers].sort((a, b) => a.depth - b.depth).map((l) => ({ id: l.id, name: l.name, depth: l.depth, locked: l.locked, visible: !hidden.has(l.id) }));
  return { layers, activeLayerId: view.activeLayerId };
}

/** Formas em ordem de desenho: camada mais profunda primeiro, e dentro da camada na ordem do documento. */
export function drawOrder(doc: Pick<Drawing2D, "layers" | "shapes">): Shape2D[] {
  const depth = new Map(doc.layers.map((l) => [l.id, l.depth]));
  return doc.shapes.map((s, i) => ({ s, i })).sort((x, y) => (depth.get(x.s.layerId) ?? 0) - (depth.get(y.s.layerId) ?? 0) || x.i - y.i).map((x) => x.s);
}

export const isVisible = (view: ViewState, shape: Shape2D) => !view.hiddenLayerIds.includes(shape.layerId);

/** A forma visível mais acima no ponto (clique), com tolerância em unidades de desenho. */
export function shapeAt(doc: Drawing2D, view: ViewState, point: Point, tolerance = 6): Shape2D | undefined {
  return [...drawOrder(doc)].reverse().find((s) => isVisible(view, s) && hitTest(toGeometry(s.geom), point, tolerance));
}

/* ── Regiões ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const regionById = (doc: Pick<Drawing2D, "regions">, id: string) => doc.regions.find((r) => r.id === id);
export const regionDepth = (id: string) => id.split("/").length - 1;
export const parentRegionId = (id: string) => (id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null);

/** Filhas diretas (caminho estável "pai/filha", RF65.CA01); `null` = regiões de topo (caminho órfão também cai no topo). */
export function childRegions(doc: Pick<Drawing2D, "regions">, id: string | null): Region2D[] {
  const ids = new Set(doc.regions.map((r) => r.id));
  return doc.regions.filter((r) => {
    const parent = parentRegionId(r.id);
    return id === null ? parent === null || !ids.has(parent) : parent === id;
  });
}

/** Regiões em ordem de árvore (mãe antes das filhas), para listas e leitura por teclado. */
export function regionTree(doc: Pick<Drawing2D, "regions">): Region2D[] {
  const out: Region2D[] = [];
  const visit = (parent: string | null) => {
    for (const r of childRegions(doc, parent)) {
      out.push(r);
      visit(r.id);
    }
  };
  visit(null);
  return out;
}

/** Interseção com área positiva; forma sem espessura num eixo (linha horizontal na divisa) conta para os dois lados. */
function axisOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  if (a1 - a0 > EPS) return a0 < b1 - EPS && b0 < a1 - EPS;
  return a0 >= b0 - EPS && a0 <= b1 + EPS;
}
export const boundsTouch = (a: Bounds, b: Bounds) => axisOverlap(a.x, a.x + a.width, b.x, b.x + b.width) && axisOverlap(a.y, a.y + a.height, b.y, b.y + b.height);

/**
 * Regiões que a geometria toca — TODAS, não só a do centro (RF65.CA07). Região por grupo vale para os membros do grupo,
 * onde quer que estejam. Nas áreas, desce a hierarquia e devolve a mais específica tocada: a forma que fica no Térreo
 * pertence a "fachada/terreo" (não a "fachada"), para que reservas disjuntas convivam (RF66.CA01); se a forma estiver
 * numa parte da mãe que nenhuma filha cobre, pertence à própria mãe.
 */
export function regionsOfGeom(doc: Pick<Drawing2D, "regions">, g: ShapeGeom, group?: string): string[] {
  if (group && doc.regions.some((r) => r.id === group && r.kind === "GRUPO")) return [group];
  // caixa da geometria em si (sem a folga visual do rótulo da cota)
  const box = geometryBounds(toGeometry(g));
  const out: string[] = [];
  const visit = (parent: string | null) => {
    for (const r of childRegions(doc, parent)) {
      if (r.kind !== "AREA" || !boundsTouch(box, r.bounds)) continue;
      const before = out.length;
      visit(r.id);
      if (out.length === before) out.push(r.id);
    }
  };
  visit(null);
  return out;
}

export const regionsOfShape = (doc: Pick<Drawing2D, "regions">, s: Pick<Shape2D, "geom" | "group">) => regionsOfGeom(doc, s.geom, s.group);

/** Formas que pertencem à região (ou a uma descendente dela). */
export function shapesInRegion(doc: Drawing2D, regionId: string): Shape2D[] {
  return doc.shapes.filter((s) => regionsOfShape(doc, s).some((r) => r === regionId || r.startsWith(regionId + "/")));
}

/** Caixa de uma região por grupo = caixa dos membros (para desenhar a divisória). */
export function groupBounds(doc: Drawing2D, regionId: string): Bounds | null {
  const members = doc.shapes.filter((s) => s.group === regionId);
  if (!members.length) return null;
  const boxes = members.map((s) => shapeBounds(s.geom));
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, width: Math.max(...boxes.map((b) => b.x + b.width)) - x, height: Math.max(...boxes.map((b) => b.y + b.height)) - y };
}

/** Centro da caixa de uma região (onde inserir forma nova, foco por teclado). */
export function regionCenter(doc: Drawing2D, regionId: string): Point | null {
  const r = regionById(doc, regionId);
  const b = r?.kind === "AREA" ? r.bounds : r ? groupBounds(doc, r.id) : null;
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null;
}

/** Região de área mais específica sob o ponto (clique numa área vazia seleciona a região). */
export function regionAt(doc: Pick<Drawing2D, "regions">, p: Point): string | null {
  const ids = regionsOfGeom(doc, { kind: "retangulo", x: p.x - 0.5, y: p.y - 0.5, w: 1, h: 1 });
  return ids[0] ?? null;
}
