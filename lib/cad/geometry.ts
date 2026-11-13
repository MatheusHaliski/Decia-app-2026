/**
 * Geometria plana das polilinhas do DXF: segmentos retos e arcos codificados pelo "bulge" (b = tan(θ/4); b > 0 = arco
 * anti-horário). Comprimento, área assinada (fórmula do laço — shoelace — mais os segmentos circulares), ponto dentro do
 * polígono e caixa envolvente. Unidades: as do desenho (a conversão para metro é feita depois).
 */

export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Arco de um segmento com bulge: comprimento e área do segmento circular (assinada, positiva quando b > 0). */
export function bulgeArc(p: Pt, q: Pt, bulge: number): { length: number; segArea: number } {
  const c = Math.hypot(q.x - p.x, q.y - p.y);
  if (!bulge || !Number.isFinite(bulge) || c === 0) return { length: c, segArea: 0 };
  const theta = 4 * Math.atan(bulge);
  const r = c / (2 * Math.abs(Math.sin(theta / 2)));
  return { length: r * Math.abs(theta), segArea: ((r * r) / 2) * (theta - Math.sin(theta)) };
}

/**
 * Comprimento e área assinada de uma polilinha (área só quando fechada; anti-horária > 0). `bulges[i]` vale para o segmento
 * que sai do vértice i (no fechamento, do último para o primeiro).
 */
export function polyMeasure(pts: readonly Pt[], bulges: readonly number[], closed: boolean): { length: number; area: number } {
  const n = pts.length;
  if (n < 2) return { length: 0, area: 0 };
  let length = 0;
  let twice = 0;
  let arcs = 0;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    const arc = bulgeArc(p, q, bulges[i] ?? 0);
    length += arc.length;
    if (closed) {
      twice += p.x * q.y - q.x * p.y;
      arcs += arc.segArea;
    }
  }
  return { length, area: closed && n >= 2 ? twice / 2 + arcs : 0 };
}

/** Pontos intermediários dos arcos (para testar "ponto dentro" em contornos com curvas). */
export function densify(pts: readonly Pt[], bulges: readonly number[], closed: boolean, perArc = 8): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    out.push(p);
    if (i >= segs) continue;
    const b = bulges[i] ?? 0;
    if (!b) continue;
    const q = pts[(i + 1) % n]!;
    const c = Math.hypot(q.x - p.x, q.y - p.y);
    if (c === 0) continue;
    const theta = 4 * Math.atan(b);
    const r = c / (2 * Math.abs(Math.sin(theta / 2)));
    const ux = (q.x - p.x) / c;
    const uy = (q.y - p.y) / c;
    const h = r * Math.cos(Math.abs(theta) / 2) * Math.sign(b);
    const cx = (p.x + q.x) / 2 - uy * h;
    const cy = (p.y + q.y) / 2 + ux * h;
    const a0 = Math.atan2(p.y - cy, p.x - cx);
    for (let k = 1; k < perArc; k++) {
      const a = a0 + (theta * k) / perArc;
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return out;
}

/** Regra par-ímpar: o ponto está dentro do polígono (fechado implicitamente)? */
export function pointInPolygon(pt: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function boundsOf(pts: readonly Pt[]): Bounds | null {
  if (!pts.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export const inBounds = (b: Bounds, p: Pt) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;

/** Caixa que acumula pontos (extensão do desenho). */
export class BoundsAcc {
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
  add(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  }
  get value(): Bounds | null {
    return this.minX === Infinity ? null : { minX: this.minX, minY: this.minY, maxX: this.maxX, maxY: this.maxY };
  }
}
