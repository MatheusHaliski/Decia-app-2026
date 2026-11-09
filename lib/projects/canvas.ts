/**
 * Geometria do canvas livre da Mesa (RF22.CA03) — o canvas é CONECTADO: as zonas dão significado ao que se solta nelas.
 *
 *  ┌──────── Project Model Canvas (Finocchio) — por quê? · o quê? · quem? · como? · quando e quanto? ────────┐
 *  │ post-it solto num bloco vira dado da área: Requisitos → matriz de rastreabilidade; Partes interessadas → │
 *  │ mapa poder × interesse; Grupo de entregas → EAP; Riscos → registro com VME; os demais blocos → TAP.      │
 *  └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 *  ┌──── faixas de fase (rede do cronograma, atividade no nó) ────┐
 *  │ cartão de atividade solto numa faixa muda de fase (quadro);   │
 *  │ ligar dois cartões cria dependência (linha do tempo / CPM).   │
 *  └──────────────────────────────────────────────────────────────┘
 * Fora das zonas o canvas é livre: posição só muda posição (não gera versão).
 */
import { PMC_LAYOUT, type PmcBlock, type PmcQuestion } from "./lifecycle";
import { PROJECT_PHASES, type CanvasRef, type ProjectPhase } from "./types";

export interface Rect { x: number; y: number; w: number; h: number }
export type Zone =
  | { kind: "PMC"; block: PmcBlock; question: PmcQuestion; rect: Rect }
  | { kind: "PHASE"; phase: ProjectPhase; rect: Rect };

export const COL_W = 420;
export const PMC_TOP = 0;
export const PMC_HEADER = 40;
export const PMC_HEIGHT = 840;
export const LANES_TOP = PMC_TOP + PMC_HEIGHT + 64;
export const LANE_W = 300;
export const LANE_HEADER = 40;
export const CANVAS_W = Math.max(COL_W * PMC_LAYOUT.length, LANE_W * PROJECT_PHASES.length);

export const ITEM_SIZE: Record<"TASK" | "WBS" | "REQ" | "RISK" | "STK" | "NOTE", { w: number; h: number }> = {
  TASK: { w: 196, h: 60 },
  WBS: { w: 176, h: 44 },
  REQ: { w: 176, h: 44 },
  RISK: { w: 176, h: 44 },
  STK: { w: 176, h: 44 },
  NOTE: { w: 156, h: 60 },
};

export const refKind = (ref: CanvasRef) => ref.slice(0, ref.indexOf(":")) as keyof typeof ITEM_SIZE;
export const refId = (ref: CanvasRef) => ref.slice(ref.indexOf(":") + 1);
export const makeRef = (kind: keyof typeof ITEM_SIZE, id: string) => `${kind}:${id}` as CanvasRef;

/** Zonas do Project Model Canvas: colunas de 420; blocos repartem igualmente a altura útil da coluna. */
export function pmcZones(): Zone[] {
  const zones: Zone[] = [];
  PMC_LAYOUT.forEach((col, ci) => {
    const usable = PMC_HEIGHT - PMC_HEADER;
    const h = usable / col.blocks.length;
    col.blocks.forEach((block, bi) => {
      zones.push({ kind: "PMC", block, question: col.question, rect: { x: ci * COL_W, y: PMC_TOP + PMC_HEADER + bi * h, w: COL_W, h } });
    });
  });
  return zones;
}

/** Faixas de fase (colunas de 300) com altura que cresce para caber as atividades. */
export function phaseZones(laneHeight: number): Zone[] {
  return PROJECT_PHASES.map((phase, i) => ({ kind: "PHASE" as const, phase, rect: { x: i * LANE_W, y: LANES_TOP + LANE_HEADER, w: LANE_W, h: laneHeight } }));
}

export const contains = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Zona que contém o ponto (o centro do item, ao soltar). */
export function zoneAt(zones: readonly Zone[], x: number, y: number): Zone | null {
  return zones.find((z) => contains(z.rect, x, y)) ?? null;
}

/** k-ésima posição livre de uma grade dentro de um retângulo (auto-layout de itens sem posição salva). */
export function gridSlot(rect: Rect, k: number, size: { w: number; h: number }, pad = 12): { x: number; y: number } {
  const cols = Math.max(1, Math.floor((rect.w - pad) / (size.w + pad)));
  const col = k % cols;
  const row = Math.floor(k / cols);
  return { x: rect.x + pad + col * (size.w + pad), y: rect.y + pad + row * (size.h + pad) };
}

/** Altura necessária das faixas para caber `maxTasks` atividades empilhadas (mínimo 560). */
export function laneHeightFor(maxTasks: number): number {
  const s = ITEM_SIZE.TASK;
  const cols = Math.max(1, Math.floor((LANE_W - 12) / (s.w + 12)));
  return Math.max(560, 12 + Math.ceil(maxTasks / cols) * (s.h + 12) + 24);
}
