/**
 * Letters — tipos do copiloto linguístico e narrativo (RF52 mínimo, RF53, RF54). O motor é heurístico, local e
 * determinístico (origin `HEURISTICA`): nenhuma chamada a modelo externo; a "IA" da tela só reescreve o que as regras
 * apontaram (D-12). Posições são sempre [start, end) no texto do bloco.
 */

/** As dez classes de palavras do português (RF53.CA01). */
export const PARTS_OF_SPEECH = [
  "SUBSTANTIVO",
  "ADJETIVO",
  "VERBO",
  "ADVERBIO",
  "PRONOME",
  "ARTIGO",
  "PREPOSICAO",
  "CONJUNCAO",
  "NUMERAL",
  "INTERJEICAO",
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export type Tempo =
  | "PRESENTE"
  | "PRETERITO_PERFEITO"
  | "PRETERITO_IMPERFEITO"
  | "PRETERITO_MAIS_QUE_PERFEITO"
  | "FUTURO_DO_PRESENTE"
  | "FUTURO_DO_PRETERITO"
  | "FUTURO";
export type Modo = "INDICATIVO" | "SUBJUNTIVO" | "IMPERATIVO";
export type FormaNominal = "INFINITIVO" | "GERUNDIO" | "PARTICIPIO";
export type Numero = "SG" | "PL";

/** Uma leitura verbal possível (tempo/modo/pessoa ou forma nominal). */
export interface VerbReading {
  lemma: string;
  tempo?: Tempo;
  modo?: Modo;
  pessoa?: 1 | 2 | 3;
  numero?: Numero;
  forma?: FormaNominal;
}

/**
 * Traços verbais afirmados: só aparecem os que TODAS as leituras compartilham (nunca se afirma o que é ambíguo);
 * `tempos`/`modos` listam as alternativas quando o tempo ou o modo não pode ser afirmado.
 */
export interface VerbFeatures {
  lemma: string;
  tempo?: Tempo;
  modo?: Modo;
  pessoa?: 1 | 2 | 3;
  numero?: Numero;
  forma?: FormaNominal;
  tempos: Tempo[];
  modos: Modo[];
}

export type TokenKind = "PALAVRA" | "NUMERO" | "SIGLA" | "PONTUACAO" | "URL" | "SIMBOLO";

export interface Token {
  /** índice no bloco */
  i: number;
  text: string;
  start: number;
  end: number;
  kind: TokenKind;
  /** minúsculas, com acentos */
  lower: string;
  /** minúsculas sem acentos */
  key: string;
  sentence: number;
  /** contração/combinação de preposição com artigo ou pronome: "do" = de + o */
  contraction?: readonly [string, string];
  /** primeira letra maiúscula */
  capitalized: boolean;
}

export interface Sentence {
  index: number;
  start: number;
  end: number;
  text: string;
  tokens: Token[];
}

export type TagReason =
  | "LEXICO"
  | "LOCUCAO"
  | "VERBO_CONHECIDO"
  | "SUFIXO"
  | "CONTEXTO"
  | "NOME_PROPRIO"
  | "SIGLA"
  | "NUMERO"
  | "PADRAO";

/** Classe atribuída a um token. `pos` é null quando ambígua (abaixo do limiar) ou quando não é palavra. */
export interface TaggedToken extends Token {
  pos: PartOfSpeech | null;
  /** true quando a classe não pode ser afirmada: `candidates` traz as hipóteses em ordem */
  ambiguous: boolean;
  candidates: { pos: PartOfSpeech; p: number }[];
  /** 0..1 — probabilidade heurística da classe escolhida (ou da melhor hipótese, se ambígua) */
  confidence: number;
  reason: TagReason;
  /** subtipo: definido, indefinido, pessoal, possessivo, demonstrativo, relativo, próprio, sigla, cardinal… */
  sub?: string;
  verb?: VerbFeatures;
  locution?: string;
}

/** Limiar para afirmar uma classe; abaixo dele o token é marcado "ambíguo". */
export const ASSERT_THRESHOLD = 0.6;

/* ── Documento ─────────────────────────────────────────────────────────────────────────────────────────── */

export const BLOCK_KINDS = ["TITULO", "PARAGRAFO", "LISTA", "CITACAO", "REFERENCIAS"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export interface LetterBlock {
  /** identificador estável (RF52.CA01) */
  id: string;
  kind: BlockKind;
  text: string;
  /** nível do título (1–3) */
  level?: 1 | 2 | 3;
  /** chave i18n da dica do bloco vazio (modelos) */
  hintKey?: string;
}

export const DOC_TYPES = ["RELATORIO_TECNICO", "PARECER", "OFICIO", "ADR", "LIVRE"] as const;
export type DocType = (typeof DOC_TYPES)[number];

/** Gêneros do RF54.CA01. */
export const TEXT_GENRES = ["TECNICO", "ACADEMICO", "JORNALISTICO", "NARRATIVO"] as const;
export type TextGenre = (typeof TEXT_GENRES)[number];

/** Idiomas do texto: só o pt-BR tem recursos (RF53.CA05); os outros informam indisponibilidade. */
export const TEXT_LANGUAGES = ["pt-BR", "en", "es"] as const;
export type TextLanguage = (typeof TEXT_LANGUAGES)[number];

/* ── Achados ───────────────────────────────────────────────────────────────────────────────────────────── */

export type Severity = "ERRO" | "AVISO" | "SUGESTAO";
export type CopilotTab = "GRAMATICA" | "MORFOSSINTAXE" | "COERENCIA" | "CITACOES";
export type FindingCategory =
  | "CRASE"
  | "CONCORDANCIA"
  | "REGENCIA"
  | "USO"
  | "PLEONASMO"
  | "PONTUACAO"
  | "ESTILO"
  | "TRATAMENTO"
  | "REGISTRO"
  | "COESAO"
  | "PROGRESSAO"
  | "TEMPO_VERBAL"
  | "ESTRUTURA"
  | "SUBJETIVIDADE"
  | "CONTINUIDADE"
  | "CITACAO"
  | "REFERENCIA";

/** Grau de certeza (RF54.CA04): contradição demonstrável × hipótese × contexto insuficiente. */
export type Certainty = "DEMONSTRAVEL" | "HIPOTESE" | "CONTEXTO_INSUFICIENTE";

export interface Anchor {
  blockId: string;
  start: number;
  end: number;
  excerpt: string;
}

export interface Finding {
  /** único na análise */
  id: string;
  /** estável entre revisões (regra + bloco + trecho + ocorrência): usado para "ignorar com motivo" */
  key: string;
  ruleId: string;
  category: FindingCategory;
  tab: CopilotTab;
  severity: Severity;
  /** null = achado do documento inteiro (ex.: seção ausente) */
  blockId: string | null;
  start: number;
  end: number;
  excerpt: string;
  /** correção segura de um clique para [start, end) — null quando não há correção segura */
  replacement: string | null;
  /** alternativas (a primeira é a correção segura, quando houver) */
  suggestions: string[];
  vars: Record<string, string | number>;
  confidence: number;
  certainty: Certainty;
  origin: "HEURISTICA";
  /** segunda âncora (ano divergente, continuidade narrativa…) */
  related?: Anchor[];
}

export type IgnoreReason = "FALSO_POSITIVO" | "NOME_PROPRIO" | "ESTILO_INTENCIONAL" | "VARIEDADE_REGIONAL" | "CITACAO_LITERAL" | "OUTRO";
export const IGNORE_REASONS: readonly IgnoreReason[] = ["FALSO_POSITIVO", "NOME_PROPRIO", "ESTILO_INTENCIONAL", "VARIEDADE_REGIONAL", "CITACAO_LITERAL", "OUTRO"];

export interface IgnoredFinding {
  key: string;
  ruleId: string;
  excerpt: string;
  reason: IgnoreReason;
  note?: string;
  at: string;
}
