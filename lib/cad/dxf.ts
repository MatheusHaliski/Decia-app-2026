/**
 * Leitor de DXF ASCII (AutoCAD Drawing Exchange Format), sem dependências e sem rede. Lê os pares "código de grupo / valor":
 *  • HEADER: `$INSUNITS` (unidade), `$ACADVER` (versão);
 *  • TABLES/LAYER: camadas (nome, desligada, congelada);
 *  • BLOCKS: só conta as definições (a geometria de dentro dos blocos não é explodida — a inserção vira contagem);
 *  • ENTITIES (espaço do modelo): LINE, LWPOLYLINE e POLYLINE+VERTEX (com bulge), CIRCLE, ARC, ELLIPSE e SPLINE (aproximadas),
 *    MLINE (multilinha), TEXT/MTEXT, INSERT (contagem de blocos, MINSERT conta linhas × colunas), DIMENSION e HATCH com contorno
 *    simples (polilinha ou arestas reta/arco). O resto é contado como "sem suporte" e listado (RF70.CA06).
 * Medidas ficam nas unidades do desenho; a conversão para metro e a montagem do quantitativo estão em `takeoff.ts`.
 * Textos do arquivo são DADOS (nunca instruções) e aparecem como estão.
 */
import { BoundsAcc, boundsOf, densify, inBounds, pointInPolygon, polyMeasure, type Bounds, type Pt } from "./geometry";
import { classifyName } from "./classify";
import { CadReadError } from "./types";

/** Teto de entidades lidas (arquivo excessivo é recusado, RF70.CA05). */
export const DXF_MAX_ENTITIES = 1_500_000;

export interface DxfLayer {
  name: string;
  off: boolean;
  frozen: boolean;
}

export interface LayerStats {
  /** entidades do espaço do modelo na camada */
  entities: number;
  /** Σ comprimentos (linhas, polilinhas, arcos, círculos, elipses e splines), unidades do desenho */
  length: number;
  /** parte do comprimento que é aproximada (elipses e splines) */
  approxLength: number;
  /** Σ comprimentos de multilinhas (MLINE, já é o eixo da parede) */
  mlineLength: number;
  /** Σ áreas de contornos fechados que NÃO viraram ambiente, unidades² */
  closedArea: number;
  closedCount: number;
  /** Σ áreas de hachuras com contorno simples */
  hatchArea: number;
  hatchCount: number;
}

export interface ClosedShape {
  id: number;
  layer: string;
  area: number;
  perimeter: number;
  /** contorno para "ponto dentro" (arcos densificados) */
  ring: Pt[];
  bounds: Bounds;
  /** fechada só na geometria (último vértice = primeiro, sem a marca de fechada) */
  implicit: boolean;
}

export interface OpenShape {
  layer: string;
  ring: Pt[];
  bounds: Bounds;
  /** distância entre o último e o primeiro vértice */
  gap: number;
  perimeter: number;
}

export interface DxfText {
  text: string;
  layer: string;
  x: number;
  y: number;
}

export interface DxfRoom {
  name: string;
  layer: string;
  /** unidades² do desenho */
  area: number;
  perimeter: number;
  /** área escrita no desenho (m²), quando há um texto "A = 12,50 m²" dentro do contorno */
  declaredM2: number | null;
}

export interface DxfInsertGroup {
  block: string;
  layer: string;
  count: number;
  anonymous: boolean;
}

export interface DxfDimensionOverride {
  layer: string;
  text: string;
  /** medida real (unidades do desenho) */
  measurement: number;
}

export interface DxfAnalysis {
  version: string | null;
  /** `$INSUNITS` como está no arquivo (null quando ausente) */
  insUnits: number | null;
  layers: DxfLayer[];
  layerStats: Record<string, LayerStats>;
  rooms: DxfRoom[];
  /** textos de ambiente sem contorno fechado em volta */
  roomsWithoutContour: string[];
  /** polilinhas abertas que parecem ambiente: texto de ambiente dentro (fechando o vão) ou camada de ambiente */
  openRooms: { name: string | null; layer: string; gap: number }[];
  implicitClosed: number;
  inserts: DxfInsertGroup[];
  dimensions: { count: number; overrides: DxfDimensionOverride[]; measured: number[] };
  hatchSkipped: number;
  unsupported: Record<string, number>;
  paperSpace: number;
  blockDefs: number;
  extents: Bounds | null;
  entities: number;
  approximated: number;
  /** entidades fora do plano XY (achatadas na área) */
  offPlane: number;
  texts: number;
}

type Pair = [number, string];

/* ───────────────────────────── texto ───────────────────────────── */

/** DXF 2007+ é UTF-8; versões antigas usam a página de código do Windows (ANSI_1252). */
export function decodeDxfBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1252").decode(bytes);
    } catch {
      let s = "";
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
      return s;
    }
  }
}

/** `\U+00E7` (escape Unicode de versões antigas) e códigos `%%c %%d %%p %%%`. */
export function decodeDxfText(s: string): string {
  return s
    .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/%%[cC]/g, "Ø")
    .replace(/%%[dD]/g, "°")
    .replace(/%%[pP]/g, "±")
    .replace(/%%[uUoOkK]/g, "")
    .replace(/%%%/g, "%");
}

/** Tira a formatação do MTEXT (`\P` parágrafo, `{\fArial|b0;…}`, `\H2.5;`, empilhados `\S1^2;`…). */
export function stripMtext(s: string): string {
  return decodeDxfText(
    s
      .replace(/\\[Pp]/g, " ")
      .replace(/\\~/g, " ")
      .replace(/\\S([^;]*?)[#^/]([^;]*);/g, "$1/$2")
      .replace(/\\[fFHWQTACcp][^;]*;/g, "")
      .replace(/\\[LlOoKkNX]/g, "")
      .replace(/\\\\/g, "\u0000")
      .replace(/\\\{/g, "\u0001")
      .replace(/\\\}/g, "\u0002")
      .replace(/[{}]/g, "")
      .replace(/\u0000/g, "\\")
      .replace(/\u0001/g, "{")
      .replace(/\u0002/g, "}"),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/* ───────────────────────────── leitura dos pares ───────────────────────────── */

/** Percorre o arquivo registro a registro (cada registro começa num código 0). Linha de código inválida = arquivo malformado. */
function eachRecord(text: string, onRecord: (type: string, pairs: Pair[]) => boolean | void): void {
  const n = text.length;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let lineNo = 0;
  const nextLine = (): string | null => {
    if (pos >= n) return null;
    let e = text.indexOf("\n", pos);
    if (e < 0) e = n;
    let line = text.slice(pos, e);
    pos = e + 1;
    lineNo++;
    if (line.endsWith("\r")) line = line.slice(0, -1);
    return line;
  };
  let type: string | null = null;
  let pairs: Pair[] = [];
  for (;;) {
    const codeLine = nextLine();
    if (codeLine === null) break;
    const trimmed = codeLine.trim();
    if (trimmed === "" && pos >= n) break;
    if (!/^-?\d+$/.test(trimmed)) throw new CadReadError("MALFORMADO", { format: "DXF", line: lineNo });
    const code = Number(trimmed);
    const value = nextLine();
    if (value === null) throw new CadReadError("MALFORMADO", { format: "DXF", line: lineNo });
    if (code === 999) continue;
    if (code === 0) {
      if (type !== null && onRecord(type, pairs) === false) return;
      type = value.trim().toUpperCase();
      pairs = [];
      continue;
    }
    if (type === null) throw new CadReadError("MALFORMADO", { format: "DXF", line: lineNo });
    pairs.push([code, value]);
  }
  if (type !== null) onRecord(type, pairs);
}

const num = (v: string | undefined, d = 0): number => {
  if (v === undefined) return d;
  const x = Number.parseFloat(v);
  return Number.isFinite(x) ? x : d;
};

function first(pairs: Pair[], code: number): string | undefined {
  for (const [c, v] of pairs) if (c === code) return v;
  return undefined;
}

const layerOf = (pairs: Pair[]) => decodeDxfText((first(pairs, 8) ?? "0").trim()) || "0";
const inPaper = (pairs: Pair[]) => (first(pairs, 67) ?? "").trim() === "1";

/** Extrusão (210/220/230): só ±Z é tratada; −Z espelha o X do sistema da entidade (algoritmo do eixo arbitrário). */
function extrusionOf(pairs: Pair[]): "Z" | "-Z" | "OUTRA" {
  const ex = num(first(pairs, 210), 0);
  const ey = num(first(pairs, 220), 0);
  const ez = num(first(pairs, 230), 1);
  if (Math.abs(ex) < 1e-9 && Math.abs(ey) < 1e-9) return ez < 0 ? "-Z" : "Z";
  return "OUTRA";
}

/* ───────────────────────────── acumulador ───────────────────────────── */

interface PolyAcc {
  layer: string;
  pts: Pt[];
  bulges: number[];
  closed: boolean;
  is3d: boolean;
  zs: number[];
  mirror: boolean;
  skip: boolean;
  paper: boolean;
  offPlane: boolean;
}

class Acc {
  layers = new Map<string, DxfLayer>();
  stats: Record<string, LayerStats> = {};
  closed: ClosedShape[] = [];
  open: OpenShape[] = [];
  texts: DxfText[] = [];
  inserts = new Map<string, DxfInsertGroup>();
  dimCount = 0;
  dimOverrides: DxfDimensionOverride[] = [];
  dimMeasured: number[] = [];
  hatchSkipped = 0;
  unsupported: Record<string, number> = {};
  paperSpace = 0;
  blockDefs = 0;
  entities = 0;
  approximated = 0;
  offPlane = 0;
  implicitClosed = 0;
  bounds = new BoundsAcc();
  private nextId = 1;

  stat(layer: string): LayerStats {
    let s = this.stats[layer];
    if (!s) {
      s = { entities: 0, length: 0, approxLength: 0, mlineLength: 0, closedArea: 0, closedCount: 0, hatchArea: 0, hatchCount: 0 };
      this.stats[layer] = s;
      if (!this.layers.has(layer)) this.layers.set(layer, { name: layer, off: false, frozen: false });
    }
    return s;
  }

  count(layer: string): void {
    this.entities++;
    if (this.entities > DXF_MAX_ENTITIES) throw new CadReadError("EXCESSIVO", { format: "DXF", max: DXF_MAX_ENTITIES });
    this.stat(layer).entities++;
  }

  addShape(layer: string, pts: Pt[], bulges: number[], closed: boolean, approx = false): void {
    const st = this.stat(layer);
    for (const p of pts) this.bounds.add(p.x, p.y);
    let isClosed = closed;
    let implicit = false;
    if (!closed && pts.length >= 3) {
      const a = pts[0]!;
      const b = pts[pts.length - 1]!;
      const size = boundsOf(pts);
      const diag = size ? Math.hypot(size.maxX - size.minX, size.maxY - size.minY) : 0;
      if (diag > 0 && Math.hypot(a.x - b.x, a.y - b.y) <= diag * 1e-9) {
        // último vértice repetido sobre o primeiro: fechada na geometria
        isClosed = true;
        implicit = true;
        pts = pts.slice(0, -1);
        bulges = bulges.slice(0, pts.length);
        this.implicitClosed++;
      }
    }
    const m = polyMeasure(pts, bulges, isClosed);
    st.length += m.length;
    if (approx) st.approxLength += m.length;
    const ring = densify(pts, bulges, isClosed);
    if (isClosed && pts.length >= 3 && Math.abs(m.area) > 0) {
      this.addClosed(layer, ring, Math.abs(m.area), m.length, implicit);
    } else if (!isClosed && pts.length >= 3) {
      const bounds = boundsOf(ring);
      const a = pts[0]!;
      const b = pts[pts.length - 1]!;
      if (bounds) this.open.push({ layer, ring, bounds, gap: Math.hypot(a.x - b.x, a.y - b.y), perimeter: m.length });
    }
  }

  /** Contorno fechado já medido (o comprimento entra pelo chamador). */
  addClosed(layer: string, ring: Pt[], area: number, perimeter: number, implicit = false): void {
    const bounds = boundsOf(ring);
    if (!bounds) return;
    this.closed.push({ id: this.nextId++, layer, area, perimeter, ring, bounds, implicit });
  }

  addCircle(layer: string, cx: number, cy: number, r: number): void {
    if (!(r > 0)) return;
    const st = this.stat(layer);
    st.length += 2 * Math.PI * r;
    this.bounds.add(cx - r, cy - r);
    this.bounds.add(cx + r, cy + r);
    const ring: Pt[] = [];
    for (let k = 0; k < 24; k++) ring.push({ x: cx + r * Math.cos((k * Math.PI) / 12), y: cy + r * Math.sin((k * Math.PI) / 12) });
    this.addClosed(layer, ring, Math.PI * r * r, 2 * Math.PI * r);
  }

  unsupportedType(type: string): void {
    this.unsupported[type] = (this.unsupported[type] ?? 0) + 1;
  }
}

/* ───────────────────────────── entidades ───────────────────────────── */

function readLine(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const x1 = num(first(pairs, 10));
  const y1 = num(first(pairs, 20));
  const z1 = num(first(pairs, 30));
  const x2 = num(first(pairs, 11));
  const y2 = num(first(pairs, 21));
  const z2 = num(first(pairs, 31));
  acc.stat(layer).length += Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  acc.bounds.add(x1, y1);
  acc.bounds.add(x2, y2);
}

function readLwPolyline(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const flags = Math.trunc(num(first(pairs, 70)));
  const mirror = extrusionOf(pairs);
  if (mirror === "OUTRA") acc.offPlane++;
  const pts: Pt[] = [];
  const bulges: number[] = [];
  for (const [c, v] of pairs) {
    if (c === 10) {
      pts.push({ x: num(v), y: 0 });
      bulges.push(0);
    } else if (c === 20 && pts.length) pts[pts.length - 1]!.y = num(v);
    else if (c === 42 && pts.length) bulges[bulges.length - 1] = num(v);
  }
  const world = mirror === "-Z" ? pts.map((p) => ({ x: -p.x, y: p.y })) : pts;
  const bl = mirror === "-Z" ? bulges.map((b) => -b) : bulges;
  acc.addShape(layer, world, bl, (flags & 1) === 1);
}

function startPolyline(acc: Acc, pairs: Pair[]): PolyAcc {
  const layer = layerOf(pairs);
  const paper = inPaper(pairs);
  const flags = Math.trunc(num(first(pairs, 70)));
  const mesh = (flags & 16) === 16 || (flags & 64) === 64;
  const ext = extrusionOf(pairs);
  if (paper) acc.paperSpace++;
  else {
    acc.count(layer);
    if (mesh) acc.unsupportedType("POLYLINE (malha)");
    if (ext === "OUTRA") acc.offPlane++;
  }
  return { layer, pts: [], bulges: [], closed: (flags & 1) === 1, is3d: (flags & 8) === 8, zs: [], mirror: ext === "-Z", skip: mesh, paper, offPlane: false };
}

function addVertex(poly: PolyAcc, pairs: Pair[]): void {
  if (poly.skip || poly.paper) return;
  const flags = Math.trunc(num(first(pairs, 70)));
  if ((flags & 16) === 16) return; // ponto de controle do quadro da spline: não é vértice da curva
  const x = num(first(pairs, 10));
  poly.pts.push({ x: poly.mirror ? -x : x, y: num(first(pairs, 20)) });
  poly.bulges.push((poly.mirror ? -1 : 1) * num(first(pairs, 42)));
  poly.zs.push(num(first(pairs, 30)));
}

function endPolyline(acc: Acc, poly: PolyAcc): void {
  if (poly.skip || poly.paper || poly.pts.length < 2) return;
  if (poly.is3d) {
    // comprimento verdadeiro em 3D; a área (se fechada) é a da projeção no plano XY
    let len3d = 0;
    const n = poly.pts.length;
    const segs = poly.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = poly.pts[i]!;
      const b = poly.pts[(i + 1) % n]!;
      len3d += Math.hypot(b.x - a.x, b.y - a.y, (poly.zs[(i + 1) % n] ?? 0) - (poly.zs[i] ?? 0));
    }
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const z of poly.zs) {
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
    if (zMax - zMin > 0) acc.offPlane++;
    const before = acc.stat(poly.layer).length;
    acc.addShape(poly.layer, poly.pts, poly.pts.map(() => 0), poly.closed);
    acc.stat(poly.layer).length = before + len3d;
    return;
  }
  acc.addShape(poly.layer, poly.pts, poly.bulges, poly.closed);
}

function readCircle(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const ext = extrusionOf(pairs);
  if (ext === "OUTRA") acc.offPlane++;
  const x = num(first(pairs, 10));
  acc.addCircle(layer, ext === "-Z" ? -x : x, num(first(pairs, 20)), num(first(pairs, 40)));
}

function readArc(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const r = num(first(pairs, 40));
  const s = num(first(pairs, 50));
  const e = num(first(pairs, 51));
  let sweep = (((e - s) % 360) + 360) % 360;
  if (sweep === 0) sweep = 360;
  const ext = extrusionOf(pairs);
  if (ext === "OUTRA") acc.offPlane++;
  const cx = (ext === "-Z" ? -1 : 1) * num(first(pairs, 10));
  const cy = num(first(pairs, 20));
  acc.stat(layer).length += Math.abs(r) * ((sweep * Math.PI) / 180);
  acc.bounds.add(cx - r, cy - r);
  acc.bounds.add(cx + r, cy + r);
}

/** Elipse: comprimento por integração numérica (aproximado); elipse inteira vira contorno fechado (área π·a·b exata). */
function readEllipse(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const cx = num(first(pairs, 10));
  const cy = num(first(pairs, 20));
  const mx = num(first(pairs, 11));
  const my = num(first(pairs, 21));
  const ratio = num(first(pairs, 40), 1);
  let t0 = num(first(pairs, 41), 0);
  let t1 = num(first(pairs, 42), 2 * Math.PI);
  const a = Math.hypot(mx, my);
  const b = a * ratio;
  if (!(a > 0)) return;
  if (t1 < t0) t1 += 2 * Math.PI;
  const full = Math.abs(t1 - t0 - 2 * Math.PI) < 1e-9;
  if (full) {
    t0 = 0;
    t1 = 2 * Math.PI;
  }
  const rot = Math.atan2(my, mx);
  const pts: Pt[] = [];
  const steps = 96;
  for (let k = 0; k <= steps; k++) {
    const t = t0 + ((t1 - t0) * k) / steps;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    pts.push({ x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) });
  }
  acc.approximated++;
  if (full) {
    const ring = pts.slice(0, -1);
    const perim = polyMeasure(ring, [], true).length;
    const st = acc.stat(layer);
    st.length += perim;
    st.approxLength += perim;
    for (const p of ring) acc.bounds.add(p.x, p.y);
    acc.addClosed(layer, ring, Math.PI * a * b, perim);
  } else {
    acc.addShape(layer, pts, [], false, true);
  }
}

/** Spline: comprimento pela poligonal dos pontos de ajuste (ou de controle) — aproximação sinalizada. */
function readSpline(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const fit: Pt[] = [];
  const ctrl: Pt[] = [];
  for (const [c, v] of pairs) {
    if (c === 11) fit.push({ x: num(v), y: 0 });
    else if (c === 21 && fit.length) fit[fit.length - 1]!.y = num(v);
    else if (c === 10) ctrl.push({ x: num(v), y: 0 });
    else if (c === 20 && ctrl.length) ctrl[ctrl.length - 1]!.y = num(v);
  }
  const pts = fit.length >= 2 ? fit : ctrl;
  const closed = (Math.trunc(num(first(pairs, 70))) & 1) === 1;
  acc.approximated++;
  if (pts.length >= 2) acc.addShape(layer, pts, [], closed, true);
}

/** Multilinha: os vértices (11/21) ficam na linha de justificação — o comprimento já é o da parede, sem linha dupla. */
function readMline(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const pts: Pt[] = [];
  for (const [c, v] of pairs) {
    if (c === 11) pts.push({ x: num(v), y: 0 });
    else if (c === 21 && pts.length) pts[pts.length - 1]!.y = num(v);
  }
  const closed = (Math.trunc(num(first(pairs, 71))) & 2) === 2;
  const m = polyMeasure(pts, [], closed);
  acc.stat(layer).mlineLength += m.length;
  for (const p of pts) acc.bounds.add(p.x, p.y);
}

function readText(acc: Acc, pairs: Pair[], mtext: boolean): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  let text: string;
  let x: number;
  let y: number;
  if (mtext) {
    const chunks = pairs.filter(([c]) => c === 3).map(([, v]) => v);
    text = stripMtext(chunks.join("") + (first(pairs, 1) ?? ""));
    x = num(first(pairs, 10));
    y = num(first(pairs, 20));
  } else {
    text = decodeDxfText(first(pairs, 1) ?? "").replace(/\s+/g, " ").trim();
    const aligned = num(first(pairs, 72)) !== 0 || num(first(pairs, 73)) !== 0;
    const hasAlign = first(pairs, 11) !== undefined;
    x = num(first(pairs, aligned && hasAlign ? 11 : 10));
    y = num(first(pairs, aligned && hasAlign ? 21 : 20));
    if (extrusionOf(pairs) === "-Z") x = -x;
  }
  acc.bounds.add(x, y);
  if (text) acc.texts.push({ text, layer, x, y });
}

function readInsert(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const block = decodeDxfText((first(pairs, 2) ?? "").trim());
  const cols = Math.max(1, Math.trunc(num(first(pairs, 70), 1)));
  const rows = Math.max(1, Math.trunc(num(first(pairs, 71), 1)));
  acc.bounds.add(num(first(pairs, 10)), num(first(pairs, 20)));
  if (!block) return;
  const anonymous = block.startsWith("*");
  // *D (cotas), *X (hachuras) e *T (tabelas) são geometria interna, não peças
  if (/^\*[DXT]\d*$/i.test(block)) return;
  const key = `${block}\u0000${layer}`;
  const g = acc.inserts.get(key) ?? { block, layer, count: 0, anonymous };
  g.count += cols * rows;
  acc.inserts.set(key, g);
}

function readDimension(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  acc.dimCount++;
  const type = Math.trunc(num(first(pairs, 70))) & 7;
  let measurement = first(pairs, 42) !== undefined ? num(first(pairs, 42)) : NaN;
  if (!Number.isFinite(measurement) || measurement === 0) {
    const x3 = num(first(pairs, 13));
    const y3 = num(first(pairs, 23));
    const x4 = num(first(pairs, 14));
    const y4 = num(first(pairs, 24));
    if (type === 1) measurement = Math.hypot(x4 - x3, y4 - y3);
    else if (type === 0) {
      const ang = (num(first(pairs, 50)) * Math.PI) / 180;
      measurement = Math.abs((x4 - x3) * Math.cos(ang) + (y4 - y3) * Math.sin(ang));
    }
  }
  if (type <= 1 && Number.isFinite(measurement) && measurement > 0) acc.dimMeasured.push(measurement);
  const text = decodeDxfText((first(pairs, 1) ?? "").trim());
  if (text && !text.includes("<>") && Number.isFinite(measurement) && measurement > 0 && type <= 1) {
    acc.dimOverrides.push({ layer, text: stripMtext(text), measurement });
  }
}

/* ── HATCH: contornos de polilinha ou de arestas reta/arco ── */

interface HatchPath {
  pts: Pt[];
  bulges: number[];
}

function arcEdgeToVertices(cx: number, cy: number, r: number, s: number, e: number, ccw: boolean): HatchPath {
  let sweep = (((e - s) % 360) + 360) % 360;
  if (sweep === 0) sweep = 360;
  // arestas horárias guardam os ângulos espelhados (como se fossem anti-horárias com Y invertido)
  const start = ccw ? s : -s;
  const signed = ccw ? sweep : -sweep;
  const P = (deg: number): Pt => ({ x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy + r * Math.sin((deg * Math.PI) / 180) });
  if (sweep >= 360 - 1e-9) {
    const half = signed / 2;
    const b = Math.tan((half * Math.PI) / 180 / 4);
    return { pts: [P(start), P(start + half)], bulges: [b, b] };
  }
  return { pts: [P(start)], bulges: [Math.tan((signed * Math.PI) / 180 / 4)] };
}

/** Lê os contornos depois do código 91. Devolve null quando algum contorno usa elipse ou spline (complexo). */
function hatchPaths(pairs: Pair[]): HatchPath[] | null {
  let i = pairs.findIndex(([c]) => c === 91);
  if (i < 0) return null;
  const nPaths = Math.trunc(num(pairs[i]![1]));
  i++;
  const paths: HatchPath[] = [];
  const at = (k: number) => pairs[k];
  const expect = (code: number): number | null => {
    while (i < pairs.length && at(i)![0] !== code) i++;
    if (i >= pairs.length) return null;
    return num(pairs[i++]![1]);
  };
  for (let p = 0; p < nPaths; p++) {
    const flags = expect(92);
    if (flags === null) return null;
    if ((Math.trunc(flags) & 2) === 2) {
      const hasBulge = expect(72) ?? 0;
      expect(73);
      const nv = Math.trunc(expect(93) ?? 0);
      const pts: Pt[] = [];
      const bulges: number[] = [];
      for (let v = 0; v < nv; v++) {
        const x = expect(10);
        const y = expect(20);
        if (x === null || y === null) return null;
        let b = 0;
        if (hasBulge && at(i)?.[0] === 42) b = num(pairs[i++]![1]);
        pts.push({ x, y });
        bulges.push(b);
      }
      paths.push({ pts, bulges });
    } else {
      const ne = Math.trunc(expect(93) ?? 0);
      const path: HatchPath = { pts: [], bulges: [] };
      for (let k = 0; k < ne; k++) {
        const kind = Math.trunc(expect(72) ?? 0);
        if (kind === 1) {
          const x = expect(10);
          const y = expect(20);
          expect(11);
          expect(21);
          if (x === null || y === null) return null;
          path.pts.push({ x, y });
          path.bulges.push(0);
        } else if (kind === 2) {
          const cx = expect(10) ?? 0;
          const cy = expect(20) ?? 0;
          const r = expect(40) ?? 0;
          const s = expect(50) ?? 0;
          const e = expect(51) ?? 0;
          const ccw = (expect(73) ?? 1) !== 0;
          const v = arcEdgeToVertices(cx, cy, r, s, e, ccw);
          path.pts.push(...v.pts);
          path.bulges.push(...v.bulges);
        } else {
          return null; // elipse (3) ou spline (4): contorno complexo
        }
      }
      paths.push(path);
    }
  }
  return paths;
}

function readHatch(acc: Acc, pairs: Pair[]): void {
  const layer = layerOf(pairs);
  acc.count(layer);
  const paths = hatchPaths(pairs);
  if (!paths || !paths.length) {
    acc.hatchSkipped++;
    return;
  }
  // regra par-ímpar: contorno dentro de um número ímpar de outros é furo
  const rings = paths.map((p) => ({ area: Math.abs(polyMeasure(p.pts, p.bulges, true).area), ring: densify(p.pts, p.bulges, true), probe: p.pts[0] }));
  let area = 0;
  rings.forEach((r, k) => {
    if (!r.probe) return;
    const depth = rings.filter((o, j) => j !== k && o.ring.length >= 3 && pointInPolygon(r.probe!, o.ring)).length;
    area += depth % 2 === 0 ? r.area : -r.area;
  });
  const st = acc.stat(layer);
  st.hatchArea += Math.max(0, area);
  st.hatchCount++;
}

const SKIP_SILENT = new Set(["ATTRIB", "SEQEND", "VERTEX", "ENDBLK", "VIEWPORT"]);

/* ───────────────────────────── leitura do arquivo ───────────────────────────── */

interface ParseState {
  section: string;
  version: string | null;
  insUnits: number | null;
  poly: PolyAcc | null;
  insertWithAttribs: boolean;
  sawSection: boolean;
}

export function parseDxf(text: string): DxfAnalysis {
  const acc = new Acc();
  const s: ParseState = { section: "", version: null, insUnits: null, poly: null, insertWithAttribs: false, sawSection: false };

  eachRecord(text, (type, pairs) => {
    if (type === "EOF") return false;
    if (type === "SECTION") {
      s.sawSection = true;
      s.section = (first(pairs, 2) ?? "").trim().toUpperCase();
      if (s.section === "HEADER") {
        let current = "";
        for (const [c, v] of pairs) {
          if (c === 9) current = v.trim().toUpperCase();
          else if (current === "$ACADVER" && c === 1) s.version = v.trim();
          else if (current === "$INSUNITS" && c === 70) s.insUnits = Math.trunc(num(v));
        }
      }
      return;
    }
    if (type === "ENDSEC") {
      if (s.poly) endPolyline(acc, s.poly);
      s.poly = null;
      s.section = "";
      return;
    }
    if (s.section === "TABLES") {
      if (type === "LAYER") {
        const name = decodeDxfText((first(pairs, 2) ?? "").trim());
        if (name) {
          const flags = Math.trunc(num(first(pairs, 70)));
          acc.layers.set(name, { name, off: num(first(pairs, 62)) < 0, frozen: (flags & 1) === 1 });
        }
      }
      return;
    }
    if (s.section === "BLOCKS") {
      if (type === "BLOCK") acc.blockDefs++;
      return;
    }
    if (s.section !== "ENTITIES") return;

    // continuação de POLYLINE (VERTEX… SEQEND) e de INSERT com atributos (ATTRIB… SEQEND)
    if (s.poly) {
      if (type === "VERTEX") return void addVertex(s.poly, pairs);
      endPolyline(acc, s.poly);
      s.poly = null;
      if (type === "SEQEND") return;
    }
    if (s.insertWithAttribs) {
      if (type === "ATTRIB") return;
      s.insertWithAttribs = false;
      if (type === "SEQEND") return;
    }
    if (type === "POLYLINE") {
      s.poly = startPolyline(acc, pairs);
      return;
    }
    if (inPaper(pairs)) {
      acc.paperSpace++;
      if (type === "INSERT" && (first(pairs, 66) ?? "").trim() === "1") s.insertWithAttribs = true;
      return;
    }
    switch (type) {
      case "LINE": return readLine(acc, pairs);
      case "LWPOLYLINE": return readLwPolyline(acc, pairs);
      case "CIRCLE": return readCircle(acc, pairs);
      case "ARC": return readArc(acc, pairs);
      case "ELLIPSE": return readEllipse(acc, pairs);
      case "SPLINE": return readSpline(acc, pairs);
      case "MLINE": return readMline(acc, pairs);
      case "TEXT": return readText(acc, pairs, false);
      case "MTEXT": return readText(acc, pairs, true);
      case "INSERT":
        readInsert(acc, pairs);
        if ((first(pairs, 66) ?? "").trim() === "1") s.insertWithAttribs = true;
        return;
      case "DIMENSION": return readDimension(acc, pairs);
      case "HATCH": return readHatch(acc, pairs);
      default:
        if (SKIP_SILENT.has(type)) return;
        acc.count(layerOf(pairs));
        acc.unsupportedType(type);
    }
  });
  if (s.poly) endPolyline(acc, s.poly);
  if (!s.sawSection) throw new CadReadError("MALFORMADO", { format: "DXF", line: 1 });

  const { rooms, roomsWithoutContour, openRooms, roomPolygons } = findRooms(acc);
  for (const shape of acc.closed) {
    if (roomPolygons.has(shape.id)) continue;
    const st = acc.stat(shape.layer);
    st.closedArea += shape.area;
    st.closedCount++;
  }

  return {
    version: s.version,
    insUnits: s.insUnits,
    layers: [...acc.layers.values()],
    layerStats: acc.stats,
    rooms,
    roomsWithoutContour,
    openRooms,
    implicitClosed: acc.implicitClosed,
    inserts: [...acc.inserts.values()].sort((a, b) => b.count - a.count || a.block.localeCompare(b.block)),
    dimensions: { count: acc.dimCount, overrides: acc.dimOverrides, measured: acc.dimMeasured },
    hatchSkipped: acc.hatchSkipped,
    unsupported: acc.unsupported,
    paperSpace: acc.paperSpace,
    blockDefs: acc.blockDefs,
    extents: acc.bounds.value,
    entities: acc.entities,
    approximated: acc.approximated,
    offPlane: acc.offPlane,
    texts: acc.texts.length,
  };
}

/* ───────────────────────────── ambientes ───────────────────────────── */

const ROOM_WORDS = [
  "SALA", "ESTAR", "JANTAR", "LIVING", "COZINHA", "COPA", "QUARTO", "DORMITORIO", "DORM", "SUITE", "BANHEIRO", "BANHO", "BWC", "WC", "LAVABO",
  "SANITARIO", "VESTIARIO", "AREA DE SERVICO", "A SERVICO", "LAVANDERIA", "CIRCULACAO", "CORREDOR", "HALL", "VARANDA", "SACADA", "TERRACO",
  "ESCRITORIO", "RECEPCAO", "ESPERA", "DEPOSITO", "DEP", "ALMOXARIFADO", "GARAGEM", "ABRIGO", "CLOSET", "ATELIE", "AUDITORIO", "REUNIAO",
  "ARQUIVO", "PROTOCOLO", "REFEITORIO", "CANTINA", "ATENDIMENTO", "GUARITA", "PORTARIA", "ESCADA", "COPA", "LOJA", "GABINETE", "SECRETARIA",
  "CONSULTORIO", "LABORATORIO", "BIBLIOTECA", "CLASSE", "PATIO", "ACADEMIA", "OFFICE", "KITCHEN", "BEDROOM", "BATHROOM", "LOBBY", "STORAGE", "MEETING",
];
const AREA_TEXT = /(\d+(?:[.,]\d+)?)\s*m\s*(?:²|2(?!\d))/i;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/** Texto que nomeia um ambiente: começa com uma palavra de ambiente, ou está numa camada de ambiente e não é número/área. */
function isRoomName(t: DxfText): boolean {
  const n = norm(t.text);
  if (!n || n.length > 60 || AREA_TEXT.test(t.text) || /^[\d\s.,]+$/.test(n)) return false;
  if (ROOM_WORDS.some((w) => n === w || n.startsWith(`${w} `))) return true;
  return classifyName(t.layer) === "AMBIENTE" && /[A-Z]{3,}/.test(n) && !/^(PD|H|PE DIREITO|NIVEL|COTA|PISO|FORRO)\b/.test(n);
}

function findRooms(acc: Acc): { rooms: DxfRoom[]; roomsWithoutContour: string[]; openRooms: DxfAnalysis["openRooms"]; roomPolygons: Set<number> } {
  const names = acc.texts.filter(isRoomName);
  const areaTexts = acc.texts.filter((t) => AREA_TEXT.test(t.text));
  const roomPolygons = new Set<number>();
  const used = new Set<DxfText>();
  const rooms: DxfRoom[] = [];
  const roomsWithoutContour: string[] = [];
  const openRooms: DxfAnalysis["openRooms"] = [];
  const inside = (s: ClosedShape, p: Pt) => inBounds(s.bounds, p) && pointInPolygon(p, s.ring);
  const containing = (p: Pt) => acc.closed.filter((s) => inside(s, p)).sort((a, b) => a.area - b.area);
  const namesIn = new Map<number, DxfText[]>();
  const namesInside = (s: ClosedShape) => {
    let list = namesIn.get(s.id);
    if (!list) {
      list = names.filter((n) => inside(s, { x: n.x, y: n.y }));
      namesIn.set(s.id, list);
    }
    return list.filter((n) => !used.has(n));
  };

  for (const t of names) {
    if (used.has(t)) continue;
    const p = { x: t.x, y: t.y };
    const all = containing(p);
    // o menor contorno que contém o nome; contornos de camada de ambiente têm preferência. Um contorno com vários nomes
    // espalhados (o perímetro do prédio) não é ambiente; nomes juntos ("SALA" / "DE ESTAR" em duas linhas) contam como um só.
    const preferred = all.filter((s) => classifyName(s.layer) === "AMBIENTE");
    let shape: ClosedShape | null = null;
    let group: DxfText[] = [];
    for (const cand of preferred.length ? preferred : all) {
      if (roomPolygons.has(cand.id)) continue;
      const within = namesInside(cand);
      const diag = Math.hypot(cand.bounds.maxX - cand.bounds.minX, cand.bounds.maxY - cand.bounds.minY);
      const spreadBox = boundsOf(within.map((n) => ({ x: n.x, y: n.y })));
      const spread = spreadBox ? Math.hypot(spreadBox.maxX - spreadBox.minX, spreadBox.maxY - spreadBox.minY) : 0;
      if (within.length <= 1 || spread <= diag * 0.25) {
        shape = cand;
        group = within.length ? within : [t];
        break;
      }
    }
    if (shape) {
      roomPolygons.add(shape.id);
      group.forEach((g) => used.add(g));
      const name = [...group].sort((a, b) => b.y - a.y || a.x - b.x).map((g) => g.text).join(" ");
      const room = shape;
      const declared = areaTexts.find((a) => inside(room, { x: a.x, y: a.y }) && containing({ x: a.x, y: a.y })[0]?.id === room.id);
      const m = declared ? AREA_TEXT.exec(declared.text) : null;
      rooms.push({ name, layer: room.layer, area: room.area, perimeter: room.perimeter, declaredM2: m ? Number(m[1]!.replace(",", ".")) : null });
      continue;
    }
    used.add(t);
    roomsWithoutContour.push(t.text);
    const open = acc.open.find((o) => inBounds(o.bounds, p) && pointInPolygon(p, o.ring));
    if (open) openRooms.push({ name: t.text, layer: open.layer, gap: open.gap });
  }
  // polilinha aberta em camada de ambiente, sem nome dentro: também parece ambiente
  for (const o of acc.open) {
    if (classifyName(o.layer) !== "AMBIENTE") continue;
    if (openRooms.some((r) => r.layer === o.layer && r.gap === o.gap)) continue;
    openRooms.push({ name: null, layer: o.layer, gap: o.gap });
  }
  return { rooms, roomsWithoutContour, openRooms, roomPolygons };
}
