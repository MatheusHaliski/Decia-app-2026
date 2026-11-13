/**
 * Cores do Drawings 2D SÓ por token (D-11): classes Tailwind escritas por extenso (o Tailwind gera só o que encontra
 * no código) e nomes de variável CSS para o PNG, que lê o valor resolvido do tema com `getComputedStyle`.
 */
import type { PresenceColor } from "@/lib/drawings2d/engine";
import type { LayerTone } from "@/lib/drawings2d/model";

export interface PresenceClasses {
  /** preenchimento do cursor */
  fill: string;
  stroke: string;
  /** fundo suave (etiqueta, região reservada) em SVG */
  fillSoft: string;
  /** texto sobre o fundo suave, em SVG */
  fillInk: string;
  /** traço na cor do texto (cadeado) */
  strokeInk: string;
  /** bolinha e chip em HTML */
  dot: string;
  chip: string;
}

export const PRESENCE: Record<PresenceColor, PresenceClasses> = {
  blue: { fill: "fill-ws-node-blue", stroke: "stroke-ws-node-blue", fillSoft: "fill-ws-node-blue-soft", fillInk: "fill-ws-node-blue-ink", strokeInk: "stroke-ws-node-blue-ink", dot: "bg-ws-node-blue", chip: "bg-ws-node-blue-soft text-ws-node-blue-ink" },
  orange: { fill: "fill-ws-node-orange", stroke: "stroke-ws-node-orange", fillSoft: "fill-ws-node-orange-soft", fillInk: "fill-ws-node-orange-ink", strokeInk: "stroke-ws-node-orange-ink", dot: "bg-ws-node-orange", chip: "bg-ws-node-orange-soft text-ws-node-orange-ink" },
  red: { fill: "fill-ws-node-red", stroke: "stroke-ws-node-red", fillSoft: "fill-ws-node-red-soft", fillInk: "fill-ws-node-red-ink", strokeInk: "stroke-ws-node-red-ink", dot: "bg-ws-node-red", chip: "bg-ws-node-red-soft text-ws-node-red-ink" },
  brown: { fill: "fill-ws-node-brown", stroke: "stroke-ws-node-brown", fillSoft: "fill-ws-node-brown-soft", fillInk: "fill-ws-node-brown-ink", strokeInk: "stroke-ws-node-brown-ink", dot: "bg-ws-node-brown", chip: "bg-ws-node-brown-soft text-ws-node-brown-ink" },
  yellow: { fill: "fill-ws-node-yellow", stroke: "stroke-ws-node-yellow", fillSoft: "fill-ws-node-yellow-soft", fillInk: "fill-ws-node-yellow-ink", strokeInk: "stroke-ws-node-yellow-ink", dot: "bg-ws-node-yellow", chip: "bg-ws-node-yellow-soft text-ws-node-yellow-ink" },
  green: { fill: "fill-ws-node-green", stroke: "stroke-ws-node-green", fillSoft: "fill-ws-node-green-soft", fillInk: "fill-ws-node-green-ink", strokeInk: "stroke-ws-node-green-ink", dot: "bg-ws-node-green", chip: "bg-ws-node-green-soft text-ws-node-green-ink" },
};

/** Traço e texto por estilo de camada. */
export const TONE: Record<LayerTone, { stroke: string; fill: string; cssVar: string }> = {
  estrutura: { stroke: "stroke-ws-text", fill: "fill-ws-text", cssVar: "--ws-text" },
  esquadria: { stroke: "stroke-ws-node-blue-ink", fill: "fill-ws-node-blue-ink", cssVar: "--ws-node-blue-ink" },
  anotacao: { stroke: "stroke-ws-text-muted", fill: "fill-ws-text-muted", cssVar: "--ws-text-muted" },
  referencia: { stroke: "stroke-ws-text-faint", fill: "fill-ws-text-faint", cssVar: "--ws-text-faint" },
};

/** Lê a cor resolvida de um token do tema atual (para o PNG); vazio se o navegador não expõe estilos. */
export function tokenColor(cssVar: string): string {
  if (typeof document === "undefined") return "";
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  } catch {
    return "";
  }
}
