/**
 * Memória Institucional (RF33) — índice vetorial DETERMINÍSTICO, local e sem serviço externo (D-12, D-127, Q-21).
 *
 * Indexação: cada documento vira trechos = janelas de até 2 frases com sobreposição de 1 (posições exatas no texto; títulos só
 * rotulam a seção). Cada trecho guarda (a) vetor TF-IDF esparso dos radicais e (b) vetor TF-IDF esparso de trigramas de
 * caracteres por hashing (FNV-1a em 2^18 posições), ambos com norma 1, e (c) as frequências para o BM25.
 *
 * Consulta: a pergunta vira "termos" (radicais sem palavras vazias). Cada termo procura no índice (1) o próprio radical, (2)
 * sinônimos do serviço público (peso 0,6) e, se não existir no índice, (3) o radical mais parecido na grafia (Dice de trigramas
 * ≥ 0,6; peso 0,8 × semelhança) — "teletrabaho" acha "teletrabalho". Um trecho só concorre se contiver ao menos um desses
 * termos (sem evidência lexical, não há o que citar). Pontuação híbrida 0–1:
 *   score = 0,45 · cosseno(palavras) + 0,20 · cosseno(caracteres) + 0,35 · BM25 normalizado
 * Palavras da pergunta que o índice não conhece entram na norma com o peso médio, puxando a nota para baixo. Filtros (tipo,
 * departamento, exercício, classe de acesso, público restrito) são aplicados ANTES da pontuação: o que a pessoa não pode ler não
 * entra nem na contagem. Desempate estável: nota ↓, documento ↑, posição ↑.
 */
import { citationOf } from "./citation";
import { findSynonyms, SYNONYM_WEIGHT } from "./synonyms";
import { charGrams, contentTerms, diceSimilarity, gramBucket, isHeading, sectionLabelOf, sentences, type Span, type Term } from "./text";
import type { AccessClass, ExplainedHit, MatchVia, MemoryDocument, MemoryQueryOptions, QueryAnalysis, QuerySlot, SearchResult, TermMatch } from "./types";

export const SCORE_WEIGHTS = { words: 0.45, chars: 0.2, bm25: 0.35 } as const;
export const BM25 = { k1: 1.2, b: 0.75 } as const;
export const DEFAULT_K = 5;
export const DEFAULT_MIN_SCORE = 0.05;
export const DEFAULT_READABLE: readonly AccessClass[] = ["PUBLICO", "INTERNO"];
/** Pergunta: até 500 caracteres (RF33, `422 VALIDACAO details.question` no backend planejado). */
export const MAX_QUERY_LENGTH = 500;
/** Janela de frases por trecho e teto de tamanho (caracteres) para juntar duas frases. */
export const WINDOW_SENTENCES = 2;
export const MAX_PASSAGE_CHARS = 700;
export const FUZZY_MIN_SIMILARITY = 0.6;
export const FUZZY_WEIGHT = 0.8;

type SparseWords = Map<string, number>;
type SparseChars = Map<number, number>;

export interface IndexedPassage {
  docId: string;
  ordinal: number;
  start: number;
  end: number;
  section: string | null;
  sentences: readonly Span[];
  terms: readonly Term[];
  tf: ReadonlyMap<string, number>;
  length: number;
  wordVec: ReadonlyMap<string, number>;
  charVec: ReadonlyMap<number, number>;
}

export interface MemoryIndex {
  docs: ReadonlyMap<string, MemoryDocument>;
  passages: readonly IndexedPassage[];
  df: ReadonlyMap<string, number>;
  charDf: ReadonlyMap<number, number>;
  /** radical → forma como apareceu primeiro (para explicar "ofício ≈ expediente") */
  surface: ReadonlyMap<string, string>;
  vocabulary: readonly string[];
  n: number;
  avgLength: number;
  meanIdf: number;
  meanBm25Idf: number;
}

const tfWeight = (tf: number) => (tf > 0 ? 1 + Math.log(tf) : 0);
const idfOf = (n: number, df: number) => Math.log((n + 1) / (df + 1)) + 1;
const bm25IdfOf = (n: number, df: number) => Math.log(1 + (n - df + 0.5) / (df + 0.5));

function normalize<K>(vec: Map<K, number>): Map<K, number> {
  let sq = 0;
  for (const v of vec.values()) sq += v * v;
  const norm = Math.sqrt(sq);
  if (!norm) return vec;
  for (const [k, v] of vec) vec.set(k, v / norm);
  return vec;
}

/** Trechos de um documento: janelas de frases dentro de cada seção, com posições exatas. */
export function passagesOf(doc: MemoryDocument): { start: number; end: number; section: string | null; sentences: Span[] }[] {
  const all = sentences(doc.body);
  const sections: { label: string | null; items: Span[] }[] = [{ label: null, items: [] }];
  for (const s of all) {
    if (isHeading(doc.body, s)) {
      const line = doc.body.slice(s.start, s.end);
      // "# Título" é o nome do documento; só "##" em diante rotula seção
      sections.push({ label: /^#\s/.test(line) ? null : sectionLabelOf(line), items: [] });
      continue;
    }
    sections[sections.length - 1]!.items.push(s);
  }
  const out: { start: number; end: number; section: string | null; sentences: Span[] }[] = [];
  for (const sec of sections) {
    const items = sec.items;
    const emit = (group: Span[]) => {
      const first = group[0]!;
      const last = group[group.length - 1]!;
      const own = sectionLabelOf(doc.body.slice(first.start, first.end));
      out.push({ start: first.start, end: last.end, section: own ?? sec.label, sentences: group });
    };
    if (items.length === 1) emit([items[0]!]);
    for (let i = 0; i + 1 < items.length; i++) {
      const group = items.slice(i, i + WINDOW_SENTENCES);
      const last = group[group.length - 1]!;
      if (last.end - group[0]!.start <= MAX_PASSAGE_CHARS) emit(group);
      else {
        emit([group[0]!]);
        if (i + 2 === items.length) emit([last]);
      }
    }
  }
  return out;
}

/** Monta o índice (ordem de documentos estável por id: o mesmo corpus dá sempre o mesmo índice). */
export function buildIndex(documents: readonly MemoryDocument[]): MemoryIndex {
  const docs = new Map<string, MemoryDocument>();
  for (const d of [...documents].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) docs.set(d.id, d);
  const raw: { base: Omit<IndexedPassage, "wordVec" | "charVec">; charTf: Map<number, number> }[] = [];
  const df = new Map<string, number>();
  const charDf = new Map<number, number>();
  const surface = new Map<string, string>();
  for (const doc of docs.values()) {
    passagesOf(doc).forEach((p, ordinal) => {
      const terms = contentTerms(doc.body, p.start, p.end);
      const tf = new Map<string, number>();
      const charTf = new Map<number, number>();
      for (const t of terms) {
        tf.set(t.stem, (tf.get(t.stem) ?? 0) + 1);
        if (!surface.has(t.stem)) surface.set(t.stem, t.raw.toLocaleLowerCase("pt-BR"));
        for (const g of charGrams(t.norm)) {
          const b = gramBucket(g);
          charTf.set(b, (charTf.get(b) ?? 0) + 1);
        }
      }
      for (const s of tf.keys()) df.set(s, (df.get(s) ?? 0) + 1);
      for (const b of charTf.keys()) charDf.set(b, (charDf.get(b) ?? 0) + 1);
      raw.push({ base: { docId: doc.id, ordinal, start: p.start, end: p.end, section: p.section, sentences: p.sentences, terms, tf, length: terms.length }, charTf });
    });
  }
  const n = raw.length;
  const avgLength = n ? raw.reduce((acc, r) => acc + r.base.length, 0) / n : 0;
  const passages: IndexedPassage[] = raw.map(({ base, charTf }) => {
    const wordVec: SparseWords = new Map();
    for (const [s, f] of base.tf) wordVec.set(s, tfWeight(f) * idfOf(n, df.get(s) ?? 0));
    const charVec: SparseChars = new Map();
    for (const [b, f] of charTf) charVec.set(b, tfWeight(f) * idfOf(n, charDf.get(b) ?? 0));
    return { ...base, wordVec: normalize(wordVec), charVec: normalize(charVec) };
  });
  const vocabulary = [...df.keys()].sort();
  const meanIdf = vocabulary.length ? vocabulary.reduce((a, s) => a + idfOf(n, df.get(s)!), 0) / vocabulary.length : 1;
  const meanBm25Idf = vocabulary.length ? vocabulary.reduce((a, s) => a + bm25IdfOf(n, df.get(s)!), 0) / vocabulary.length : 1;
  return { docs, passages, df, charDf, surface, vocabulary, n, avgLength, meanIdf, meanBm25Idf };
}

/* ── Pergunta ─────────────────────────────────────────────────────────────────────────────────────────────── */

type Expansion = QuerySlot["expansions"][number];

/** Decompõe a pergunta em termos com as expansões (exato · sinônimo · aproximado) que o índice conhece. */
export function analyzeQuery(index: MemoryIndex, query: string): QueryAnalysis {
  const text = query.trim().slice(0, MAX_QUERY_LENGTH);
  const terms = contentTerms(text);
  const order = terms.map((t) => t.stem);
  const slots: { query: string; stem: string; expansions: Expansion[] }[] = [];
  const slotOf = new Map<string, number>();
  for (const t of terms) {
    if (slotOf.has(t.stem)) continue;
    slotOf.set(t.stem, slots.length);
    const expansions: Expansion[] = [];
    if (index.df.has(t.stem)) expansions.push({ term: t.stem, via: "EXATO", weight: 1, surface: index.surface.get(t.stem) ?? t.raw });
    slots.push({ query: t.raw, stem: t.stem, expansions });
  }
  // sinônimos: a expressão equivalente precisa existir inteira no índice; casa no trecho só se todos os radicais aparecerem
  for (const m of findSynonyms(order)) {
    const slotIdx = new Set<number>();
    for (let i = m.from; i <= m.to; i++) slotIdx.add(slotOf.get(order[i]!)!);
    for (const alt of m.alternatives) {
      if (!alt.stems.every((s) => index.df.has(s))) continue;
      // o radical mais raro representa a expressão no vetor; os demais precisam coocorrer no trecho
      const ranked = [...alt.stems].sort((a, b) => (index.df.get(a)! - index.df.get(b)!) || (a < b ? -1 : 1));
      const [term, ...also] = ranked as [string, ...string[]];
      for (const si of slotIdx) {
        const slot = slots[si]!;
        if (slot.expansions.some((e) => e.term === term && !(e.also?.length))) continue;
        slot.expansions.push({ term, also: also.length ? also : undefined, via: "SINONIMO", weight: SYNONYM_WEIGHT, surface: alt.label, synonym: { from: m.matched.label, to: alt.label } });
      }
    }
  }
  // grafia aproximada só para termo que o índice não conhece nem por sinônimo ("teletrabaho" → "teletrabalho")
  for (const slot of slots) {
    if (slot.expansions.length || slot.stem.length < 4 || /\d/.test(slot.stem)) continue;
    const near = index.vocabulary
      .filter((v) => v.length >= 4 && v[0] === slot.stem[0] && Math.abs(v.length - slot.stem.length) <= 2)
      .map((v) => ({ v, sim: diceSimilarity(slot.stem, v) }))
      .filter((c) => c.sim >= FUZZY_MIN_SIMILARITY)
      .sort((a, b) => b.sim - a.sim || (a.v < b.v ? -1 : 1))
      .slice(0, 2);
    for (const c of near) slot.expansions.push({ term: c.v, via: "APROXIMADO", weight: FUZZY_WEIGHT * c.sim, surface: index.surface.get(c.v) ?? c.v, similarity: c.sim });
  }
  return { text, slots, unknown: slots.filter((s) => s.expansions.length === 0).map((s) => s.query) };
}

/** Frequência de uma expansão no trecho: a de uma expressão de vários radicais é a do radical menos frequente. */
function freqIn(p: IndexedPassage, e: Expansion): number {
  let f = p.tf.get(e.term) ?? 0;
  if (f && e.also) for (const a of e.also) f = Math.min(f, p.tf.get(a) ?? 0);
  return f;
}

/* ── Filtros de acesso e de faceta ────────────────────────────────────────────────────────────────────────── */

/** O documento pode aparecer para esta consulta? (classe de acesso, público restrito e facetas) */
export function docAllowed(doc: MemoryDocument, opts: MemoryQueryOptions = {}): boolean {
  const readable = opts.readable ?? DEFAULT_READABLE;
  if (!readable.includes(doc.accessClass)) return false;
  if (doc.accessClass === "RESTRITO" && opts.restrictedTo && !(doc.department && opts.restrictedTo.includes(doc.department))) return false;
  if (doc.audience && !(opts.viewerId && doc.audience.includes(opts.viewerId))) return false;
  if (opts.kinds && opts.kinds.length && !opts.kinds.includes(doc.kind)) return false;
  if (opts.department != null && opts.department !== "" && doc.department !== opts.department) return false;
  if (opts.year != null && doc.year !== opts.year) return false;
  return true;
}

/* ── Busca ────────────────────────────────────────────────────────────────────────────────────────────────── */

interface Scored {
  passage: IndexedPassage;
  score: number;
  cosineWords: number;
  cosineChars: number;
  bm25: number;
  bm25Normalized: number;
  matched: TermMatch[];
  matchedSlots: number;
}

export function searchIndex(index: MemoryIndex, query: string, opts: MemoryQueryOptions = {}): SearchResult {
  const analysis = analyzeQuery(index, query);
  const k = Math.max(0, Math.floor(opts.k ?? DEFAULT_K));
  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
  const perDoc = Math.max(1, Math.floor(opts.perDoc ?? 1));
  const known = analysis.slots.filter((s) => s.expansions.length > 0);
  if (!known.length || k === 0) return { query: analysis, hits: [] };
  const unknownCount = analysis.slots.length - known.length;

  // vetor de palavras da pergunta (peso = maior expansão do termo) e normas de referência
  const qWords = new Map<string, number>();
  for (const s of known) for (const e of s.expansions) qWords.set(e.term, Math.max(qWords.get(e.term) ?? 0, e.weight * idfOf(index.n, index.df.get(e.term) ?? 0)));
  let qSq = unknownCount * index.meanIdf * index.meanIdf;
  for (const v of qWords.values()) qSq += v * v;
  const qNorm = Math.sqrt(qSq) || 1;

  // vetor de caracteres da pergunta (todas as palavras de conteúdo, inclusive as desconhecidas)
  const qCharTf = new Map<number, number>();
  for (const t of contentTerms(analysis.text)) for (const g of charGrams(t.norm)) { const b = gramBucket(g); qCharTf.set(b, (qCharTf.get(b) ?? 0) + 1); }
  const qChars = new Map<number, number>();
  for (const [b, f] of qCharTf) qChars.set(b, tfWeight(f) * idfOf(index.n, index.charDf.get(b) ?? 0));
  normalize(qChars);

  const bm25Ref = known.reduce((acc, s) => acc + Math.max(...s.expansions.map((e) => e.weight * bm25IdfOf(index.n, index.df.get(e.term) ?? 0))), 0)
    + unknownCount * index.meanBm25Idf;

  const scored: Scored[] = [];
  for (const p of index.passages) {
    const doc = index.docs.get(p.docId)!;
    if (!docAllowed(doc, opts)) continue;
    // evidência lexical mínima: algum termo (ou expansão) da pergunta no trecho
    let any = false;
    for (const s of known) if (s.expansions.some((e) => freqIn(p, e) > 0)) { any = true; break; }
    if (!any) continue;
    let dot = 0;
    for (const [term, w] of qWords) dot += w * (p.wordVec.get(term) ?? 0);
    const cosineWords = dot / qNorm;
    let cosineChars = 0;
    for (const [b, w] of qChars) cosineChars += w * (p.charVec.get(b) ?? 0);
    let bm25 = 0;
    const matched: TermMatch[] = [];
    let matchedSlots = 0;
    for (const s of known) {
      let best = 0;
      let bestExp: Expansion | null = null;
      for (const e of s.expansions) {
        const f = freqIn(p, e);
        if (!f) continue;
        const idf = bm25IdfOf(index.n, index.df.get(e.term) ?? 0);
        const part = e.weight * idf * (f * (BM25.k1 + 1)) / (f + BM25.k1 * (1 - BM25.b + (BM25.b * p.length) / (index.avgLength || 1)));
        if (part > best) { best = part; bestExp = e; }
      }
      if (bestExp) {
        bm25 += best;
        matchedSlots++;
        matched.push({ query: s.query, term: bestExp.term, also: bestExp.also, surface: bestExp.surface, via: bestExp.via, weight: bestExp.weight, synonym: bestExp.synonym, similarity: bestExp.similarity });
      }
    }
    const bm25Normalized = bm25Ref > 0 ? Math.min(1, bm25 / bm25Ref) : 0;
    const score = SCORE_WEIGHTS.words * cosineWords + SCORE_WEIGHTS.chars * cosineChars + SCORE_WEIGHTS.bm25 * bm25Normalized;
    if (score < minScore) continue;
    scored.push({ passage: p, score, cosineWords, cosineChars, bm25, bm25Normalized, matched, matchedSlots });
  }
  scored.sort((a, b) => b.score - a.score || (a.passage.docId < b.passage.docId ? -1 : a.passage.docId > b.passage.docId ? 1 : a.passage.start - b.passage.start));

  // fontes distintas: até `perDoc` trechos por documento, sem sobreposição
  const picked: Scored[] = [];
  const perDocCount = new Map<string, Scored[]>();
  for (const s of scored) {
    if (picked.length >= k) break;
    const same = perDocCount.get(s.passage.docId) ?? [];
    if (same.length >= perDoc) continue;
    if (same.some((o) => s.passage.start < o.passage.end && o.passage.start < s.passage.end)) continue;
    same.push(s);
    perDocCount.set(s.passage.docId, same);
    picked.push(s);
  }

  const hits: ExplainedHit[] = picked.map((s) => {
    const p = s.passage;
    const doc = index.docs.get(p.docId)!;
    const terms = new Set(s.matched.flatMap((m) => [m.term, ...(m.also ?? [])]));
    const highlights = p.terms.filter((t) => terms.has(t.stem)).map((t) => ({ start: t.start - p.start, end: t.end - p.start }));
    return {
      docId: doc.id,
      kind: doc.kind,
      title: doc.title,
      department: doc.department,
      year: doc.year,
      href: doc.href,
      score: s.score,
      passage: { text: doc.body.slice(p.start, p.end), start: p.start, end: p.end },
      citation: citationOf(doc, p.section),
      accessClass: doc.accessClass,
      origin: doc.origin,
      section: p.section,
      sentences: p.sentences,
      explanation: {
        matched: s.matched,
        unmatched: analysis.unknown,
        coverage: { matched: s.matchedSlots, total: analysis.slots.length },
        components: { cosineWords: s.cosineWords, cosineChars: s.cosineChars, bm25: s.bm25, bm25Normalized: s.bm25Normalized },
        weights: { ...SCORE_WEIGHTS },
        highlights,
      },
    };
  });
  return { query: analysis, hits };
}

export type { MatchVia };
