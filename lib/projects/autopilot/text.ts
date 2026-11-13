/**
 * Texto da demanda (RF30): normalização e cortes que PRESERVAM as posições — todo fato extraído guarda o trecho de origem
 * (início/fim no texto normalizado) para a tela mostrar "de onde veio" (D-12). As palavras-chave são procuradas em `fold(texto)`,
 * que troca cada caractere por um só (minúsculo, sem acento): as posições valem para o texto original.
 */

export interface Span { start: number; end: number }

/** Normaliza: quebras `\n`, sem espaço invisível nem espaço no fim da linha, no máximo uma linha em branco seguida. */
export function normalizeDemandText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿­]/g, "")
    .replace(/\t/g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Minúsculas sem acento, com o MESMO comprimento (um caractere por unidade de código) — para casar palavras-chave. */
export function fold(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const base = c.normalize("NFD")[0] ?? c;
    out += base.toLowerCase().length === 1 ? base.toLowerCase() : c;
  }
  return out;
}

export interface LineSpan extends Span { text: string; index: number }

export function lineSpans(text: string): LineSpan[] {
  const out: LineSpan[] = [];
  let start = 0;
  let index = 0;
  for (const part of text.split("\n")) {
    out.push({ start, end: start + part.length, text: part, index });
    start += part.length + 1;
    index += 1;
  }
  return out;
}

/** Marcador de lista no começo da linha: 1. 1) a) i. • - * – */
export const LIST_MARKER = /^(\s*)((\d{1,2})[.)\-–]|([a-z])[.)]|([ivx]{1,5})[.)\-–]|[•\-*–·▪◦►])\s+/i;
/** Linha de cabeçalho de mensagem/memorando: "Assunto: …", "De: …" */
export const HEADER_LINE = /^\s*(de|from|remetente|para|to|destinat[aá]rio|cc|assunto|subject|ref\.?|refer[eê]ncia|objeto|data|date|enviado em|sent)\s*:/i;

export type ListKind = "NUM" | "ALPHA" | "ROMAN" | "BULLET";
export interface Segment extends Span {
  /** texto com espaços colapsados (exibição) */
  text: string;
  /** índice da linha onde começa */
  line: number;
  /** item de lista: tipo do marcador; o `start` já pula o marcador */
  list?: ListKind;
  /** linha que introduz a lista (terminada em ":", ex.: "O projeto deverá contemplar:") */
  intro?: Span;
  header?: boolean;
}

const isUpperLine = (s: string) => /\p{Lu}/u.test(s) && s === s.toLocaleUpperCase("pt-BR") && s.replace(/[^\p{L}]/gu, "").length >= 4;
const ABBREVIATIONS = new Set([
  "n", "no", "nº", "n°", "art", "arts", "inc", "sr", "sra", "srs", "dr", "dra", "prof", "profa", "exmo", "exma", "ilmo", "ilma", "fl", "fls",
  "pag", "p", "cf", "vol", "min", "max", "aprox", "tel", "av", "r", "s", "ltda", "cia", "obs", "id", "ref", "proc",
]);

function listKindOf(m: RegExpExecArray): ListKind {
  if (m[3]) return "NUM";
  if (m[4]) return "ALPHA";
  if (m[5]) return "ROMAN";
  return "BULLET";
}

/**
 * Cortes do texto em orações com posição: parágrafos (juntando linhas quebradas no meio da frase), itens de lista e
 * cabeçalhos; dentro deles, "; " e ". " seguido de maiúscula (sem cortar abreviações como "nº.", "Sr.", "art.").
 */
export function segmentsOf(text: string): Segment[] {
  type Block = { start: number; end: number; line: number; list?: ListKind; intro?: Span; header?: boolean };
  const blocks: Block[] = [];
  let cur: Block | null = null;
  let prevText = "";
  let prevLine: Span | null = null;
  for (const ln of lineSpans(text)) {
    const t = ln.text;
    if (!t.trim()) {
      if (cur) blocks.push(cur);
      cur = null;
      prevText = "";
      prevLine = null;
      continue;
    }
    const m = LIST_MARKER.exec(t);
    const header = HEADER_LINE.test(t);
    const startNew = !cur || Boolean(m) || header || Boolean(cur.header) || /[.:;!?]\s*$/.test(prevText) || isUpperLine(t.trim()) || isUpperLine(prevText.trim());
    if (startNew) {
      if (cur) blocks.push(cur);
      const offset = m ? m[0].length : t.length - t.trimStart().length;
      let intro: Span | undefined;
      if (m) {
        // lista introduzida por ":" ("O projeto deverá contemplar:") — a introdução passa aos itens seguintes da mesma lista
        const last: Block | undefined = cur ?? blocks[blocks.length - 1];
        if (/:\s*$/.test(prevText) && prevLine) intro = prevLine;
        else if (last?.list === listKindOf(m) && last.intro && text.slice(last.end, ln.start).trim() === "") intro = last.intro;
      }
      cur = { start: ln.start + offset, end: ln.end, line: ln.index, list: m ? listKindOf(m) : undefined, intro, header: header || undefined };
    } else if (cur) {
      cur.end = ln.end;
    }
    prevText = t;
    prevLine = { start: ln.start, end: ln.end };
  }
  if (cur) blocks.push(cur);

  const out: Segment[] = [];
  for (const b of blocks) {
    const raw = text.slice(b.start, b.end);
    let from = 0;
    let first = true;
    const cut = (to: number) => {
      const piece = raw.slice(from, to);
      const s = b.start + from + (piece.length - piece.trimStart().length);
      const e = b.start + from + piece.trimEnd().length;
      if (e > s) {
        out.push({ start: s, end: e, text: text.slice(s, e).replace(/\s+/g, " "), line: b.line, list: first ? b.list : undefined, intro: b.intro, header: b.header });
        first = false;
      }
      from = to;
    };
    if (!b.header) {
      for (let i = 0; i < raw.length; i++) {
        const c = raw[i]!;
        if (c === ";") cut(i + 1);
        else if ((c === "." || c === "!" || c === "?") && /^\s+["“(\p{Lu}\d]/u.test(raw.slice(i + 1, i + 16))) {
          const word = (/(\S+)$/.exec(raw.slice(from, i))?.[1] ?? "").toLocaleLowerCase("pt-BR").replace(/[^\p{L}º°]/gu, "");
          if (c === "." && (ABBREVIATIONS.has(word) || /^\p{L}$/u.test(word))) continue;
          cut(i + 1);
        }
      }
    }
    cut(raw.length);
  }
  return out;
}

/** Corta em fronteira de palavra e põe reticências. */
export function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cutAt = t.lastIndexOf(" ", max - 1);
  return `${t.slice(0, cutAt > max * 0.6 ? cutAt : max - 1).replace(/[\s,;:.\-–]+$/u, "")}…`;
}

export const capitalize = (s: string) => (s ? s[0]!.toLocaleUpperCase("pt-BR") + s.slice(1) : s);

const LOWER_WORDS = new Set(["de", "do", "da", "dos", "das", "e", "em", "para", "a", "o", "as", "os", "no", "na", "nos", "nas", "por", "com"]);
/**
 * "SECRETARIA DE ESTADO DAS CIDADES" → "Secretaria de Estado das Cidades" (só quando tudo está em maiúsculas). Depois de um
 * travessão ("– SECID/DTI") e em palavras com barra, a sigla fica como está.
 */
export function titleCaseIfUpper(s: string): string {
  if (!isUpperLine(s)) return s;
  const dash = /\s[–—-]\s/.exec(s);
  const main = dash ? s.slice(0, dash.index) : s;
  const rest = dash ? s.slice(dash.index) : "";
  const cased = main
    .split(/(\s+)/)
    .map((w, i) => {
      if (/^\s+$/.test(w) || w.includes("/")) return w;
      const low = w.toLocaleLowerCase("pt-BR");
      return i > 0 && LOWER_WORDS.has(low) ? low : capitalize(low);
    })
    .join("");
  return cased + rest;
}

/** Trecho em volta de um intervalo (para a tela realçar a origem). */
export function excerptAround(text: string, span: Span, pad = 60): { before: string; match: string; after: string } {
  const a = Math.max(0, span.start - pad);
  const b = Math.min(text.length, span.end + pad);
  return {
    before: (a > 0 ? "…" : "") + text.slice(a, span.start).replace(/\s+/g, " ").trimStart(),
    match: text.slice(span.start, span.end).replace(/\s+/g, " "),
    after: text.slice(span.end, b).replace(/\s+/g, " ").trimEnd() + (b < text.length ? "…" : ""),
  };
}

/** Sobreposição de dois intervalos. */
export const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

/** Palavras significativas (≥ 3 letras, sem acento) — para comparar entregas parecidas. */
export function wordSet(s: string): Set<string> {
  return new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
}

export function similarity(a: string, b: string): number {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
