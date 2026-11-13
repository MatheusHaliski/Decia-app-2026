/**
 * Tokenização do português (RF53.CA01 "posições no texto"): frases, palavras acentuadas e compostas por hífen,
 * contrações ("do", "na", "pelo", "à"), números ("3,5", "1º", "10%"), siglas (ABNT, S.A.) e endereços (URL/DOI).
 * Cada token guarda [start, end) exatos no texto do bloco. Função pura.
 */
import { fold, isAllCaps, isCapitalized } from "./text";
import type { Sentence, Token, TokenKind } from "./types";

/** Contração/combinação de preposição com artigo ou pronome → [preposição, segunda parte]. */
export const CONTRACTIONS: Readonly<Record<string, readonly [string, string]>> = (() => {
  const out: Record<string, readonly [string, string]> = {};
  const add = (prep: string, pairs: Record<string, string>) => {
    for (const [form, second] of Object.entries(pairs)) out[form] = [prep, second] as const;
  };
  add("de", {
    do: "o", da: "a", dos: "os", das: "as", dum: "um", duma: "uma", duns: "uns", dumas: "umas",
    dele: "ele", dela: "ela", deles: "eles", delas: "elas", deste: "este", desta: "esta", destes: "estes", destas: "estas",
    disto: "isto", desse: "esse", dessa: "essa", desses: "esses", dessas: "essas", disso: "isso", daquele: "aquele",
    daquela: "aquela", daqueles: "aqueles", daquelas: "aquelas", daquilo: "aquilo", daqui: "aqui", dali: "ali", daí: "aí",
    doutro: "outro", doutra: "outra", doutros: "outros", doutras: "outras",
  });
  add("em", {
    no: "o", na: "a", nos: "os", nas: "as", num: "um", numa: "uma", nuns: "uns", numas: "umas",
    nele: "ele", nela: "ela", neles: "eles", nelas: "elas", neste: "este", nesta: "esta", nestes: "estes", nestas: "estas",
    nisto: "isto", nesse: "esse", nessa: "essa", nesses: "esses", nessas: "essas", nisso: "isso", naquele: "aquele",
    naquela: "aquela", naqueles: "aqueles", naquelas: "aquelas", naquilo: "aquilo", noutro: "outro", noutra: "outra",
  });
  add("a", { ao: "o", aos: "os", à: "a", às: "as", àquele: "aquele", àquela: "aquela", àqueles: "aqueles", àquelas: "aquelas", àquilo: "aquilo", aonde: "onde" });
  add("por", { pelo: "o", pela: "a", pelos: "os", pelas: "as" });
  add("para", { pro: "o", pros: "os", pra: "a", pras: "as" });
  return out;
})();

/** Abreviaturas que nunca encerram frase (títulos, remissões, meses, termos de referência). */
const ABBREV_NEVER_END = new Set([
  "sr", "sra", "srs", "sras", "srta", "dr", "dra", "drs", "dras", "prof", "profa", "profs", "exmo", "exma", "ilmo", "ilma",
  "av", "art", "arts", "cap", "caps", "fig", "figs", "tab", "p", "pp", "v", "n", "nº", "no", "ed", "eds", "org", "orgs",
  "coord", "trad", "vol", "vols", "cf", "ex", "obs", "pag", "pág", "págs", "tel", "inc", "par", "al", "min", "máx", "mín",
  "aprox", "séc", "sec", "dept", "depto", "núm", "res", "dec", "f", "fl", "fls", "op", "cit", "s", "l", "d", "ca", "id",
]);
/** Meses abreviados ("12 mar. 2024"): só valem como abreviatura colados a um número (dia ou ano). */
const MONTHS = new Set(["jan", "fev", "mar", "abr", "maio", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]);
/** Abreviaturas que encerram a frase quando a próxima palavra começa com maiúscula. */
const ABBREV_MAY_END = new Set(["etc", "ltda", "jr", "ibid", "apud"]);

const TOKEN_RE =
  /(https?:\/\/[^\s<>"“”]+|www\.[^\s<>"“”]+|\b10\.\d{4,9}\/[^\s<>"“”]+)|((?:\p{Lu}\.){2,}(?!\p{L}))|(\d+(?:[.,]\d+)*[ºª°%]?)|(\p{L}[\p{L}\p{M}\d]*(?:[-'’]\p{L}[\p{L}\p{M}\d]*)*[ºª]?)|(\.\.\.|…|[.,;:!?()[\]{}"“”‘’«»—–\-/'])|(\S)/gu;

const URL_TRAILING = /[.,;:)\]}>]+$/;

interface RawToken {
  text: string;
  start: number;
  end: number;
  kind: TokenKind;
}

function rawTokens(text: string): RawToken[] {
  const out: RawToken[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (m[1]) {
      const trail = m[1].match(URL_TRAILING)?.[0] ?? "";
      const url = trail ? m[1].slice(0, -trail.length) : m[1];
      out.push({ text: url, start, end: start + url.length, kind: "URL" });
      for (let i = 0; i < trail.length; i++) {
        const s = start + url.length + i;
        out.push({ text: trail[i]!, start: s, end: s + 1, kind: trail[i] === ">" ? "SIMBOLO" : "PONTUACAO" });
      }
      continue;
    }
    const t = m[0];
    const kind: TokenKind = m[2] ? "SIGLA" : m[3] ? "NUMERO" : m[4] ? (isAllCaps(t) ? "SIGLA" : "PALAVRA") : m[5] ? "PONTUACAO" : "SIMBOLO";
    out.push({ text: t, start, end: start + t.length, kind });
  }
  return out;
}

const SENTENCE_END = new Set([".", "!", "?", "…", "..."]);
const CLOSERS = new Set(["”", "\"", "’", "»", ")", "]"]);

function endsSentence(tokens: readonly RawToken[], i: number): boolean {
  const t = tokens[i]!;
  if (!SENTENCE_END.has(t.text)) return false;
  // próximo token significativo (ignora fechamentos de aspas/parênteses)
  let j = i + 1;
  while (j < tokens.length && CLOSERS.has(tokens[j]!.text)) j++;
  const next = tokens[j];
  if (t.text !== ".") return true;
  const prev = tokens[i - 1];
  if (prev && prev.end === t.start) {
    const pk = fold(prev.text);
    if (prev.kind === "PALAVRA" && ABBREV_NEVER_END.has(pk) && prev.text.length <= 6) return false;
    if (prev.kind === "PALAVRA" && MONTHS.has(pk) && (tokens[i - 2]?.kind === "NUMERO" || next?.kind === "NUMERO")) return false;
    // inicial de nome ("J. Silva", "SILVA, J. A.")
    if (prev.kind !== "NUMERO" && /^\p{Lu}$/u.test(prev.text)) return false;
    if (ABBREV_MAY_END.has(pk)) return !next || isCapitalized(next.text);
  }
  if (!next) return true;
  // "p. ex. o sistema": continua em minúscula → não termina
  if (next.kind === "PALAVRA" && !isCapitalized(next.text)) return false;
  return true;
}

/** Segmenta o texto em frases com tokens (posições exatas). Quebra de linha também encerra frase (itens de lista). */
export function tokenize(text: string): { tokens: Token[]; sentences: Sentence[] } {
  const raw = rawTokens(text);
  const tokens: Token[] = [];
  const sentences: Sentence[] = [];
  let current: Token[] = [];
  const close = () => {
    if (!current.length) return;
    const start = current[0]!.start;
    const end = current[current.length - 1]!.end;
    sentences.push({ index: sentences.length, start, end, text: text.slice(start, end), tokens: current });
    current = [];
  };
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]!;
    const prev = raw[i - 1];
    if (prev && text.slice(prev.end, r.start).includes("\n")) close();
    const lower = r.text.toLowerCase();
    const tok: Token = {
      i: tokens.length,
      text: r.text,
      start: r.start,
      end: r.end,
      kind: r.kind,
      lower,
      key: fold(r.text),
      sentence: sentences.length,
      capitalized: isCapitalized(r.text),
    };
    if (r.kind === "PALAVRA" && CONTRACTIONS[lower]) tok.contraction = CONTRACTIONS[lower];
    tokens.push(tok);
    current.push(tok);
    if (endsSentence(raw, i)) {
      // aspas/parênteses de fechamento colados ficam na mesma frase
      while (i + 1 < raw.length && CLOSERS.has(raw[i + 1]!.text) && raw[i + 1]!.start === raw[i]!.end) {
        i++;
        const c = raw[i]!;
        const ct: Token = { i: tokens.length, text: c.text, start: c.start, end: c.end, kind: c.kind, lower: c.text, key: c.text, sentence: sentences.length, capitalized: false };
        tokens.push(ct);
        current.push(ct);
      }
      close();
    }
  }
  close();
  return { tokens, sentences };
}

export const isWord = (t: Token) => t.kind === "PALAVRA" || t.kind === "SIGLA";
