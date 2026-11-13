/**
 * Memória Institucional (RF33) — tipos que ESTENDEM o contrato de `search.ts` (sem mudá-lo): origem do documento, público
 * restrito a pessoas (decisão PRIVADA do DECIA), filtros a mais e a explicação de cada resultado ("por que este trecho entrou").
 */
import type { MemoryDoc, MemoryHit, MemoryKind, MemorySearchOptions } from "./search";
import type { Span } from "./text";

export type AccessClass = MemoryDoc["accessClass"];
export const ACCESS_CLASSES: readonly AccessClass[] = ["PUBLICO", "INTERNO", "RESTRITO", "SIGILOSO"];

/** De onde o documento veio: corpus de exemplo, decisão encerrada do DECIA DEMO ou ingestão local nesta aba. */
export type MemoryOrigin = "EXEMPLO" | "DECIA" | "INGESTAO";

export interface MemoryDocument extends MemoryDoc {
  origin: MemoryOrigin;
  /** referência curta usada na citação ("Portaria 12/2025"); sem ela, o título */
  ref?: string;
  /** data do documento (AAAA-MM-DD) */
  date?: string | null;
  /** quando presente, só estas pessoas encontram o documento (ex.: decisão PRIVADA, visível aos participantes) */
  audience?: readonly string[];
  /** quem ingeriu (ingestão local) */
  addedBy?: string | null;
}

export interface MemoryQueryOptions extends MemorySearchOptions {
  /** quem consulta: libera documentos com `audience` que o incluam */
  viewerId?: string | null;
  /** unidades cujos documentos RESTRITO podem aparecer (com RESTRITO em `readable`); ausente = todas */
  restrictedTo?: readonly string[];
  /** trechos por documento (padrão 1: fontes distintas) */
  perDoc?: number;
}

export type MatchVia = "EXATO" | "SINONIMO" | "APROXIMADO";

/** Um termo da pergunta que casou com o trecho, e como. */
export interface TermMatch {
  /** palavra da pergunta */
  query: string;
  /** radical no índice */
  term: string;
  /** demais radicais de uma expressão de várias palavras (todos presentes no trecho) */
  also?: readonly string[];
  /** forma em que o termo aparece nos documentos */
  surface: string;
  via: MatchVia;
  weight: number;
  /** sinônimo aplicado ("ofício" ≈ "expediente") */
  synonym?: { from: string; to: string };
  /** semelhança de grafia (casamento aproximado) */
  similarity?: number;
}

export interface ScoreComponents {
  /** cosseno TF-IDF das palavras (radicais + sinônimos + aproximados) */
  cosineWords: number;
  /** cosseno dos n-gramas de caracteres por hashing */
  cosineChars: number;
  /** BM25 bruto (k1 = 1,2; b = 0,75) */
  bm25: number;
  /** BM25 normalizado 0–1 (1 = todos os termos da pergunta presentes num trecho de tamanho médio) */
  bm25Normalized: number;
}

export interface HitExplanation {
  matched: readonly TermMatch[];
  /** palavras da pergunta sem correspondência no índice (não somam, mas pesam contra) */
  unmatched: readonly string[];
  /** termos da pergunta atendidos pelo trecho */
  coverage: { matched: number; total: number };
  components: ScoreComponents;
  /** pesos da combinação híbrida */
  weights: { words: number; chars: number; bm25: number };
  /** partes do trecho a destacar (posições relativas ao início do trecho) */
  highlights: readonly Span[];
}

export interface ExplainedHit extends MemoryHit {
  accessClass: MemoryDoc["accessClass"];
  origin: MemoryOrigin;
  section: string | null;
  /** frases do trecho (posições absolutas no documento), para a resposta escolher a mais pertinente */
  sentences: readonly Span[];
  explanation: HitExplanation;
}

export interface QuerySlot {
  /** palavra da pergunta */
  query: string;
  stem: string;
  expansions: readonly { term: string; also?: readonly string[]; via: MatchVia; weight: number; surface: string; synonym?: { from: string; to: string }; similarity?: number }[];
}

export interface QueryAnalysis {
  /** pergunta efetivamente usada (aparada e limitada) */
  text: string;
  slots: readonly QuerySlot[];
  /** palavras sem correspondência no índice */
  unknown: readonly string[];
}

export interface SearchResult {
  query: QueryAnalysis;
  hits: readonly ExplainedHit[];
}

export type { MemoryDoc, MemoryHit, MemoryKind, MemorySearchOptions };
