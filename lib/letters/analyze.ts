/**
 * Análise do documento inteiro (RF53 + RF54): tokeniza e etiqueta cada bloco, aplica as regras gramaticais, de pessoa
 * e voz, de citações e de coerência, monta os achados com chave estável, o placar por bloco e o resumo. A análise é
 * ancorada à revisão e à versão da política que a pediram (RF53.CA06: achado de revisão antiga não é reaproveitado).
 * Só o pt-BR tem recursos; outro idioma devolve `supported: false` sem aplicar regra portuguesa (RF53.CA05).
 */
import { analyzeCitations, type CitationReport } from "./citations";
import { analyzeCoherence, type CoherenceReport } from "./coherence";
import { toFindings, type BlockCtx, type RawFinding } from "./findings";
import { grammarFindings, sentenceWordCount } from "./grammar";
import { analyzeMorphology } from "./morph";
import { scoreBlocks, type AnalysisSummary, type BlockScore } from "./score";
import { quotedSpans, wordCount } from "./text";
import { PARTS_OF_SPEECH, type DocType, type Finding, type LetterBlock, type PartOfSpeech, type TaggedSentence, type TaggedToken, type TextGenre, type TextLanguage } from "./types";
import { passiveFindings, passiveSpans, treatmentFindings } from "./verbal";

export const ANALYZER_VERSION = "letters-heuristica-1.0.0";
/** limite de cobertura: blocos além de 20 000 palavras ficam fora e o relatório diz quais (RF54.CA07) */
export const WORD_LIMIT = 20_000;

export interface AnalyzeOptions {
  revision: number;
  policyVersion: number;
  genre: TextGenre;
  docType: DocType;
  language: TextLanguage;
  wordLimit?: number;
}

export interface BlockAnalysis {
  blockId: string;
  kind: LetterBlock["kind"];
  tokens: TaggedToken[];
  sentences: TaggedSentence[];
  words: number;
}

export interface Coverage {
  analyzedBlockIds: string[];
  skippedBlockIds: string[];
  wordLimit: number;
  words: number;
  truncated: boolean;
}

export interface AnalysisResult {
  analyzerVersion: string;
  revision: number;
  policyVersion: number;
  genre: TextGenre;
  docType: DocType;
  language: TextLanguage;
  supported: boolean;
  blocks: BlockAnalysis[];
  findings: Finding[];
  coherence: CoherenceReport | null;
  citations: CitationReport | null;
  scores: BlockScore[];
  summary: AnalysisSummary;
  coverage: Coverage;
}

const emptySummary = (): AnalysisSummary => ({
  words: 0,
  sentences: 0,
  blocks: 0,
  avgSentenceWords: 0,
  longSentences: 0,
  passiveSentences: 0,
  bySeverity: { ERRO: 0, AVISO: 0, SUGESTAO: 0 },
  byTab: { GRAMATICA: 0, MORFOSSINTAXE: 0, COERENCIA: 0, CITACOES: 0 },
  taggedTokens: 0,
  ambiguousTokens: 0,
  posCounts: Object.fromEntries(PARTS_OF_SPEECH.map((p) => [p, 0])) as Record<PartOfSpeech, number>,
  connectives: 0,
  citations: 0,
  references: 0,
  uncitedReferences: 0,
  missingSections: [],
  safeFixes: 0,
});

export function analyzeDocument(blocks: readonly LetterBlock[], opts: AnalyzeOptions): AnalysisResult {
  const wordLimit = opts.wordLimit ?? WORD_LIMIT;
  const base = { analyzerVersion: ANALYZER_VERSION, revision: opts.revision, policyVersion: opts.policyVersion, genre: opts.genre, docType: opts.docType, language: opts.language };
  if (opts.language !== "pt-BR") {
    return { ...base, supported: false, blocks: [], findings: [], coherence: null, citations: null, scores: [], summary: emptySummary(), coverage: { analyzedBlockIds: [], skippedBlockIds: blocks.map((b) => b.id), wordLimit, words: 0, truncated: false } };
  }

  // cobertura: para no limite de palavras
  const analyzed: LetterBlock[] = [];
  const skipped: string[] = [];
  let words = 0;
  for (const b of blocks) {
    const w = wordCount(b.text);
    if (words + w > wordLimit && analyzed.length) { skipped.push(b.id); continue; }
    words += w;
    analyzed.push(b);
  }

  const ctxs: BlockCtx[] = analyzed.map((block) => {
    const { tokens, sentences } = analyzeMorphology(block.text, { inTitle: block.kind === "TITULO" });
    return { block, text: block.text, tokens, sentences, quoted: quotedSpans(block.text), genre: opts.genre };
  });

  const raw = new Map<string | null, RawFinding[]>();
  const push = (blockId: string | null, r: RawFinding) => raw.set(blockId, [...(raw.get(blockId) ?? []), r]);
  for (const c of ctxs) {
    for (const r of grammarFindings(c)) push(c.block.id, r);
    for (const r of passiveFindings(c)) push(c.block.id, r);
  }
  for (const { blockId, raw: r } of treatmentFindings(ctxs)) push(blockId, r);
  const citations = analyzeCitations(analyzed);
  for (const { blockId, raw: r } of citations.findings) push(blockId, r);
  const coherence = analyzeCoherence(ctxs, { docType: opts.docType, genre: opts.genre, citations: citations.citations.length, words });
  for (const { blockId, raw: r } of coherence.findings) push(blockId, r);

  const order = new Map(analyzed.map((b, i) => [b.id, i]));
  const findings = [...raw.entries()]
    .flatMap(([blockId, list]) => toFindings(list, blockId, blockId ? (analyzed.find((b) => b.id === blockId)?.text ?? "") : ""))
    .sort((a, b) => (a.blockId === null ? -1 : order.get(a.blockId) ?? 0) - (b.blockId === null ? -1 : order.get(b.blockId) ?? 0) || a.start - b.start || a.end - b.end);

  const blockAnalyses: BlockAnalysis[] = ctxs.map((c) => ({ blockId: c.block.id, kind: c.block.kind, tokens: c.tokens, sentences: c.sentences, words: wordCount(c.text) }));
  const scores = scoreBlocks(blockAnalyses, findings);

  const summary = emptySummary();
  summary.words = words;
  summary.blocks = analyzed.length;
  const prose = ctxs.filter((c) => c.block.kind === "PARAGRAFO" || c.block.kind === "LISTA");
  const proseSentences = prose.flatMap((c) => c.sentences);
  summary.sentences = proseSentences.length;
  summary.avgSentenceWords = proseSentences.length ? Math.round((proseSentences.reduce((s, x) => s + sentenceWordCount(x), 0) / proseSentences.length) * 10) / 10 : 0;
  summary.longSentences = findings.filter((f) => f.ruleId === "FRASE_LONGA").length;
  summary.passiveSentences = prose.reduce((s, c) => s + new Set(passiveSpans(c).map((p) => p.sentence)).size, 0);
  for (const f of findings) {
    summary.bySeverity[f.severity]++;
    summary.byTab[f.tab]++;
    if (f.replacement !== null) summary.safeFixes++;
  }
  for (const c of ctxs) {
    for (const t of c.tokens) {
      if (t.kind !== "PALAVRA" && t.kind !== "SIGLA" && t.kind !== "NUMERO") continue;
      summary.taggedTokens++;
      if (t.pos) summary.posCounts[t.pos]++;
      else if (t.ambiguous) summary.ambiguousTokens++;
    }
  }
  summary.connectives = coherence.connectives.length;
  summary.citations = citations.citations.length;
  summary.references = citations.references.length;
  summary.uncitedReferences = citations.references.filter((r) => !r.cited).length;
  summary.missingSections = coherence.sections.filter((s) => !s.present).map((s) => s.key);

  return {
    ...base,
    supported: true,
    blocks: blockAnalyses,
    findings,
    coherence,
    citations,
    scores,
    summary,
    coverage: { analyzedBlockIds: analyzed.map((b) => b.id), skippedBlockIds: skipped, wordLimit, words, truncated: skipped.length > 0 },
  };
}

/** Achados visíveis: tira os ignorados (com motivo) da peça. */
export function visibleFindings(findings: readonly Finding[], ignoredKeys: ReadonlySet<string>): Finding[] {
  return findings.filter((f) => !ignoredKeys.has(f.key));
}
