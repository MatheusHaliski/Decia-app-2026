/**
 * Exportação da vista 2D (RF74 "Capturar PNG"): monta um SVG autossuficiente só com o DESENHO — camadas visíveis para a
 * pessoa, sem grade, divisórias, cursores, seleção nem prévia fantasma (RF74.CA01: sem overlays nem interface). As cores
 * chegam já resolvidas dos tokens do tema (a tela lê `getComputedStyle`); aqui não há cor literal. A conversão SVG →
 * canvas → PNG fica na tela (precisa do navegador).
 */
import { cotaLine, drawOrder, measureMeters, type Drawing2D, type LayerTone, type ShapeGeom, type ViewState } from "./model";

export interface ExportColors {
  /** cor de fundo resolvida, ou null para PNG transparente */
  background: string | null;
  /** traço por estilo de camada */
  tone: Record<LayerTone, string>;
}

export interface ExportOptions {
  scale: number;
  colors: ExportColors;
  /** valor da cota em metros formatado no idioma da tela */
  formatMeters?: (meters: number) => string;
}

export const TONE_WIDTH: Record<LayerTone, number> = { estrutura: 3, esquadria: 2, anotacao: 1.25, referencia: 1.5 };
export const EXPORT_SCALES = [1, 2, 3] as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => String(Math.round(v * 100) / 100);
const pts = (p: readonly { x: number; y: number }[]) => p.map((q) => `${n(q.x)},${n(q.y)}`).join(" ");

function shapeSvg(g: ShapeGeom, color: string, width: number, metersPerUnit: number, formatMeters: (m: number) => string, dashed: boolean): string {
  const stroke = `stroke="${esc(color)}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="8 6"' : ""}`;
  switch (g.kind) {
    case "linha":
      return `<line x1="${n(g.a.x)}" y1="${n(g.a.y)}" x2="${n(g.b.x)}" y2="${n(g.b.y)}" ${stroke}/>`;
    case "polilinha":
      return g.closed ? `<polygon points="${pts(g.points)}" ${stroke}/>` : `<polyline points="${pts(g.points)}" ${stroke}/>`;
    case "retangulo":
      return `<rect x="${n(g.x)}" y="${n(g.y)}" width="${n(g.w)}" height="${n(g.h)}" ${stroke}/>`;
    case "circulo":
      return `<circle cx="${n(g.cx)}" cy="${n(g.cy)}" r="${n(g.r)}" ${stroke}/>`;
    case "texto":
      return `<text x="${n(g.x)}" y="${n(g.y)}" font-size="${n(g.size)}" font-family="sans-serif" fill="${esc(color)}">${esc(g.text)}</text>`;
    case "cota": {
      const { a2, b2, mid } = cotaLine(g);
      const thin = `stroke="${esc(color)}" stroke-width="1" fill="none"`;
      return `<g><line x1="${n(g.a.x)}" y1="${n(g.a.y)}" x2="${n(a2.x)}" y2="${n(a2.y)}" ${thin}/><line x1="${n(g.b.x)}" y1="${n(g.b.y)}" x2="${n(b2.x)}" y2="${n(b2.y)}" ${thin}/><line x1="${n(a2.x)}" y1="${n(a2.y)}" x2="${n(b2.x)}" y2="${n(b2.y)}" ${stroke}/><text x="${n(mid.x)}" y="${n(mid.y - 6)}" font-size="12" font-family="sans-serif" text-anchor="middle" fill="${esc(color)}">${esc(formatMeters(measureMeters(g, metersPerUnit)))}</text></g>`;
    }
  }
}

/** SVG do desenho na escala pedida (1×, 2×, 3×): largura/altura em pixels = folha × escala. */
export function exportSvg(doc: Drawing2D, view: Pick<ViewState, "hiddenLayerIds">, opts: ExportOptions): { svg: string; width: number; height: number } {
  const scale = Number.isFinite(opts.scale) && opts.scale > 0 ? Math.min(opts.scale, 4) : 1;
  const width = Math.round(doc.width * scale);
  const height = Math.round(doc.height * scale);
  const fmt = opts.formatMeters ?? ((m: number) => `${m.toFixed(2)} m`);
  const tones = new Map(doc.layers.map((l) => [l.id, l.tone]));
  const body = drawOrder(doc)
    .filter((s) => !view.hiddenLayerIds.includes(s.layerId))
    .map((s) => {
      const tone = tones.get(s.layerId) ?? "estrutura";
      return shapeSvg(s.geom, opts.colors.tone[tone], TONE_WIDTH[tone], doc.metersPerUnit, fmt, tone === "referencia");
    })
    .join("");
  const bg = opts.colors.background ? `<rect x="0" y="0" width="${doc.width}" height="${doc.height}" fill="${esc(opts.colors.background)}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${doc.width} ${doc.height}"><title>${esc(doc.title)}</title>${bg}${body}</svg>`;
  return { svg, width, height };
}
