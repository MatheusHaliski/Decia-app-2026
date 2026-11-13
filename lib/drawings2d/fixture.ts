/**
 * Peça de demonstração do Drawings 2D (DEMO): fachada frontal de um sobrado em centímetros (1 unidade = 1 cm), com
 * quatro camadas (uma travada), regiões hierárquicas que ladrilham a folha e uma região por grupo (carimbo).
 * Imperfeições de propósito alimentam a prévia fantasma (RF74): Janela S2 3 cm abaixo das vizinhas, Janela T1 2 cm fora
 * da coluna, óculo fora da grade, contorno com lacuna de 6 cm, janela do térreo sem a simétrica e sem as cotas de altura.
 * Os textos do desenho são conteúdo da peça (exibidos como estão), não interface.
 */
import type { Drawing2D, Shape2D } from "./model";

export const DEMO_PIECE_ID = "demo-fachada";

/** Colaboradora simulada (determinística) que reserva e edita na demonstração; marcada como simulada na tela. */
export const DEMO_BOT = { id: "sim-ana", name: "Ana" } as const;

const shape = (id: string, layerId: string, name: string, geom: Shape2D["geom"], group?: string): Shape2D => ({ id, layerId, name, geom, rev: 1, ...(group ? { group } : {}) });

export function demoDrawing(pieceId: string = DEMO_PIECE_ID): Drawing2D {
  return {
    pieceId,
    title: "Fachada frontal — Bloco B",
    revision: 1,
    width: 1100,
    height: 720,
    metersPerUnit: 0.01,
    grid: 10,
    layers: [
      { id: "base", name: "Base de referência", depth: 0, locked: true, tone: "referencia" },
      { id: "estrutura", name: "Estrutura", depth: 1, locked: false, tone: "estrutura" },
      { id: "esquadrias", name: "Esquadrias", depth: 2, locked: false, tone: "esquadria" },
      { id: "cotas", name: "Cotas e textos", depth: 3, locked: false, tone: "anotacao" },
    ],
    regions: [
      { id: "cobertura", name: "Cobertura", kind: "AREA", bounds: { x: 0, y: 0, width: 880, height: 260 } },
      { id: "fachada", name: "Fachada", kind: "AREA", bounds: { x: 0, y: 260, width: 880, height: 340 } },
      { id: "fachada/superior", name: "Pavimento superior", kind: "AREA", bounds: { x: 0, y: 260, width: 880, height: 160 } },
      { id: "fachada/terreo", name: "Térreo", kind: "AREA", bounds: { x: 0, y: 420, width: 880, height: 180 } },
      { id: "terreno", name: "Terreno", kind: "AREA", bounds: { x: 0, y: 600, width: 880, height: 120 } },
      { id: "margem", name: "Margem de cotas", kind: "AREA", bounds: { x: 880, y: 0, width: 220, height: 720 } },
      { id: "carimbo", name: "Carimbo", kind: "GRUPO" },
    ],
    shapes: [
      shape("s-terreno", "base", "Linha do terreno", { kind: "linha", a: { x: 40, y: 600 }, b: { x: 860, y: 600 } }),
      shape("s-contorno", "estrutura", "Contorno da fachada", {
        kind: "polilinha",
        points: [{ x: 120, y: 600 }, { x: 120, y: 260 }, { x: 760, y: 260 }, { x: 760, y: 600 }, { x: 126, y: 600 }],
        closed: false,
      }),
      shape("s-laje", "estrutura", "Laje do pavimento", { kind: "linha", a: { x: 120, y: 420 }, b: { x: 760, y: 420 } }),
      shape("s-telhado", "estrutura", "Telhado", { kind: "polilinha", points: [{ x: 96, y: 260 }, { x: 440, y: 120 }, { x: 784, y: 260 }], closed: false }),
      shape("s-js1", "esquadrias", "Janela S1", { kind: "retangulo", x: 170, y: 290, w: 90, h: 100 }),
      shape("s-js2", "esquadrias", "Janela S2", { kind: "retangulo", x: 395, y: 293, w: 90, h: 100 }),
      shape("s-js3", "esquadrias", "Janela S3", { kind: "retangulo", x: 620, y: 290, w: 90, h: 100 }),
      shape("s-oculo", "esquadrias", "Óculo", { kind: "circulo", cx: 440, cy: 204, r: 22 }),
      shape("s-porta", "esquadrias", "Porta", { kind: "retangulo", x: 390, y: 450, w: 100, h: 150 }),
      shape("s-jt1", "esquadrias", "Janela T1", { kind: "retangulo", x: 172, y: 470, w: 90, h: 90 }),
      shape("s-cota-largura", "cotas", "Cota da largura", { kind: "cota", a: { x: 120, y: 600 }, b: { x: 760, y: 600 }, offset: 50 }),
      shape("s-txt-superior", "cotas", "Rótulo do pavimento superior", { kind: "texto", x: 130, y: 410, text: "PAVIMENTO SUPERIOR", size: 12 }),
      shape("s-txt-terreo", "cotas", "Rótulo do térreo", { kind: "texto", x: 130, y: 590, text: "TÉRREO", size: 12 }),
      shape("s-carimbo-quadro", "cotas", "Quadro do carimbo", { kind: "retangulo", x: 900, y: 600, w: 180, h: 100 }, "carimbo"),
      shape("s-carimbo-titulo", "cotas", "Título do carimbo", { kind: "texto", x: 910, y: 630, text: "FACHADA FRONTAL — BLOCO B", size: 11 }, "carimbo"),
      shape("s-carimbo-escala", "cotas", "Escala do carimbo", { kind: "texto", x: 910, y: 655, text: "ESCALA 1:100 · cm", size: 10 }, "carimbo"),
      shape("s-carimbo-demo", "cotas", "Aviso do carimbo", { kind: "texto", x: 910, y: 680, text: "DEMONSTRAÇÃO — DADOS FICTÍCIOS", size: 9 }, "carimbo"),
    ],
  };
}

/** Camada ativa inicial: Esquadrias (onde está a maior parte das sugestões e a edição da colaboradora simulada). */
export const DEMO_START_LAYER = "esquadrias";
