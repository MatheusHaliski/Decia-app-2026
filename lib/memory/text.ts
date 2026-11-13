/**
 * Memória Institucional (RF33) — tratamento de texto em português, sem serviço externo (D-12, D-127). Tudo opera sobre o
 * texto ORIGINAL com posições exatas: a normalização (minúsculas, sem acento, sem hífen) só serve para comparar; a citação
 * usa sempre `body.slice(start, end)` do documento. Funções puras e determinísticas.
 *
 * - `tokenize`: palavras e números com início/fim no texto original;
 * - `fold`/`normalizeToken`: forma de comparação ("Pavimentação" → "pavimentacao", "e-mail" → "email");
 * - `STOPWORDS` + `stem`: radicalização leve do português (plural, sufixos nominais e verbais comuns, vogal final), no
 *   espírito do RSLP, mas conservadora para não confundir palavras diferentes ("portaria" ≠ "porta");
 * - `sentences` + `sectionLabelOf`: frases com posição exata (sem quebrar "Art. 3º", "nº 12/2025", "R$ 1.200,00");
 * - `charGrams` + `fnv1a`: n-gramas de caracteres para o vetor por hashing (robusto a flexão e erro de digitação).
 */

export interface Token {
  /** posição no texto original (início inclusivo, fim exclusivo) */
  start: number;
  end: number;
  /** como aparece no texto */
  raw: string;
  /** forma de comparação: minúsculas, sem acento, sem hífen/apóstrofo */
  norm: string;
}

export interface Span {
  start: number;
  end: number;
}

/** Minúsculas e sem diacríticos ("Ação" → "acao"). Pode mudar o comprimento: nunca use para calcular posições. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
}

/** Forma de comparação de um token: `fold` + sem hífen e apóstrofo ("e-mail" → "email", "d'água" → "dagua"). */
export function normalizeToken(raw: string): string {
  return fold(raw).replace(/[-'’]/g, "");
}

// Palavras (com acento em NFC ou NFD, hifenizadas) e números com separadores internos ("12/2025", "1.200,00", "14.133").
const TOKEN_RE = /[\p{L}\p{M}]+(?:[-'’][\p{L}\p{M}]+)*|\d+(?:[./,]\d+)*/gu;

export function tokenize(text: string, from = 0, to = text.length): Token[] {
  const out: Token[] = [];
  const slice = text.slice(from, to);
  for (const m of slice.matchAll(TOKEN_RE)) {
    const start = from + (m.index ?? 0);
    const raw = m[0];
    out.push({ start, end: start + raw.length, raw, norm: normalizeToken(raw) });
  }
  return out;
}

/**
 * Palavras vazias (já sem acento). Inclui o "enchimento" típico de perguntas ("quem já fez…", "existe algum…") para que a
 * pergunta em linguagem natural pese só pelo conteúdo.
 */
export const STOPWORDS: ReadonlySet<string> = new Set(
  (
    "a o e as os um uma uns umas de da do das dos em na no nas nos num numa por pela pelo pelas pelos para pra pro com sem sob sobre " +
    "entre ate apos ante contra desde perante ou mas nem que se como quando onde quem qual quais quanto quanta quantos quantas cujo cuja " +
    "cujos cujas este esta estes estas esse essa esses essas isso isto aquele aquela aqueles aquelas aquilo ele ela eles elas eu tu nos " +
    "vos voce voces me te lhe lhes seu sua seus suas meu minha meus minhas nosso nossa nossos nossas teu tua dele dela deles delas " +
    "ser sao foi foram era eram sera serao seja sejam sendo sido estar esta estao estava estavam esteve estiveram ter tem tinha tinham " +
    "teve tiveram ha haver havia houve ja nao sim mais menos muito muita muitos muitas tambem so ainda mesmo mesma cada todo toda todos " +
    "todas outro outra outros outras algum alguma alguns algumas alguem nenhum nenhuma qualquer quaisquer tal tais " +
    "fez faz fazer feito feita fizeram existe existem existia sabe saber pode podem poderia deve devem gostaria quero queria preciso " +
    "precisa porque pois entao assim aqui ali la respeito acerca vez vezes caso"
  ).split(/\s+/),
);

export const isStopword = (norm: string) => norm.length < 2 || STOPWORDS.has(norm);

// Sufixos removidos depois do plural, do mais longo ao mais curto. [sufixo, tamanho mínimo do radical que sobra, substituto]
const SUFFIXES: readonly (readonly [string, number, string])[] = [
  ["amente", 4, ""], ["mente", 4, ""],
  ["acao", 3, ""], ["icao", 3, ""], ["ucao", 3, ""],
  ["amento", 3, ""], ["imento", 3, ""],
  ["idade", 4, ""],
  ["aram", 3, ""], ["eram", 3, ""], ["iram", 3, ""], ["avam", 3, ""],
  ["ando", 3, ""], ["endo", 3, ""], ["indo", 3, ""],
  ["ado", 3, ""], ["ada", 3, ""], ["ido", 3, ""], ["ida", 3, ""],
  ["ava", 3, ""], ["ar", 3, ""], ["er", 3, ""], ["ir", 3, ""], ["ou", 3, ""],
];

/**
 * Radicalização leve (sobre a forma já normalizada): plural → sufixo nominal/verbal comum → vogal temática. Exemplos:
 * convênios/convênio → "conveni"; pavimentação/pavimentar/pavimentada → "paviment"; licitações/licitação/licitar → "licit";
 * portarias/portaria → "portari"; fiscais/fiscal → "fiscal"; servidores/servidor → "servidor".
 */
export function stem(norm: string): string {
  let w = norm;
  if (w.length <= 3 || /\d/.test(w)) return w;
  // 1. plural
  if (w.endsWith("oes") || w.endsWith("aes")) w = `${w.slice(0, -3)}ao`;
  else if (w.endsWith("ais") && w.length > 4) w = `${w.slice(0, -3)}al`;
  else if (w.endsWith("eis") && w.length > 5) w = `${w.slice(0, -3)}el`;
  else if (w.endsWith("eis")) w = w.slice(0, -1);
  else if (w.endsWith("ois") && w.length > 4) w = `${w.slice(0, -3)}ol`;
  else if (w.endsWith("ns") && w.length > 3) w = `${w.slice(0, -2)}m`;
  else if (w.endsWith("res") && w.length > 5) w = w.slice(0, -2);
  else if (w.endsWith("s") && w.length > 3 && /[aeo]s$/.test(w)) w = w.slice(0, -1);
  // 2. sufixo nominal ou verbal (um só, o mais longo que couber)
  for (const [suffix, minStem, repl] of SUFFIXES) {
    if (w.endsWith(suffix) && w.length - suffix.length >= minStem) return w.slice(0, -suffix.length) + repl;
  }
  // 3. vogal temática
  if (w.length > 3 && /[aeo]$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Termos de conteúdo de um trecho: tokens sem palavra vazia, com radical. */
export interface Term extends Token {
  stem: string;
}

export function contentTerms(text: string, from = 0, to = text.length): Term[] {
  return tokenize(text, from, to)
    .filter((t) => !isStopword(t.norm))
    .map((t) => ({ ...t, stem: stem(t.norm) }));
}

/* ── Frases com posição exata ───────────────────────────────────────────────────────────────────────────── */

/** Abreviações frequentes em atos e relatórios (o ponto delas não encerra a frase). */
const ABBREVIATIONS: ReadonlySet<string> = new Set(
  "art arts inc incs al alin n nº no nos num p pp pag fl fls sr sra srs dr dra drs prof profa eng arq adv tel cel ex cf etc obs ref proc res port dec min max aprox av r cap vol ed s sa ltda id ib op sec depto coord ger dep".split(" "),
);

const HEADING_RE = /^#{1,6}\s+/;
const LIST_START_RE = /^(?:[-*•]\s|\d+(?:\.\d+)*[.)]\s|[ivxlcdm]+\s*[-–—]\s|art\.?\s*\d|§|cl[aá]usula\b|#)/i;

function isHeadingLine(line: string): boolean {
  return HEADING_RE.test(line);
}

/**
 * Frases do texto com início/fim exatos (sem espaços nas pontas). Fronteiras: linha em branco, título Markdown, item de
 * lista/artigo no começo da próxima linha, linha terminada em pontuação final e, dentro da linha, ". ! ?" seguidos de
 * espaço e de maiúscula/número/abre-aspas — exceto depois de abreviação ou inicial ("Art. 3º", "nº 12", "J. Silva").
 * Linhas quebradas no meio da frase (texto com quebra rígida) continuam a mesma frase.
 */
export function sentences(text: string): Span[] {
  const out: Span[] = [];
  const push = (start: number, end: number) => {
    let s = start;
    let e = end;
    while (s < e && /\s/.test(text[s]!)) s++;
    while (e > s && /\s/.test(text[e - 1]!)) e--;
    if (e > s) out.push({ start: s, end: e });
  };
  // 1. linhas → blocos (respeitando quebra rígida)
  const lines: Span[] = [];
  let ls = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === "\n") {
      lines.push({ start: ls, end: i });
      ls = i + 1;
    }
  }
  const blocks: Span[] = [];
  let blockStart: number | null = null;
  let blockEnd = 0;
  const flush = () => {
    if (blockStart !== null) blocks.push({ start: blockStart, end: blockEnd });
    blockStart = null;
  };
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    const content = text.slice(line.start, line.end);
    const trimmed = content.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (isHeadingLine(trimmed) || LIST_START_RE.test(trimmed)) flush();
    if (blockStart === null) blockStart = line.start;
    blockEnd = line.end;
    const next = lines[li + 1];
    const nextTrim = next ? text.slice(next.start, next.end).trim() : "";
    if (isHeadingLine(trimmed) || /[.!?:;]["'”»)]*$/.test(trimmed) || !nextTrim || LIST_START_RE.test(nextTrim)) flush();
  }
  flush();
  // 2. frases dentro de cada bloco (título fica inteiro: "## 3. Metas" não vira duas frases)
  for (const b of blocks) {
    if (isHeadingLine(text.slice(b.start, b.end).trim())) {
      push(b.start, b.end);
      continue;
    }
    let s = b.start;
    for (let i = b.start; i < b.end; i++) {
      const ch = text[i]!;
      if (ch !== "." && ch !== "!" && ch !== "?") continue;
      let j = i + 1;
      while (j < b.end && /["'”»)]/.test(text[j]!)) j++;
      if (j >= b.end || !/\s/.test(text[j]!)) continue;
      let k = j;
      while (k < b.end && /\s/.test(text[k]!)) k++;
      if (k >= b.end) continue;
      const nextCh = text[k]!;
      if (!/[\p{Lu}\d"“«(§—–-]/u.test(nextCh)) continue;
      const head = text.slice(s, i).trim();
      if (/^(?:\d+(?:\.\d+)*|[ivxlcdm]+|[a-z])$/i.test(head)) continue;
      if (ch === ".") {
        const before = text.slice(s, i).match(/([\p{L}º°]+)$/u)?.[1] ?? "";
        const word = fold(before).replace(/[º°]/g, "");
        if (ABBREVIATIONS.has(word) || (before.length === 1 && /\p{Lu}/u.test(before))) continue;
      }
      push(s, j);
      s = k;
    }
    push(s, b.end);
  }
  return out;
}

/** O texto de uma frase é um título Markdown ("## 3. Metas")? */
export const isHeading = (text: string, span: Span) => HEADING_RE.test(text.slice(span.start, span.end));

/** Rótulo de seção para a citação: título Markdown sem "#", ou o "Art. 3º"/"§ 2º"/"Cláusula 4ª" que abre a frase. */
export function sectionLabelOf(sentence: string): string | null {
  const h = sentence.match(HEADING_RE);
  if (h) return sentence.slice(h[0].length).trim() || null;
  const m = sentence.match(/^(art\.?\s*\d+[ºo°]?(?:-[a-z])?|§\s*\d+[ºo°]?|par[aá]grafo [uú]nico|cl[aá]usula\s+\S+)/i);
  if (!m) return null;
  return m[1]!.replace(/^art\.?\s*/i, "art. ").replace(/\s+/g, " ").trim();
}

/* ── N-gramas de caracteres por hashing ─────────────────────────────────────────────────────────────────── */

/** Trigramas com marcadores de borda ("#ata#" → "#at", "ata", "ta#"). */
export function charGrams(norm: string, n = 3): string[] {
  const padded = `#${norm}#`;
  if (padded.length <= n) return [padded];
  const out: string[] = [];
  for (let i = 0; i + n <= padded.length; i++) out.push(padded.slice(i, i + n));
  return out;
}

/** FNV-1a 32 bits (determinístico, sem dependência). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Espaço do hashing dos n-gramas (2^18 posições; vetores esparsos, só as posições usadas ocupam memória). */
export const CHAR_BUCKETS = 1 << 18;
export const gramBucket = (gram: string) => fnv1a(gram) & (CHAR_BUCKETS - 1);

/** Coeficiente de Dice entre os trigramas de duas formas (0–1): base do casamento aproximado de termos. */
export function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const ga = charGrams(a);
  const gb = charGrams(b);
  const counts = new Map<string, number>();
  for (const g of ga) counts.set(g, (counts.get(g) ?? 0) + 1);
  let shared = 0;
  for (const g of gb) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      shared++;
      counts.set(g, c - 1);
    }
  }
  return (2 * shared) / (ga.length + gb.length);
}
