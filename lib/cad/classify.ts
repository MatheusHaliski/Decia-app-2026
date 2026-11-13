/**
 * Classificação determinística do item de obra pelo NOME (camada, bloco, malha, material). Regra explícita, sem IA: palavras em
 * português e inglês e abreviações de camada usuais (AIA "A-WALL", "S-COLS"; "ARQ-PAREDE", "EST-PILAR"). A primeira regra que
 * casa vence — as mais específicas (cota, texto, eixo, mobiliário) vêm antes das genéricas. Nada casou: OUTRO, e a pessoa decide.
 */
import type { ItemKind, QtyUnit, StageId } from "./types";

interface Rule {
  kind: ItemKind;
  /** começo de palavra no nome normalizado (sem acento, maiúsculo, separadores viram espaço): "PAREDE" casa "PAREDES", não "IMPAREDE" */
  words?: readonly string[];
  /** termos que precisam ser uma palavra inteira (abreviações curtas) */
  tokens?: readonly string[];
}

const RULES: readonly Rule[] = [
  { kind: "COTA", words: ["COTA", "DIMENS"], tokens: ["DIM", "DIMS", "COT"] },
  { kind: "TEXTO", words: ["TEXTO", "TEXT", "ANOTA", "ANNO", "LEGENDA", "CARIMBO", "TITLE"], tokens: ["TXT", "SELO"] },
  { kind: "EIXO", words: ["EIXO", "GRID", "DEFPOINTS", "VIEWPORT", "AUXILIAR"], tokens: ["AUX", "VPORT", "AXIS"] },
  { kind: "MOBILIARIO", words: ["MOBILI", "MOVEIS", "MOVEL", "FURN", "LAYOUT"] },
  { kind: "LOUCA", words: ["LOUCA", "BACIA", "LAVATORIO", "CUBA", "MICTORIO", "CHUVEIRO", "TOILET", "SINK", "FIXTURE"], tokens: ["PIA", "VASO", "FIXT"] },
  { kind: "LUMINARIA", words: ["LUMINARIA", "ILUMINA", "LIGHT", "LAMP"], tokens: ["LUM", "ILUM", "LITE"] },
  { kind: "TOMADA", words: ["TOMADA", "OUTLET", "RECEPT"], tokens: ["TUG", "TUE", "TOM", "POWR"] },
  { kind: "INTERRUPTOR", words: ["INTERRUPTOR", "SWITCH"] },
  { kind: "ELETRODUTO", words: ["ELETRODUTO", "CONDUIT", "ELETRIC", "ELECTRIC"], tokens: ["ELE", "ELET"] },
  { kind: "TUBULACAO", words: ["TUBULAC", "TUBO", "HIDRAUL", "HIDRO", "ESGOTO", "PLUVIAL", "AGUA FRIA", "AGUA QUENTE", "PIPE", "PLUMB"], tokens: ["HID", "ESG", "AF", "AQ"] },
  { kind: "PORTA", words: ["PORTA", "DOOR", "PORTAO"] },
  { kind: "JANELA", words: ["JANELA", "WINDOW", "BASCULANTE", "CAIXILHO", "VENEZIANA", "GLAZ", "ESQUADRIA"], tokens: ["JAN"] },
  { kind: "GUARDA_CORPO", words: ["GUARDA CORPO", "GUARDACORPO", "CORRIMAO", "RAILING", "HANDRAIL", "PARAPEITO"] },
  { kind: "ESCADA", words: ["ESCADA", "STAIR", "DEGRAU"] },
  { kind: "FUNDACAO", words: ["FUNDACAO", "SAPATA", "ESTACA", "BALDRAME", "RADIER", "TUBULAO", "FOOTING", "FOUNDATION"], tokens: ["FUND", "PILE"] },
  { kind: "PILAR", words: ["PILAR", "COLUMN", "COLUNA"], tokens: ["PIL", "COLS"] },
  { kind: "VIGA", words: ["VIGA", "BEAM"], tokens: ["VIG"] },
  { kind: "LAJE", words: ["LAJE", "SLAB"], tokens: ["LAJ"] },
  { kind: "COBERTURA", words: ["COBERTURA", "TELHADO", "TELHA", "ROOF", "CUMEEIRA"], tokens: ["COB"] },
  { kind: "FORRO", words: ["FORRO", "CEILING"], tokens: ["CLNG", "TETO"] },
  { kind: "PISO", words: ["PISO", "FLOOR", "PAVIMENTA", "CONTRAPISO", "PORCELANATO", "CERAMIC"] },
  { kind: "REVESTIMENTO", words: ["REVESTIMENTO", "REBOCO", "AZULEJO", "PINTURA", "CLADDING", "ACABAMENTO", "FINISH"] },
  { kind: "AMBIENTE", words: ["AMBIENTE", "ROOM", "SPACE", "COMPARTIMENTO"], tokens: ["AMB", "AREA", "AREAS"] },
  { kind: "PAREDE", words: ["PAREDE", "ALVENARIA", "WALL", "DIVISORIA", "DRYWALL", "MURO"], tokens: ["ALV", "PAR"] },
];

/** Sem acento, maiúsculo, separadores (-_./|) viram espaço. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function match(name: string): ItemKind | null {
  const n = normalizeName(name);
  if (!n) return null;
  const tokens = new Set(n.split(" "));
  const spaced = ` ${n} `;
  for (const r of RULES) {
    if (r.words?.some((w) => spaced.includes(` ${w}`))) return r.kind;
    if (r.tokens?.some((tk) => tokens.has(tk))) return r.kind;
  }
  return null;
}

/** Primeiro nome que casa uma regra decide (ex.: nome do bloco antes da camada dele). */
export function classifyName(...names: (string | null | undefined)[]): ItemKind {
  for (const name of names) {
    if (!name) continue;
    const k = match(name);
    if (k) return k;
  }
  return "OUTRO";
}

/** Camada sem nome útil: "0", vazia ou genérica ("Layer1", "Camada 2", "Nova camada"). */
export function isUnnamedLayer(name: string): boolean {
  const n = normalizeName(name);
  return n === "" || n === "0" || /^(LAYER|CAMADA|NOVA CAMADA|NEW LAYER|CAPA)( ?\d+)?$/.test(n);
}

/** Etapa da obra de cada classe de item (null = não entra no orçamento: cota, texto, eixo, mobiliário, outro). */
export const KIND_STAGE: Record<ItemKind, StageId | null> = {
  FUNDACAO: "FUNDACAO",
  PILAR: "ESTRUTURA",
  VIGA: "ESTRUTURA",
  LAJE: "ESTRUTURA",
  ESCADA: "ESTRUTURA",
  PAREDE: "ALVENARIA",
  COBERTURA: "COBERTURA",
  LUMINARIA: "INSTALACOES",
  TOMADA: "INSTALACOES",
  INTERRUPTOR: "INSTALACOES",
  LOUCA: "INSTALACOES",
  TUBULACAO: "INSTALACOES",
  ELETRODUTO: "INSTALACOES",
  PORTA: "REVESTIMENTOS",
  JANELA: "REVESTIMENTOS",
  GUARDA_CORPO: "REVESTIMENTOS",
  AMBIENTE: "REVESTIMENTOS",
  PISO: "REVESTIMENTOS",
  FORRO: "REVESTIMENTOS",
  REVESTIMENTO: "REVESTIMENTOS",
  MOBILIARIO: null,
  COTA: null,
  TEXTO: null,
  EIXO: null,
  OUTRO: null,
};

/** Combinações (classe, unidade) que entram na planilha por padrão — a pessoa marca/desmarca o resto. */
const DEFAULT_INCLUDED: Record<QtyUnit, readonly ItemKind[]> = {
  un: ["PORTA", "JANELA", "LUMINARIA", "TOMADA", "INTERRUPTOR", "LOUCA", "ESCADA"],
  m: ["TUBULACAO", "ELETRODUTO", "GUARDA_CORPO"],
  m2: ["PAREDE", "AMBIENTE", "PISO", "FORRO", "REVESTIMENTO", "COBERTURA", "LAJE"],
  m3: ["FUNDACAO", "PILAR", "VIGA", "LAJE"],
};

export const includedByDefault = (kind: ItemKind, unit: QtyUnit) => DEFAULT_INCLUDED[unit].includes(kind);
