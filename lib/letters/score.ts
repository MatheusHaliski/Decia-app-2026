/**
 * Placar por bloco (mapa de calor) e resumo do documento (RF54.CA05): é uma CONTAGEM ponderada de achados por 100
 * palavras, com rubrica e versão declaradas — heurística, não nota calibrada de IA. Os níveis 0–4 têm nome em texto.
 */
import type { FindingCategory, Finding, PartOfSpeech, Severity, CopilotTab } from "./types";

export const HEAT_RUBRIC_VERSION = "letters-calor-1";
export const HEAT_DIMENSIONS = ["GRAMATICA", "ESTILO", "COERENCIA", "CITACOES"] as const;
export type HeatDimension = (typeof HEAT_DIMENSIONS)[number];
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export const SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = { ERRO: 3, AVISO: 2, SUGESTAO: 1 };
/** limites de densidade (peso por 100 palavras) de cada nível: ≤ 3 leve, ≤ 8 moderado, ≤ 15 alto, > 15 crítico */
export const HEAT_THRESHOLDS = [3, 8, 15] as const;
/** blocos curtos contam como 25 palavras (evita que um título com um achado vire "crítico") */
export const MIN_WORDS_FOR_DENSITY = 25;

export const CATEGORY_DIMENSION: Readonly<Record<FindingCategory, HeatDimension>> = {
  CRASE: "GRAMATICA",
  CONCORDANCIA: "GRAMATICA",
  REGENCIA: "GRAMATICA",
  USO: "GRAMATICA",
  PONTUACAO: "GRAMATICA",
  PLEONASMO: "ESTILO",
  ESTILO: "ESTILO",
  TRATAMENTO: "ESTILO",
  REGISTRO: "ESTILO",
  COESAO: "COERENCIA",
  PROGRESSAO: "COERENCIA",
  TEMPO_VERBAL: "COERENCIA",
  ESTRUTURA: "COERENCIA",
  SUBJETIVIDADE: "COERENCIA",
  CONTINUIDADE: "COERENCIA",
  CITACAO: "CITACOES",
  REFERENCIA: "CITACOES",
};

export function heatLevel(weight: number, words: number): HeatLevel {
  if (weight <= 0) return 0;
  const density = (weight * 100) / Math.max(words, MIN_WORDS_FOR_DENSITY);
  if (density <= HEAT_THRESHOLDS[0]) return 1;
  if (density <= HEAT_THRESHOLDS[1]) return 2;
  if (density <= HEAT_THRESHOLDS[2]) return 3;
  return 4;
}

export interface BlockScore {
  blockId: string;
  words: number;
  findings: number;
  bySeverity: Record<Severity, number>;
  weight: number;
  /** peso por 100 palavras (arredondado a 0,1) */
  density: number;
  level: HeatLevel;
  dims: Record<HeatDimension, { weight: number; level: HeatLevel; count: number }>;
}

export function scoreBlocks(blocks: readonly { blockId: string; words: number }[], findings: readonly Finding[]): BlockScore[] {
  return blocks.map(({ blockId, words }) => {
    const own = findings.filter((f) => f.blockId === blockId);
    const bySeverity: Record<Severity, number> = { ERRO: 0, AVISO: 0, SUGESTAO: 0 };
    const dims = Object.fromEntries(HEAT_DIMENSIONS.map((d) => [d, { weight: 0, level: 0 as HeatLevel, count: 0 }])) as BlockScore["dims"];
    let weight = 0;
    for (const f of own) {
      bySeverity[f.severity]++;
      const w = SEVERITY_WEIGHT[f.severity];
      weight += w;
      const d = dims[CATEGORY_DIMENSION[f.category]];
      d.weight += w;
      d.count++;
    }
    for (const d of HEAT_DIMENSIONS) dims[d].level = heatLevel(dims[d].weight, words);
    return {
      blockId,
      words,
      findings: own.length,
      bySeverity,
      weight,
      density: Math.round(((weight * 100) / Math.max(words, MIN_WORDS_FOR_DENSITY)) * 10) / 10,
      level: heatLevel(weight, words),
      dims,
    };
  });
}

export interface AnalysisSummary {
  words: number;
  sentences: number;
  blocks: number;
  avgSentenceWords: number;
  longSentences: number;
  passiveSentences: number;
  bySeverity: Record<Severity, number>;
  byTab: Record<CopilotTab, number>;
  taggedTokens: number;
  ambiguousTokens: number;
  posCounts: Record<PartOfSpeech, number>;
  connectives: number;
  citations: number;
  references: number;
  uncitedReferences: number;
  missingSections: string[];
  /** achados com correção segura de um clique */
  safeFixes: number;
}
