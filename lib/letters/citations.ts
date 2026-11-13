/**
 * Citações e referências (RF54.CA06): reconhece chamadas no texto — autor-data ABNT NBR 10520 ("(SILVA, 2020, p. 12)",
 * "Silva (2020)") e numéricas/Vancouver ("[3]", "[1-4]") —, lê a lista de referências (NBR 6023 e Vancouver), cruza
 * as duas (citação sem referência, referência nunca citada, ano divergente) e confere o formato básico de cada entrada
 * (autor, título, ano, local e editora, DOI 10.xxxx/…, URL com "Acesso em"). Nunca completa dado que falta: só aponta.
 * A disponibilidade da fonte não é conferida (sem rede): toda fonte sai "NAO_VERIFICADA".
 */
import type { RawFinding } from "./findings";
import { fold, quotedSpans, shortHash } from "./text";
import type { LetterBlock } from "./types";

export type CitationStyle = "AUTOR_DATA" | "NUMERICO";
export type CitationStatus = "REFERENCIADA" | "SEM_REFERENCIA" | "ANO_DIVERGENTE" | "NUMERO_INEXISTENTE";

export interface InTextCitation {
  id: string;
  blockId: string;
  start: number;
  end: number;
  raw: string;
  style: CitationStyle;
  form: "PARENTETICA" | "NARRATIVA" | "NUMERICA";
  /** chaves dos autores (MAIÚSCULAS sem acento); o primeiro é o de entrada */
  authors: string[];
  year: string | null;
  page: string | null;
  numbers: number[];
  apud: boolean;
}

export interface ReferenceEntry {
  id: string;
  blockId: string;
  start: number;
  end: number;
  text: string;
  style: "ABNT" | "VANCOUVER" | "DESCONHECIDO";
  number: number | null;
  authors: string[];
  year: string | null;
  undated: boolean;
  hasTitle: boolean;
  hasPublisher: boolean;
  periodical: boolean;
  online: boolean;
  hasAccessDate: boolean;
  doi: string | null;
  doiValid: boolean | null;
}

export interface CitationReport {
  citations: (InTextCitation & { status: CitationStatus; referenceId: string | null; source: "NAO_VERIFICADA" })[];
  references: (ReferenceEntry & { cited: boolean })[];
  style: CitationStyle | "MISTO" | "NENHUM";
  findings: { blockId: string | null; raw: RawFinding }[];
}

const YEAR = "(?:1[5-9]\\d{2}|20\\d{2})[a-z]?";
const YEAR_RE = new RegExp(`\\b(${YEAR})\\b`, "g");
const UNDATED = /\[?s\.\s?d\.\]?/i;
const DOI_RE = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;

/** Chave de autor: sem acento, maiúsculas, sem "et al." e sem pontuação final. */
export const authorKey = (s: string) =>
  fold(s.replace(/\bet\s+al\.?/i, "").replace(/[.,;:]+$/g, "").trim()).toUpperCase().replace(/\s+/g, " ");

const normYear = (y: string | null) => (y ? y.replace(/[[\]]/g, "").toLowerCase() : null);

/* ── Chamadas no texto ───────────────────────────────────────────────────────────────────────────────────── */

const PAREN_RE = /\(([^()\n]{2,200}?)\)/g;
const NARRATIVE_CONTENT = new RegExp(`^\\s*(${YEAR}|s\\.\\s?d\\.)(?:\\s*,\\s*([pf])\\.\\s*([\\d]+(?:\\s*[-–]\\s*\\d+)?))?\\s*$`, "i");
const AUTHOR_BEFORE = /((?:\p{Lu}[\p{L}'’-]+)(?:\s+(?:e|&)\s+\p{Lu}[\p{L}'’-]+)?(?:\s+et\s+al\.)?)\s*$/u;
const PART_RE = new RegExp(`^(.*?),\\s*(${YEAR}|s\\.\\s?d\\.|\\[s\\.\\s?d\\.\\])(.*)$`, "i");
const NUMERIC_RE = /\[(\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)\]/g;

function expandNumbers(s: string): number[] {
  const out: number[] = [];
  for (const part of s.split(",")) {
    const m = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      if (b >= a && b - a <= 50) for (let n = a; n <= b; n++) out.push(n);
    } else if (/^\d+$/.test(part.trim())) out.push(Number(part.trim()));
  }
  return out;
}

const looksLikeAuthors = (s: string) => {
  const t = s.trim();
  return /^\p{Lu}/u.test(t) && t.split(/\s+/).length <= 10 && !/\d/.test(t.replace(/\bn[º°]\s*\d+/g, "")) && !/^(em|de|desde|até|no|na|ano)\b/i.test(t);
};

export function parseCitations(block: LetterBlock): InTextCitation[] {
  if (block.kind === "REFERENCIAS" || block.kind === "TITULO") return [];
  const text = block.text;
  const out: InTextCitation[] = [];
  const mk = (c: Omit<InTextCitation, "id" | "blockId" | "raw">): InTextCitation => ({
    ...c,
    blockId: block.id,
    raw: text.slice(c.start, c.end),
    id: `cit-${block.id}-${c.start}-${shortHash(text.slice(c.start, c.end) + c.authors.join(",") + (c.year ?? ""))}`,
  });
  for (const m of text.matchAll(PAREN_RE)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const content = m[1]!;
    const narrative = content.match(NARRATIVE_CONTENT);
    if (narrative) {
      const before = text.slice(Math.max(0, start - 90), start);
      const a = before.match(AUTHOR_BEFORE);
      if (!a) continue;
      const authorStart = start - (before.length - (a.index ?? 0));
      const authors = a[1]!.split(/\s+(?:e|&)\s+/).map(authorKey).filter(Boolean);
      out.push(mk({ start: authorStart, end, style: "AUTOR_DATA", form: "NARRATIVA", authors, year: UNDATED.test(narrative[1]!) ? null : narrative[1]!, page: narrative[3] ?? null, numbers: [], apud: false }));
      continue;
    }
    if (!new RegExp(`(${YEAR}|s\\.\\s?d\\.)`, "i").test(content)) continue;
    // "SILVA; SOUZA, 2019" = uma obra de dois autores; "SILVA, 2020; SOUZA, 2019" = duas obras
    const parts = content.split(";");
    const groups: string[] = [];
    let pending = "";
    for (const p of parts) {
      const joined = pending ? `${pending};${p}` : p;
      if (new RegExp(`,\\s*(${YEAR}|s\\.\\s?d\\.|\\[s\\.\\s?d\\.\\])`, "i").test(p)) { groups.push(joined); pending = ""; } else pending = joined;
    }
    for (const g of groups) {
      const apudSplit = g.split(/\bapud\b/i);
      const cited = (apudSplit.length > 1 ? apudSplit[apudSplit.length - 1]! : g).trim();
      const pm = cited.match(PART_RE);
      if (!pm || !looksLikeAuthors(pm[1]!)) continue;
      const authors = pm[1]!.split(";").map(authorKey).filter(Boolean);
      const rest = pm[3] ?? "";
      const page = rest.match(/\b[pf]\.\s*(\d+(?:\s*[-–]\s*\d+)?)/i)?.[1] ?? null;
      const years = [pm[2]!, ...[...rest.matchAll(new RegExp(`,\\s*(${YEAR})\\b`, "g"))].map((x) => x[1]!)];
      for (const y of years) out.push(mk({ start, end, style: "AUTOR_DATA", form: "PARENTETICA", authors, year: UNDATED.test(y) ? null : y, page, numbers: [], apud: apudSplit.length > 1 }));
    }
  }
  for (const m of text.matchAll(NUMERIC_RE)) {
    const start = m.index ?? 0;
    const numbers = expandNumbers(m[1]!);
    if (numbers.length) out.push(mk({ start, end: start + m[0].length, style: "NUMERICO", form: "NUMERICA", authors: [], year: null, page: null, numbers, apud: false }));
  }
  return out.sort((a, b) => a.start - b.start);
}

/* ── Lista de referências ────────────────────────────────────────────────────────────────────────────────── */

/** Fim do segmento de autoria: primeiro ". " que não fecha uma inicial ("J. A.") nem "et al.". */
function authorSegmentEnd(text: string): number {
  for (const m of text.matchAll(/\.\s/g)) {
    const k = m.index ?? 0;
    const before = text.slice(0, k).match(/(\S+)$/)?.[1] ?? "";
    if (/^\p{Lu}$/u.test(before) || /^(al|et)$/i.test(before)) continue;
    return k;
  }
  return -1;
}

export function parseReference(blockId: string, line: string, start: number): ReferenceEntry {
  const numbered = line.match(/^\s*(?:\[(\d+)\]|(\d+)[.)])\s+/);
  const number = numbered ? Number(numbered[1] ?? numbered[2]) : null;
  const body = numbered ? line.slice(numbered[0].length) : line.trim();
  let style: ReferenceEntry["style"] = "DESCONHECIDO";
  let authors: string[] = [];
  if (/^\p{Lu}[\p{Lu}'’ -]+,\s/u.test(body) || /^\p{Lu}[\p{Lu}\d'’ .-]{2,}\.\s/u.test(body) || /^\p{Lu}{2,}[\s,]/u.test(body)) {
    style = "ABNT";
  } else if (/^\p{Lu}[\p{Ll}'’-]+(?:\s\p{Lu}[\p{Ll}'’-]+)?\s\p{Lu}{1,3}[,.]/u.test(body)) {
    style = "VANCOUVER";
  } else if (/^\p{Lu}[\p{Ll}][\p{L}'’-]*,\s+\p{Lu}/u.test(body)) {
    style = "ABNT"; // sobrenome em caixa baixa (aviso à parte)
  }
  const segEnd = authorSegmentEnd(body);
  const authorSeg = segEnd >= 0 ? body.slice(0, segEnd) : body;
  if (style === "ABNT") {
    authors = authorSeg.split(";").map((a) => authorKey(a.split(",")[0] ?? a)).filter(Boolean);
    // entrada pelo título ("MANUAL de redação"): a chave é a primeira palavra
    if (!/,/.test(authorSeg) && /^\p{Lu}{2,}\s+\p{Ll}/u.test(authorSeg)) authors = [authorKey(authorSeg.split(/\s+/)[0]!)];
  } else if (style === "VANCOUVER") {
    authors = authorSeg.split(",").map((a) => authorKey(a.trim().split(/\s+/)[0] ?? "")).filter(Boolean);
  }
  const accessIdx = body.search(/acesso em\s*:/i);
  const availableIdx = body.search(/dispon[ií]vel em\s*:/i);
  const cutoff = availableIdx >= 0 ? availableIdx : accessIdx >= 0 ? accessIdx : body.length;
  // DOI e URL têm dígitos que parecem ano ("10.1590/…"): ficam fora da busca do ano
  const yearZone = body.slice(0, cutoff).replace(/\b10\.\d{4,9}\/\S+/g, " ").replace(/https?:\/\/\S+|www\.\S+/gi, " ");
  const years = [...yearZone.matchAll(YEAR_RE)].map((m) => m[1]!);
  const urlMatch = body.match(/https?:\/\/\S+|www\.\S+/i);
  const doiLabel = body.match(/\bdoi\s*:?\s*(\S+)|https?:\/\/(?:dx\.)?doi\.org\/(\S+)/i);
  const doi = doiLabel ? (doiLabel[1] ?? doiLabel[2] ?? "").replace(/[.,;)\]]+$/, "") : body.match(/\b10\.\d{1,9}\/\S+/)?.[0]?.replace(/[.,;)\]]+$/, "") ?? null;
  const onlyDoiUrl = !!urlMatch && /doi\.org\//i.test(urlMatch[0]) && (body.match(/https?:\/\/\S+|www\.\S+/gi) ?? []).length === 1;
  const afterAuthors = segEnd >= 0 ? body.slice(segEnd + 1).trim() : "";
  const titleEntry = style === "ABNT" && !/,/.test(authorSeg) && /^\p{Lu}{2,}\s+\p{Ll}/u.test(authorSeg);
  return {
    id: `ref-${blockId}-${start}-${shortHash(line)}`,
    blockId,
    start,
    end: start + line.length,
    text: line,
    style,
    number,
    authors,
    year: years.length ? years[years.length - 1]! : null,
    undated: UNDATED.test(body),
    hasTitle: titleEntry || /\p{L}{3,}/u.test(afterAuthors.split(/\.\s/)[0] ?? ""),
    hasPublisher: new RegExp(`(\\p{Lu}[\\p{L} .'’-]+|\\[S\\.\\s?l\\.?)\\s*:\\s*([^,.;:]+|\\[?s\\.\\s?n\\.\\]?)\\s*,\\s*\\[?${YEAR}`, "u").test(body),
    periodical: /\bv\.\s*\d|\bn\.\s*\d|\bp\.\s*\d+\s*[-–]\s*\d+|;\s*\d+\s*\(\d+\)\s*:/.test(body),
    online: !!urlMatch && !onlyDoiUrl,
    hasAccessDate: /acesso em\s*:\s*\d{1,2}\s+[a-zç]{3,}\.?\s+\d{4}/i.test(body),
    doi,
    doiValid: doi ? DOI_RE.test(doi) : null,
  };
}

/** Linhas de referência: blocos REFERENCIAS e, por compatibilidade, os blocos sob um título "Referências". */
export function referenceLines(blocks: readonly LetterBlock[]): { blockId: string; line: string; start: number }[] {
  const out: { blockId: string; line: string; start: number }[] = [];
  let underHeading = false;
  for (const b of blocks) {
    if (b.kind === "TITULO") {
      underHeading = /^(\d+[.\s]*)?(refer[eê]ncias|refer[eê]ncias bibliogr[aá]ficas|bibliografia)\s*:?\s*$/i.test(b.text.trim());
      continue;
    }
    if (b.kind !== "REFERENCIAS" && !(underHeading && (b.kind === "PARAGRAFO" || b.kind === "LISTA"))) continue;
    let pos = 0;
    for (const line of b.text.split("\n")) {
      if (line.trim().length >= 8) out.push({ blockId: b.id, line, start: pos });
      pos += line.length + 1;
    }
  }
  return out;
}

/* ── Cruzamento ──────────────────────────────────────────────────────────────────────────────────────────── */

const matchesAuthor = (ref: ReferenceEntry, key: string) => ref.authors.some((a) => a === key || a.startsWith(`${key} `) || key.startsWith(`${a} `));

export function analyzeCitations(blocks: readonly LetterBlock[]): CitationReport {
  const citations = blocks.flatMap(parseCitations);
  const references = referenceLines(blocks).map((l) => parseReference(l.blockId, l.line, l.start));
  const findings: CitationReport["findings"] = [];
  const add = (blockId: string | null, raw: RawFinding) => findings.push({ blockId, raw });
  const cited = new Set<string>();
  const authorDate = citations.filter((c) => c.style === "AUTOR_DATA");
  const numeric = citations.filter((c) => c.style === "NUMERICO");
  const style: CitationReport["style"] = authorDate.length && numeric.length ? "MISTO" : authorDate.length ? "AUTOR_DATA" : numeric.length ? "NUMERICO" : "NENHUM";
  if (style === "MISTO") {
    const minority = authorDate.length >= numeric.length ? numeric[0]! : authorDate[0]!;
    add(minority.blockId, { ruleId: "SISTEMA_CHAMADA_MISTO", start: minority.start, end: minority.end, vars: { autorData: authorDate.length, numerico: numeric.length }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
  }
  const noList = references.length === 0;
  const result: CitationReport["citations"] = [];
  for (const c of authorDate) {
    const key = c.authors[0] ?? "";
    const byAuthor = references.filter((r) => matchesAuthor(r, key));
    const sameYear = byAuthor.filter((r) => normYear(r.year) === normYear(c.year) || (r.undated && c.year === null));
    let status: CitationStatus = "REFERENCIADA";
    let referenceId: string | null = sameYear[0]?.id ?? null;
    if (!byAuthor.length) {
      status = "SEM_REFERENCIA";
      add(c.blockId, { ruleId: "CITACAO_SEM_REFERENCIA", start: c.start, end: c.end, vars: { author: key, year: c.year ?? "s.d.", noList: noList ? 1 : 0 }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
    } else if (!sameYear.length) {
      status = "ANO_DIVERGENTE";
      const ref = byAuthor[0]!;
      referenceId = ref.id;
      add(c.blockId, {
        ruleId: "CITACAO_ANO_DIVERGENTE",
        start: c.start,
        end: c.end,
        vars: { author: key, year: c.year ?? "s.d.", refYear: ref.year ?? "s.d." },
        confidence: 0.85,
        certainty: "DEMONSTRAVEL",
        related: [{ blockId: ref.blockId, start: ref.start, end: ref.end, excerpt: ref.text }],
      });
    }
    for (const r of byAuthor) cited.add(r.id);
    result.push({ ...c, status, referenceId, source: "NAO_VERIFICADA" });
  }
  // numérico: por número explícito ou pela ordem da lista
  let maxSeen = 0;
  let orderFlagged = false;
  for (const c of numeric) {
    let status: CitationStatus = "REFERENCIADA";
    let referenceId: string | null = null;
    for (const n of c.numbers) {
      const ref = references.find((r) => r.number === n) ?? (references.every((r) => r.number === null) ? references[n - 1] : undefined);
      if (!ref) {
        status = "NUMERO_INEXISTENTE";
        add(c.blockId, { ruleId: "CITACAO_NUMERICA_INEXISTENTE", start: c.start, end: c.end, vars: { number: n, total: references.length }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
        continue;
      }
      cited.add(ref.id);
      referenceId ??= ref.id;
      if (n > maxSeen + 1 && !orderFlagged) {
        orderFlagged = true;
        add(c.blockId, { ruleId: "CITACAO_NUMERICA_ORDEM", start: c.start, end: c.end, vars: { number: n, expected: maxSeen + 1 }, confidence: 0.7, certainty: "DEMONSTRAVEL" });
      }
      maxSeen = Math.max(maxSeen, n);
    }
    result.push({ ...c, status, referenceId, source: "NAO_VERIFICADA" });
  }
  // citação direta (entre aspas, ou bloco de citação longa) exige página
  for (const b of blocks) {
    if (b.kind === "REFERENCIAS" || b.kind === "TITULO") continue;
    const own = authorDate.filter((c) => c.blockId === b.id);
    if (b.kind === "CITACAO") {
      if (!own.length && !numeric.some((c) => c.blockId === b.id) && b.text.trim()) {
        add(b.id, { ruleId: "CITACAO_LONGA_SEM_FONTE", start: Math.max(0, b.text.trimEnd().length - 1), end: b.text.trimEnd().length, vars: {}, confidence: 0.85, certainty: "DEMONSTRAVEL" });
      }
      for (const c of own) if (!c.page) add(b.id, { ruleId: "CITACAO_DIRETA_SEM_PAGINA", start: c.start, end: c.end, vars: { author: c.authors[0] ?? "", year: c.year ?? "s.d." }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
      continue;
    }
    const quotes = quotedSpans(b.text).filter((q) => b.text.slice(q.start, q.end).split(/\s+/).length >= 3);
    for (const c of own) {
      if (c.page) continue;
      const sentenceStart = Math.max(b.text.lastIndexOf(".", c.start - 1), b.text.lastIndexOf("\n", c.start - 1)) + 1;
      const sentenceEndDot = b.text.indexOf(".", c.end);
      const sentenceEnd = sentenceEndDot < 0 ? b.text.length : sentenceEndDot;
      if (quotes.some((q) => q.start >= sentenceStart && q.end <= sentenceEnd + 1)) {
        add(b.id, { ruleId: "CITACAO_DIRETA_SEM_PAGINA", start: c.start, end: c.end, vars: { author: c.authors[0] ?? "", year: c.year ?? "s.d." }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
      }
    }
  }
  // formato de cada referência
  for (const r of references) {
    const lead = r.text.match(/^\s*(?:\[\d+\]|\d+[.)])?\s*/)?.[0].length ?? 0;
    const at = (s: number, e: number) => ({ start: r.start + s, end: r.start + e });
    const whole = at(lead, r.text.trimEnd().length);
    if (!r.authors.length && r.style !== "DESCONHECIDO") add(r.blockId, { ruleId: "REFERENCIA_SEM_AUTOR", ...whole, vars: {}, confidence: 0.6, certainty: "HIPOTESE" });
    if (r.style === "DESCONHECIDO") add(r.blockId, { ruleId: "REFERENCIA_SEM_AUTOR", ...whole, vars: {}, confidence: 0.6, certainty: "HIPOTESE" });
    if (!r.year && !r.undated) add(r.blockId, { ruleId: "REFERENCIA_SEM_ANO", ...whole, vars: {}, confidence: 0.8, certainty: "DEMONSTRAVEL" });
    if (!r.hasTitle) add(r.blockId, { ruleId: "REFERENCIA_SEM_TITULO", ...whole, vars: {}, confidence: 0.55, certainty: "HIPOTESE" });
    if (r.style === "ABNT" && !r.periodical && !r.online && !r.doi && !r.hasPublisher) add(r.blockId, { ruleId: "REFERENCIA_SEM_LOCAL_EDITORA", ...whole, vars: {}, confidence: 0.65, certainty: "HIPOTESE" });
    if (r.online && !r.hasAccessDate) {
      const u = r.text.search(/https?:\/\/|www\./i);
      const uEnd = r.text.slice(u).search(/\s|$/);
      add(r.blockId, { ruleId: "REFERENCIA_URL_SEM_ACESSO", ...at(u, u + (uEnd < 0 ? r.text.length - u : uEnd)), vars: {}, confidence: 0.9, certainty: "DEMONSTRAVEL" });
    }
    if (r.doi && r.doiValid === false) {
      const d = r.text.indexOf(r.doi);
      add(r.blockId, { ruleId: "REFERENCIA_DOI_INVALIDO", ...(d >= 0 ? at(d, d + r.doi.length) : whole), vars: { doi: r.doi }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
    }
    // NBR 6023: sobrenome de entrada em maiúsculas
    const lower = r.text.slice(lead).match(/^(\p{Lu}[\p{Ll}][\p{L}'’-]*),\s+\p{Lu}/u);
    if (lower && r.style === "ABNT") add(r.blockId, { ruleId: "REFERENCIA_CAIXA_AUTOR", ...at(lead, lead + lower[1]!.length), replacement: lower[1]!.toUpperCase(), vars: { word: lower[1]! }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
    if (!cited.has(r.id)) add(r.blockId, { ruleId: "REFERENCIA_NAO_CITADA", ...whole, vars: { author: r.authors[0] ?? "", year: r.year ?? "s.d." }, confidence: citations.length ? 0.8 : 0.6, certainty: "DEMONSTRAVEL" });
  }
  const order = new Map(blocks.map((b, i) => [b.id, i]));
  result.sort((a, b) => (order.get(a.blockId) ?? 0) - (order.get(b.blockId) ?? 0) || a.start - b.start);
  return { citations: result, references: references.map((r) => ({ ...r, cited: cited.has(r.id) })), style, findings };
}
