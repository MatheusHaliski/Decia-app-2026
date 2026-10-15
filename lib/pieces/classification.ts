/**
 * Taxonomia de classificação de desenhos (facets opcionais). Campo ausente = "não avaliado": nunca há valor padrão.
 * Separada de `AccessClassification` (acesso). Vocabulários externos (Getty AAT, VRA Core) são mapeados por `termId`.
 */
export const TAXONOMY_VERSION = "1.0.0";

export const CLASSIFICATION_SOURCES = ["HUMAN", "AI_SUGGESTED", "AI_CONFIRMED", "DERIVED"] as const;
export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

export const VOCABULARIES = {
  technique: ["GRAFITE", "NANQUIM", "AQUARELA", "DIGITAL_VETORIAL", "DIGITAL_RASTER", "TRES_D", "COLAGEM", "MISTO"],
  genre: ["RETRATO", "FIGURA_HUMANA", "PAISAGEM", "NATUREZA_MORTA", "ARQUITETURA", "ABSTRATO", "NARRATIVO"],
  purpose: ["CROQUI", "ESTUDO", "ILUSTRACAO", "PROJETO_TECNICO", "STORYBOARD", "CONCEPT_ART", "ANOTACAO"],
  projection: ["PLANA", "UM_PONTO_DE_FUGA", "DOIS_PONTOS_DE_FUGA", "TRES_PONTOS_DE_FUGA", "ISOMETRICA", "ORTOGONAL", "AXONOMETRICA", "SEM_SISTEMA"],
  finish: ["ESBOCO", "EM_DESENVOLVIMENTO", "FINALIZADO", "PRONTO_PARA_IMPRESSAO"],
  support: ["PAPEL", "TELA", "DIGITAL"],
  balance: ["SIMETRICO", "ASSIMETRICO", "RADIAL"],
} as const;
export type VocabularyKey = keyof typeof VOCABULARIES;

export interface ClassifiedField<V extends string = string> {
  value: V;
  vocabulary: string;
  termId?: string;
  source: ClassificationSource;
  /** 0..1; obrigatório fora de HUMAN */
  confidence?: number;
  rubricVersion?: string;
  evaluatedAt?: string;
}

/** Abstração/figuração: escala ordinal 1 (figurativo) … 5 (abstrato). */
export type AbstractionLevel = 1 | 2 | 3 | 4 | 5;

export interface DrawingClassification {
  taxonomyVersion: string;
  technique?: ClassifiedField<(typeof VOCABULARIES.technique)[number]>;
  genre?: ClassifiedField<(typeof VOCABULARIES.genre)[number]>;
  purpose?: ClassifiedField<(typeof VOCABULARIES.purpose)[number]>;
  projection?: ClassifiedField<(typeof VOCABULARIES.projection)[number]>;
  finish?: ClassifiedField<(typeof VOCABULARIES.finish)[number]>;
  support?: ClassifiedField<(typeof VOCABULARIES.support)[number]>;
  balance?: ClassifiedField<(typeof VOCABULARIES.balance)[number]>;
  abstraction?: ClassifiedField<`${AbstractionLevel}`>;
  styleMovement?: ClassifiedField;
  intent?: { objective: string; stages?: readonly string[]; references?: readonly string[] };
  scale?: { unit: string; ratio?: string };
  accessibility?: { altText?: string; longDescription?: string; contrastRatio?: number };
}

/** Valida uma classificação; devolve lista de problemas (vazia = válida). */
export function validateClassification(c: DrawingClassification): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(VOCABULARIES) as VocabularyKey[]) {
    const f = c[key] as ClassifiedField | undefined;
    if (!f) continue;
    if (!(VOCABULARIES[key] as readonly string[]).includes(f.value)) errors.push(`${key}: valor fora do vocabulário`);
    errors.push(...checkField(key, f));
  }
  if (c.abstraction) {
    if (!["1", "2", "3", "4", "5"].includes(c.abstraction.value)) errors.push("abstraction: valor fora de 1..5");
    errors.push(...checkField("abstraction", c.abstraction));
  }
  if (c.styleMovement) errors.push(...checkField("styleMovement", c.styleMovement));
  if (c.accessibility?.contrastRatio !== undefined && !(c.accessibility.contrastRatio >= 1)) errors.push("accessibility: contraste inválido");
  return errors;
}

function checkField(key: string, f: ClassifiedField): string[] {
  const e: string[] = [];
  if (!CLASSIFICATION_SOURCES.includes(f.source)) e.push(`${key}: origem inválida`);
  if (f.source !== "HUMAN" && f.source !== "DERIVED" && (f.confidence === undefined || f.confidence < 0 || f.confidence > 1)) e.push(`${key}: confiança 0..1 obrigatória para IA`);
  return e;
}
