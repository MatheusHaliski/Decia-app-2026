/**
 * Etiquetador morfossintático heurístico (RF53.CA01/CA02): léxico fechado + analisador verbal + sufixos + regras de
 * contexto. Cada token recebe classe, probabilidade, subtipo e — quando dá para afirmar — tempo/modo verbal. Abaixo do
 * limiar (`ASSERT_THRESHOLD`) a classe NÃO é afirmada: o token sai "ambíguo" com as hipóteses em ordem.
 * Não é um analisador treinado em corpus: as probabilidades são priors das regras, não acurácia medida.
 */
import { AUX_LEMMAS, CLOSED_CLASS, CLITICS, NOUN_HOMOGRAPHS, SUBJECT_PRONOUNS, lexicon, type Reading } from "./lexicon";
import { fold } from "./text";
import { tokenize } from "./tokenize";
import { ASSERT_THRESHOLD, type PartOfSpeech, type Sentence, type TagReason, type TaggedSentence, type TaggedToken, type Token, type VerbReading } from "./types";
import { verbFeatures, verbReadings } from "./verbs";

interface Work {
  t: Token;
  /** leituras de base (léxico, verbo, sufixo): cada passada de contexto recomeça delas */
  base: Reading[];
  readings: Reading[];
  verbs: VerbReading[];
  reason: TagReason;
  locution?: string;
  /** locução: classe fixa */
  fixed?: boolean;
  /** decidido por regra de classe fechada */
  forced?: boolean;
}

const R = (pos: PartOfSpeech, p: number, sub?: string): Reading => ({ pos, p, sub });

/* ── Locuções (classe da expressão inteira) ──────────────────────────────────────────────────────────────── */

const LOCUTIONS: readonly [string, PartOfSpeech][] = (
  [
    ["no entanto", "CONJUNCAO"], ["por isso", "CONJUNCAO"], ["por conseguinte", "CONJUNCAO"], ["à medida que", "CONJUNCAO"],
    ["a medida que", "CONJUNCAO"], ["à proporção que", "CONJUNCAO"], ["ao passo que", "CONJUNCAO"], ["visto que", "CONJUNCAO"],
    ["uma vez que", "CONJUNCAO"], ["já que", "CONJUNCAO"], ["de modo que", "CONJUNCAO"], ["de forma que", "CONJUNCAO"],
    ["de maneira que", "CONJUNCAO"], ["a fim de que", "CONJUNCAO"], ["para que", "CONJUNCAO"], ["ainda que", "CONJUNCAO"],
    ["mesmo que", "CONJUNCAO"], ["se bem que", "CONJUNCAO"], ["posto que", "CONJUNCAO"], ["dado que", "CONJUNCAO"],
    ["desde que", "CONJUNCAO"], ["contanto que", "CONJUNCAO"], ["a menos que", "CONJUNCAO"], ["assim que", "CONJUNCAO"],
    ["logo que", "CONJUNCAO"], ["sempre que", "CONJUNCAO"], ["antes que", "CONJUNCAO"], ["depois que", "CONJUNCAO"],
    ["bem como", "CONJUNCAO"], ["assim como", "CONJUNCAO"], ["tal como", "CONJUNCAO"], ["ou seja", "CONJUNCAO"],
    ["isto é", "CONJUNCAO"], ["não só", "CONJUNCAO"], ["mas também", "CONJUNCAO"], ["por outro lado", "CONJUNCAO"],
    ["em contrapartida", "CONJUNCAO"],
    ["a fim de", "PREPOSICAO"], ["por meio de", "PREPOSICAO"], ["de acordo com", "PREPOSICAO"], ["apesar de", "PREPOSICAO"],
    ["além de", "PREPOSICAO"], ["em vez de", "PREPOSICAO"], ["ao invés de", "PREPOSICAO"], ["por causa de", "PREPOSICAO"],
    ["em razão de", "PREPOSICAO"], ["em função de", "PREPOSICAO"], ["devido a", "PREPOSICAO"], ["devido à", "PREPOSICAO"],
    ["devido ao", "PREPOSICAO"], ["graças a", "PREPOSICAO"], ["junto a", "PREPOSICAO"], ["junto de", "PREPOSICAO"],
    ["em relação a", "PREPOSICAO"], ["com relação a", "PREPOSICAO"], ["quanto a", "PREPOSICAO"], ["a respeito de", "PREPOSICAO"],
    ["acerca de", "PREPOSICAO"], ["a partir de", "PREPOSICAO"], ["antes de", "PREPOSICAO"], ["depois de", "PREPOSICAO"],
    ["dentro de", "PREPOSICAO"], ["fora de", "PREPOSICAO"], ["perto de", "PREPOSICAO"], ["longe de", "PREPOSICAO"],
    ["acima de", "PREPOSICAO"], ["abaixo de", "PREPOSICAO"], ["em torno de", "PREPOSICAO"], ["ao lado de", "PREPOSICAO"],
    ["por conta de", "PREPOSICAO"], ["no âmbito de", "PREPOSICAO"], ["em nível de", "PREPOSICAO"], ["a nível de", "PREPOSICAO"],
    ["à luz de", "PREPOSICAO"], ["diante de", "PREPOSICAO"], ["por parte de", "PREPOSICAO"], ["em prol de", "PREPOSICAO"],
    ["em face de", "PREPOSICAO"], ["com base em", "PREPOSICAO"],
    ["às vezes", "ADVERBIO"], ["de repente", "ADVERBIO"], ["de vez em quando", "ADVERBIO"], ["em breve", "ADVERBIO"],
    ["por enquanto", "ADVERBIO"], ["sem dúvida", "ADVERBIO"], ["de fato", "ADVERBIO"], ["com certeza", "ADVERBIO"],
    ["por fim", "ADVERBIO"], ["em suma", "ADVERBIO"], ["em seguida", "ADVERBIO"], ["além disso", "ADVERBIO"],
    ["dessa forma", "ADVERBIO"], ["desse modo", "ADVERBIO"], ["deste modo", "ADVERBIO"], ["desta forma", "ADVERBIO"],
    ["por exemplo", "ADVERBIO"], ["em geral", "ADVERBIO"], ["a seguir", "ADVERBIO"], ["ao mesmo tempo", "ADVERBIO"],
    ["cada vez mais", "ADVERBIO"], ["por sua vez", "ADVERBIO"], ["mesmo assim", "ADVERBIO"], ["ainda assim", "ADVERBIO"],
    ["apesar disso", "ADVERBIO"],
  ] as [string, PartOfSpeech][]
).sort((a, b) => b[0].split(" ").length - a[0].split(" ").length);

const QUANTIFIERS = new Set(["todas", "muitas", "poucas", "várias", "algumas", "das", "nas", "pelas", "duas", "três", "quantas", "tantas", "outras", "as", "certas", "diversas"]);
const LOC_KEYS = LOCUTIONS.map(([text, pos]) => ({ keys: text.split(" ").map(fold), text, pos }));

/** Marca locuções (sequências de palavras dentro da mesma frase). */
function markLocutions(work: Work[]) {
  for (let i = 0; i < work.length; i++) {
    if (work[i]!.locution) continue;
    for (const loc of LOC_KEYS) {
      const n = loc.keys.length;
      if (i + n > work.length) continue;
      let ok = true;
      for (let k = 0; k < n; k++) {
        const w = work[i + k]!.t;
        if (w.kind !== "PALAVRA" || w.key !== loc.keys[k] || w.sentence !== work[i]!.t.sentence) { ok = false; break; }
      }
      if (!ok) continue;
      // "todas as vezes": artigo + substantivo, não a locução "às vezes"
      const before = work[i - 1]?.t;
      if (loc.text === "às vezes" && work[i]!.t.lower === "as" && before && before.sentence === work[i]!.t.sentence && QUANTIFIERS.has(before.lower)) continue;
      for (let k = 0; k < n; k++) {
        const w = work[i + k]!;
        w.readings = [R(loc.pos, 0.9, "locução")];
        w.base = w.readings.map((x) => ({ ...x }));
        w.reason = "LOCUCAO";
        w.locution = loc.text;
        w.fixed = true;
        w.verbs = [];
      }
      break;
    }
  }
}

/* ── Sufixos (palavras fora do léxico e do analisador verbal) ─────────────────────────────────────────────── */

const SUFFIX_RULES: readonly [RegExp, Reading[], string[]?][] = [
  [/mente$/, [R("ADVERBIO", 0.95, "modo")]],
  [/(ariam|eriam|iriam|aríamos|eríamos|iríamos)$/, [R("VERBO", 0.95)], ["Ft3p"]],
  [/(ávamos|íamos)$/, [R("VERBO", 0.95)], ["I1p"]],
  [/(aram|eram|iram)$/, [R("VERBO", 0.9)], ["F3p", "M3p"]],
  [/(arão|erão|irão)$/, [R("VERBO", 0.9)], ["Fp3p"]],
  [/(ará|erá|irá)$/, [R("VERBO", 0.9)], ["Fp3s"]],
  [/avam$/, [R("VERBO", 0.9)], ["I3p"]],
  [/ava$/, [R("VERBO", 0.75), R("SUBSTANTIVO", 0.25)], ["I1s", "I3s"]],
  [/ou$/, [R("VERBO", 0.85)], ["F3s"]],
  [/(ando|endo|indo)$/, [R("VERBO", 0.85), R("ADJETIVO", 0.15)], ["GER"]],
  [/(assem|essem|issem)$/, [R("VERBO", 0.9)], ["Si3p"]],
  [/(asse|esse|isse)$/, [R("VERBO", 0.75), R("SUBSTANTIVO", 0.25)], ["Si1s", "Si3s"]],
  [/(ção|ções|são|sões|dade|dades|tude|tudes|ismo|ismos|mento|mentos|agem|agens|ência|ências|ância|âncias|eza|ezas|ice|ices)$/, [R("SUBSTANTIVO", 0.9), R("ADJETIVO", 0.1)]],
  [/(íssimo|íssima|íssimos|íssimas)$/, [R("ADJETIVO", 0.95, "superlativo")]],
  [/(ável|ível|úvel|áveis|íveis)$/, [R("ADJETIVO", 0.9), R("SUBSTANTIVO", 0.1)]],
  [/(oso|osa|osos|osas)$/, [R("ADJETIVO", 0.85), R("SUBSTANTIVO", 0.15)]],
  [/(dor|dores|tor|tores|sor|sores|dora|doras|tora|toras)$/, [R("SUBSTANTIVO", 0.7), R("ADJETIVO", 0.3)]],
  [/(ense|enses)$/, [R("ADJETIVO", 0.8), R("SUBSTANTIVO", 0.2)]],
  [/(ivo|iva|ivos|ivas)$/, [R("ADJETIVO", 0.6), R("SUBSTANTIVO", 0.4)]],
  [/(ico|ica|icos|icas)$/, [R("ADJETIVO", 0.55), R("SUBSTANTIVO", 0.45)]],
  [/(al|ais)$/, [R("ADJETIVO", 0.6), R("SUBSTANTIVO", 0.4)]],
  [/(ante|antes|ente|entes|inte|intes)$/, [R("ADJETIVO", 0.5), R("SUBSTANTIVO", 0.5)]],
  [/(ário|ária|ários|árias|ório|ória|órios|órias)$/, [R("SUBSTANTIVO", 0.6), R("ADJETIVO", 0.4)]],
  [/(eiro|eira|eiros|eiras)$/, [R("SUBSTANTIVO", 0.6), R("ADJETIVO", 0.4)]],
  [/(ista|istas)$/, [R("SUBSTANTIVO", 0.6), R("ADJETIVO", 0.4)]],
  [/(ia|ias)$/, [R("SUBSTANTIVO", 0.8), R("VERBO", 0.2)]],
  [/(ura|uras)$/, [R("SUBSTANTIVO", 0.75), R("ADJETIVO", 0.25)]],
  [/(ês|esa|eses|esas)$/, [R("ADJETIVO", 0.5), R("SUBSTANTIVO", 0.5)]],
  [/(amos|emos|imos)$/, [R("VERBO", 0.75), R("SUBSTANTIVO", 0.25)], ["P1p", "F1p"]],
  // "dúvida", "válido", "rápido": acento antes da terminação → não é particípio
  [/[áéíóúâêô][^áéíóúâêô]*(ado|ada|ados|adas|ido|ida|idos|idas)$/, [R("ADJETIVO", 0.5), R("SUBSTANTIVO", 0.5)]],
  [/(ado|ada|ados|adas|ido|ida|idos|idas)$/, [R("ADJETIVO", 0.4), R("SUBSTANTIVO", 0.35), R("VERBO", 0.25)], ["PART"]],
  [/(ar|er|ir)$/, [R("VERBO", 0.5), R("SUBSTANTIVO", 0.3), R("ADJETIVO", 0.2)], ["INF"]],
  [/gem$/, [R("SUBSTANTIVO", 0.9)]],
  [/am$/, [R("VERBO", 0.85), R("SUBSTANTIVO", 0.15)], ["P3p"]],
  [/em$/, [R("VERBO", 0.5), R("SUBSTANTIVO", 0.5)], ["P3p"]],
  // plural sem outra pista: nome ou adjetivo
  [/[aeiouáéíóúâêô]s$/, [R("SUBSTANTIVO", 0.6), R("ADJETIVO", 0.35), R("VERBO", 0.05)]],
];

const CODE_TO_READING: Record<string, Omit<VerbReading, "lemma">> = {
  Ft3p: { tempo: "FUTURO_DO_PRETERITO", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  I1p: { tempo: "PRETERITO_IMPERFEITO", modo: "INDICATIVO", pessoa: 1, numero: "PL" },
  F3p: { tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  M3p: { tempo: "PRETERITO_MAIS_QUE_PERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  Fp3p: { tempo: "FUTURO_DO_PRESENTE", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  Fp3s: { tempo: "FUTURO_DO_PRESENTE", modo: "INDICATIVO", pessoa: 3, numero: "SG" },
  I3p: { tempo: "PRETERITO_IMPERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  I1s: { tempo: "PRETERITO_IMPERFEITO", modo: "INDICATIVO", pessoa: 1, numero: "SG" },
  I3s: { tempo: "PRETERITO_IMPERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "SG" },
  F3s: { tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO", pessoa: 3, numero: "SG" },
  Si3p: { tempo: "PRETERITO_IMPERFEITO", modo: "SUBJUNTIVO", pessoa: 3, numero: "PL" },
  Si1s: { tempo: "PRETERITO_IMPERFEITO", modo: "SUBJUNTIVO", pessoa: 1, numero: "SG" },
  Si3s: { tempo: "PRETERITO_IMPERFEITO", modo: "SUBJUNTIVO", pessoa: 3, numero: "SG" },
  P1p: { tempo: "PRESENTE", modo: "INDICATIVO", pessoa: 1, numero: "PL" },
  F1p: { tempo: "PRETERITO_PERFEITO", modo: "INDICATIVO", pessoa: 1, numero: "PL" },
  P3p: { tempo: "PRESENTE", modo: "INDICATIVO", pessoa: 3, numero: "PL" },
  GER: { forma: "GERUNDIO" },
  PART: { forma: "PARTICIPIO" },
  INF: { forma: "INFINITIVO" },
};

/* ── Leituras de base ────────────────────────────────────────────────────────────────────────────────────── */

const isNominal = (pos: PartOfSpeech) => pos === "SUBSTANTIVO" || pos === "ADJETIVO";

function verbPrior(form: string, verbs: readonly VerbReading[]): Reading[] {
  const formas = new Set(verbs.map((v) => v.forma ?? "FINITA"));
  const homograph = NOUN_HOMOGRAPHS.has(form) || NOUN_HOMOGRAPHS.has(form.replace(/s$/, ""));
  if (formas.size === 1 && formas.has("GERUNDIO")) return [R("VERBO", 0.95)];
  if (formas.has("INFINITIVO")) return [R("VERBO", 0.85), R("SUBSTANTIVO", 0.15)];
  if (formas.size === 1 && formas.has("PARTICIPIO")) return homograph ? [R("SUBSTANTIVO", 0.45), R("ADJETIVO", 0.3), R("VERBO", 0.25)] : [R("VERBO", 0.4), R("ADJETIVO", 0.35), R("SUBSTANTIVO", 0.25)];
  if (homograph) return [R("VERBO", 0.4), R("SUBSTANTIVO", 0.6)];
  return [R("VERBO", 0.95), R("SUBSTANTIVO", 0.05)];
}

function suffixReadings(lower: string): { readings: Reading[]; verbs: VerbReading[] } | null {
  for (const [re, readings, codes] of SUFFIX_RULES) {
    if (!re.test(lower)) continue;
    const verbs = (codes ?? []).map((c) => ({ lemma: "", ...CODE_TO_READING[c]! }));
    return { readings: readings.map((x) => ({ ...x })), verbs };
  }
  return null;
}

function baseWork(t: Token, clauseStart: boolean, inTitle: boolean, allCapsSentence: boolean): Work {
  const w: Work = { t, base: [], readings: [], verbs: [], reason: "PADRAO" };
  if (t.kind === "PONTUACAO" || t.kind === "SIMBOLO" || t.kind === "URL") return w;
  if (t.kind === "NUMERO") {
    w.readings = [R("NUMERAL", 0.95, /[ºª°]$/.test(t.text) ? "ordinal" : "cardinal")];
    w.reason = "NUMERO";
    return w;
  }
  if (t.kind === "SIGLA" && !allCapsSentence) {
    w.readings = [R("SUBSTANTIVO", 0.9, "sigla")];
    w.reason = "SIGLA";
    return w;
  }
  const lower = t.lower;
  // ênclise/mesóclise: realizou-se, encaminhá-lo, dir-se-ia
  if (lower.includes("-")) {
    const [head, ...rest] = lower.split("-");
    if (head && rest.length && rest.every((p) => CLITICS.has(p) || /^(ia|á|ão|ei|emos|iam)$/.test(p))) {
      const verbs = verbReadings(head);
      w.readings = [R("VERBO", 0.9, "com pronome oblíquo")];
      w.verbs = verbs;
      w.reason = verbs.length ? "VERBO_CONHECIDO" : "SUFIXO";
      return w;
    }
    w.readings = [R("SUBSTANTIVO", 0.6, "composto"), R("ADJETIVO", 0.4)];
    w.reason = "SUFIXO";
    return w;
  }
  const lex = lexicon(lower);
  const verbs = verbReadings(lower);
  if (t.contraction) {
    const [prep, second] = t.contraction;
    w.readings = [R("PREPOSICAO", 0.95, `contração (${prep} + ${second})`)];
    if (lower === "nos") w.readings = [R("PREPOSICAO", 0.6, "contração (em + os)"), R("PRONOME", 0.4, "pessoal oblíquo")];
    if ((lower === "deste" || lower === "desse") && verbs.length) w.readings = [R("PREPOSICAO", 0.85, `contração (${prep} + ${second})`), R("VERBO", 0.15)];
    w.verbs = verbs;
    w.reason = "LEXICO";
    return w;
  }
  if (lex) {
    w.readings = lex.map((x) => ({ ...x }));
    w.verbs = lex.some((x) => x.pos === "VERBO") ? verbs : [];
    w.reason = "LEXICO";
    return w;
  }
  if (verbs.length) {
    w.readings = verbPrior(lower, verbs);
    w.verbs = verbs;
    w.reason = "VERBO_CONHECIDO";
    return w;
  }
  // nome próprio: maiúscula no meio da oração (fora de títulos, onde a caixa alta é estilística)
  if (t.capitalized && !clauseStart && !inTitle && !allCapsSentence) {
    w.readings = [R("SUBSTANTIVO", 0.85, "próprio")];
    w.reason = "NOME_PROPRIO";
    return w;
  }
  const suf = suffixReadings(lower);
  if (suf) {
    w.readings = suf.readings;
    w.verbs = suf.verbs;
    w.reason = "SUFIXO";
    return w;
  }
  w.readings = [R("SUBSTANTIVO", 0.5), R("ADJETIVO", 0.3), R("VERBO", 0.2)];
  w.reason = "PADRAO";
  return w;
}

/* ── Contexto ────────────────────────────────────────────────────────────────────────────────────────────── */

function best(w: Work | undefined): Reading | undefined {
  if (!w || !w.readings.length) return undefined;
  return w.readings.reduce((a, b) => (b.p > a.p ? b : a));
}
const pOf = (w: Work, pos: PartOfSpeech) => w.readings.filter((x) => x.pos === pos).reduce((s, x) => s + x.p, 0);
function scale(w: Work, pos: PartOfSpeech, k: number) {
  for (const x of w.readings) if (x.pos === pos) x.p *= k;
}
function force(w: Work, pos: PartOfSpeech, p: number, sub?: string) {
  const keep = w.readings.find((x) => x.pos === pos);
  const rest = w.readings.filter((x) => x.pos !== pos);
  const restTotal = rest.reduce((s, x) => s + x.p, 0) || 1;
  w.readings = [{ pos, p, sub: sub ?? keep?.sub }, ...rest.map((x) => ({ ...x, p: ((1 - p) * x.p) / restTotal }))];
  w.reason = "CONTEXTO";
  w.forced = true;
}
const normalize = (w: Work) => {
  const total = w.readings.reduce((s, x) => s + x.p, 0);
  if (total > 0) for (const x of w.readings) x.p /= total;
};

const DETERMINER_SUBS = /possessivo|demonstrativo|indefinido|definido|contração \((de|em|a|por|para) \+ (o|a|os|as|um|uma|este|esta|esse|essa|aquele|aquela)/;
const isDeterminer = (w: Work | undefined) => {
  const b = best(w);
  if (!b || !w) return false;
  if (b.pos === "ARTIGO" || b.pos === "NUMERAL") return true;
  return (b.pos === "PRONOME" || b.pos === "PREPOSICAO") && DETERMINER_SUBS.test(b.sub ?? "") && !/oblíquo|reto/.test(b.sub ?? "");
};
const PURE_PREPS = new Set(["de", "para", "por", "sem", "a", "após", "até", "ao", "pra", "em"]);
const INTENSIFIERS = new Set(["muito", "mais", "menos", "tão", "bastante", "pouco", "bem", "demasiado", "extremamente", "bastante"]);
const COPULAS = new Set(["ser", "ser|ir", "estar", "ficar"]);
const SUBORDINATORS_FUT = new Set(["quando", "se", "enquanto", "conforme", "onde", "quem", "sempre", "logo", "assim", "caso"]);

const finiteVerbOnly = (w: Work | undefined) => !!w && pOf(w, "VERBO") >= 0.85 && w.verbs.some((v) => !v.forma) && !w.readings.some((x) => isNominal(x.pos) && x.p >= 0.15);
const hasInfinitive = (w: Work | undefined) => !!w && w.verbs.some((v) => v.forma === "INFINITIVO");
/** "a pé", "a prazo": nome com cara de masculino (-o, -ema); -ão e -or ficam de fora ("a reunião", "a cor") */
const looksMasculine = (w: Work | undefined) => !!w && isNominal(best(w)?.pos ?? "ARTIGO") && /(o|os|ema|emas)$/.test(w.t.lower) && !/(ão|ões)$/.test(w.t.lower);

function contextPass(work: Work[]) {
  for (let i = 0; i < work.length; i++) {
    const c = work[i]!;
    if (c.fixed || c.forced || c.base.length < 2) continue;
    c.readings = c.base.map((x) => ({ ...x }));
    const prev = adjacent(work, i, -1);
    const nominalBase = c.base.some((x) => isNominal(x.pos) && x.p >= 0.15);
    // determinante à esquerda → nome, nunca verbo finito ("a" + infinitivo é preposição: "começou a trabalhar")
    if (isDeterminer(prev) && nominalBase && !(prev!.t.lower === "a" && hasInfinitive(c))) {
      scale(c, "VERBO", 0.15);
      scale(c, "SUBSTANTIVO", 2);
      scale(c, "ADJETIVO", 1.2);
    }
    if (prev) {
      const pl = prev.t.lower;
      const pb = best(prev);
      // sujeito pronominal, clítico ou "não" à esquerda → verbo
      if (SUBJECT_PRONOUNS[pl] || ["me", "te", "lhe", "lhes", "vos", "não", "já", "nunca", "também"].includes(pl) || (pl === "se" && pb?.pos === "PRONOME")) {
        scale(c, "VERBO", 4);
        scale(c, "SUBSTANTIVO", 0.3);
      }
      // auxiliar à esquerda → forma nominal do verbo (ou predicativo, com ser/estar/ficar)
      if (pb?.pos === "VERBO" && prev.verbs.some((v) => AUX_LEMMAS.has(v.lemma) && !v.forma)) {
        if (c.verbs.some((v) => v.forma)) scale(c, "VERBO", 4);
        if (prev.verbs.some((v) => COPULAS.has(v.lemma))) {
          scale(c, "ADJETIVO", 2.5);
          scale(c, "SUBSTANTIVO", 0.6);
          if (!c.verbs.some((v) => v.forma)) scale(c, "VERBO", 0.3);
        }
      } else if (pb?.pos === "VERBO" && c.readings.some((x) => x.pos === "SUBSTANTIVO")) {
        // verbo pleno à esquerda: complemento ou sujeito posposto
        scale(c, "SUBSTANTIVO", 1.3);
      }
      // preposição à esquerda → infinitivo ou nome
      if (pb?.pos === "PREPOSICAO") {
        if (hasInfinitive(c) && PURE_PREPS.has(pl)) scale(c, "VERBO", 3);
        else {
          scale(c, "SUBSTANTIVO", 1.5);
          if (!hasInfinitive(c)) scale(c, "VERBO", 0.2);
        }
      }
      // nome à esquerda → adjetivo posposto
      if (pb?.pos === "SUBSTANTIVO" && c.readings.some((x) => x.pos === "ADJETIVO")) scale(c, "ADJETIVO", 1.8);
      // intensificador à esquerda → adjetivo
      if (INTENSIFIERS.has(pl) && c.readings.some((x) => x.pos === "ADJETIVO")) {
        scale(c, "ADJETIVO", 3);
        scale(c, "SUBSTANTIVO", 0.5);
      }
    }
    normalize(c);
  }
}

/** Token de palavra imediatamente vizinho na mesma frase (pontuação interrompe). */
function adjacent(work: Work[], i: number, dir: -1 | 1): Work | undefined {
  const n = work[i + dir];
  if (!n || n.t.sentence !== work[i]!.t.sentence) return undefined;
  if (n.t.kind === "PONTUACAO" || n.t.kind === "SIMBOLO" || n.t.kind === "URL") return undefined;
  return n;
}

function closedClassPass(work: Work[], sentences: readonly Sentence[]) {
  for (let i = 0; i < work.length; i++) {
    const c = work[i]!;
    if (c.fixed || c.forced || c.base.length < 2) continue;
    const l = c.t.lower;
    const prev = adjacent(work, i, -1);
    const next = adjacent(work, i, 1);
    const nextTok = work[i + 1]?.t;
    const nb = best(next);
    const pb = best(prev);
    const sentence = sentences[c.t.sentence];
    switch (l) {
      case "o": case "os": case "a": case "as": {
        if (finiteVerbOnly(next)) force(c, "PRONOME", 0.85, "oblíquo");
        else if (l === "a" && hasInfinitive(next) && (nb?.pos === "VERBO")) force(c, "PREPOSICAO", 0.9, "essencial");
        else if (l === "a" && looksMasculine(next)) force(c, "PREPOSICAO", 0.65, "essencial");
        else if (next && nb && (isNominal(nb.pos) || nb.pos === "NUMERAL" || (nb.pos === "PRONOME" && /possessivo/.test(nb.sub ?? "")) || next.readings.some((x) => isNominal(x.pos) && x.p >= 0.2))) force(c, "ARTIGO", 0.85, "definido");
        else if (!next && pb?.pos === "VERBO") force(c, "PRONOME", 0.8, "oblíquo");
        break;
      }
      case "nos":
        if (finiteVerbOnly(next)) force(c, "PRONOME", 0.85, "pessoal oblíquo");
        else if (next && nb && isNominal(nb.pos)) force(c, "PREPOSICAO", 0.85, "contração (em + os)");
        break;
      case "um": case "uma":
        if (prev && ["apenas", "só", "somente", "mais", "menos", "de"].includes(prev.t.lower)) force(c, "NUMERAL", 0.8, "cardinal");
        else if (next && ["dos", "das", "de", "deles", "delas"].includes(next.t.lower)) force(c, "NUMERAL", 0.7, "cardinal");
        else if (nb && isNominal(nb.pos)) force(c, "ARTIGO", 0.7, "indefinido");
        break;
      case "que":
        if (pb && (pb.pos === "SUBSTANTIVO" || (pb.pos === "PRONOME" && /demonstrativo|indefinido/.test(pb.sub ?? "")) || ["o", "a", "os", "as"].includes(prev!.t.lower))) force(c, "PRONOME", 0.75, "relativo");
        else if (pb?.pos === "VERBO") force(c, "CONJUNCAO", 0.8, "integrante");
        else if (prev && ["mais", "menos", "antes", "depois", "já", "desde", "para", "logo", "visto", "assim", "mesmo", "ainda", "tanto", "tão", "do"].includes(prev.t.lower)) force(c, "CONJUNCAO", 0.8);
        break;
      case "se":
        if (nb?.pos === "VERBO" && next!.verbs.length && next!.verbs.every((v) => v.modo === "SUBJUNTIVO")) force(c, "CONJUNCAO", 0.8, "condicional");
        else if (next && (nb?.pos === "ARTIGO" || nb?.pos === "SUBSTANTIVO" || SUBJECT_PRONOUNS[next.t.lower] || next.t.lower === "não")) force(c, "CONJUNCAO", 0.75, "condicional");
        else if (nb?.pos === "VERBO") force(c, "PRONOME", 0.8, "oblíquo");
        break;
      case "como":
        if (prev && ["tal", "assim", "bem", "tão", "tanto"].includes(prev.t.lower)) force(c, "CONJUNCAO", 0.85, "comparativa");
        else if (sentence && sentence.tokens[0]?.i === c.t.i && sentence.text.trim().endsWith("?")) force(c, "ADVERBIO", 0.8, "interrogativo");
        else if (prev && SUBJECT_PRONOUNS[prev.t.lower]) { /* "eu como": verbo comer — fora do léxico; fica ambíguo */ }
        break;
      case "nossa":
        if (!prev && nextTok && ["!", ","].includes(nextTok.text)) force(c, "INTERJEICAO", 0.85);
        break;
      case "segundo": case "conforme":
        if (next && (nb?.pos === "ARTIGO" || best(next)?.sub === "próprio" || SUBJECT_PRONOUNS[next.t.lower] || next.t.contraction)) force(c, "PREPOSICAO", 0.8, "acidental");
        else if (l === "segundo" && pb?.pos === "ARTIGO") force(c, nb && isNominal(nb.pos) ? "NUMERAL" : "SUBSTANTIVO", 0.8);
        else if (l === "conforme" && nb?.pos === "VERBO") force(c, "CONJUNCAO", 0.8, "conformativa");
        break;
      case "muito": case "pouco": case "tanto": case "bastante":
        if (nb?.pos === "SUBSTANTIVO") force(c, "PRONOME", 0.8, "indefinido");
        else if (!next || nb?.pos === "ADJETIVO" || nb?.pos === "ADVERBIO" || nb?.pos === "VERBO" || pb?.pos === "VERBO") force(c, "ADVERBIO", 0.8, "intensidade");
        break;
      case "só":
        if (pb?.pos === "VERBO" && prev!.verbs.some((v) => ["ser", "estar", "ficar", "ser|ir"].includes(v.lemma))) force(c, "ADJETIVO", 0.8);
        else if (nb && ["VERBO", "ARTIGO", "PREPOSICAO", "PRONOME", "NUMERAL"].includes(nb.pos)) force(c, "ADVERBIO", 0.8, "exclusão");
        break;
      case "logo":
        if (nextTok?.text === ",") force(c, "CONJUNCAO", 0.75, "conclusiva");
        break;
      case "caso":
        if (isDeterminer(prev)) force(c, "SUBSTANTIVO", 0.9);
        else if (next && (nb?.pos === "ARTIGO" || nb?.pos === "PRONOME" || (nb?.pos === "VERBO" && next.verbs.some((v) => v.modo === "SUBJUNTIVO")))) force(c, "CONJUNCAO", 0.8, "condicional");
        break;
      case "bem": case "mal":
        if (pb?.pos === "ARTIGO") force(c, "SUBSTANTIVO", 0.85);
        break;
      case "fora":
        if ((pb?.pos === "VERBO" && prev!.verbs.some((v) => ["ser", "estar", "ficar"].includes(v.lemma))) || prev?.t.lower === "lá" || next?.t.lower === "de") force(c, "ADVERBIO", 0.8, "lugar");
        break;
      case "via":
        if (isDeterminer(prev)) force(c, "SUBSTANTIVO", 0.85);
        else if (nb && isNominal(nb.pos)) force(c, "PREPOSICAO", 0.7, "acidental");
        break;
      case "quer":
        if (sentence && sentence.tokens.filter((x) => x.lower === "quer").length >= 2) force(c, "CONJUNCAO", 0.85, "alternativa");
        break;
    }
    normalize(c);
  }
}

/** Infinitivo × futuro do subjuntivo: só depois de conjunção subordinativa o futuro do subjuntivo é lido. */
function restrictVerbs(work: Work[]) {
  for (let i = 0; i < work.length; i++) {
    const c = work[i]!;
    if (!c.verbs.length) continue;
    const hasInf = c.verbs.some((v) => v.forma === "INFINITIVO");
    const hasFut = c.verbs.some((v) => v.modo === "SUBJUNTIVO" && v.tempo === "FUTURO");
    if (!(hasInf && hasFut)) continue;
    // procura conjunção nos dois tokens anteriores ("quando o servidor for", "se houver")
    const prevWords = [work[i - 1], work[i - 2], work[i - 3]].filter((x): x is Work => !!x && x.t.sentence === c.t.sentence).map((x) => x.t.lower);
    const subj = prevWords.some((x) => SUBORDINATORS_FUT.has(x));
    c.verbs = c.verbs.filter((v) => (subj ? v.modo === "SUBJUNTIVO" : v.forma === "INFINITIVO"));
  }
}

/* ── API ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const CLAUSE_OPENERS = new Set([":", "(", "“", "\"", "—", "–", "«", "‘", "[", "-"]);

/** Etiqueta os tokens de um bloco já tokenizado. `inTitle` desliga a regra de nome próprio pela maiúscula. */
export function tagTokens(tokens: readonly Token[], sentences: readonly Sentence[], opts: { inTitle?: boolean } = {}): TaggedToken[] {
  const allCaps = new Set<number>();
  for (const s of sentences) {
    const words = s.tokens.filter((t) => t.kind === "PALAVRA" || t.kind === "SIGLA");
    if (words.length >= 3 && words.filter((t) => t.kind === "SIGLA" || t.text === t.text.toUpperCase()).length / words.length >= 0.6) allCaps.add(s.index);
  }
  const work: Work[] = tokens.map((t, i) => {
    const prev = tokens[i - 1];
    const clauseStart = !prev || prev.sentence !== t.sentence || CLAUSE_OPENERS.has(prev.text);
    return baseWork(t, clauseStart, !!opts.inTitle, allCaps.has(t.sentence));
  });
  for (const w of work) w.base = w.readings.map((x) => ({ ...x }));
  markLocutions(work);
  contextPass(work);
  closedClassPass(work, sentences);
  contextPass(work);
  closedClassPass(work, sentences);
  contextPass(work);
  restrictVerbs(work);
  return work.map(finalize);
}

function finalize(w: Work): TaggedToken {
  const byPos = new Map<PartOfSpeech, { p: number; sub?: string }>();
  for (const x of w.readings) {
    const cur = byPos.get(x.pos);
    if (!cur) byPos.set(x.pos, { p: x.p, sub: x.sub });
    else byPos.set(x.pos, { p: cur.p + x.p, sub: cur.p >= x.p ? cur.sub : x.sub });
  }
  const total = [...byPos.values()].reduce((s, x) => s + x.p, 0);
  const candidates = [...byPos.entries()]
    .map(([pos, v]) => ({ pos, p: total ? Math.round((v.p / total) * 100) / 100 : 0, sub: v.sub }))
    .sort((a, b) => b.p - a.p);
  const top = candidates[0];
  const asserted = !!top && top.p >= ASSERT_THRESHOLD;
  const pos = asserted ? top.pos : null;
  const verbs = pos === "VERBO" ? verbFeatures(w.verbs) : undefined;
  return {
    ...w.t,
    pos,
    ambiguous: !!top && !asserted,
    candidates: candidates.filter((c) => c.p >= 0.1).map(({ pos: p, p: prob }) => ({ pos: p, p: prob })),
    confidence: top ? top.p : 1,
    reason: w.reason,
    sub: top?.sub,
    verb: verbs,
    locution: w.locution,
  };
}

/** Atalho: tokeniza e etiqueta um texto. */
export function analyzeMorphology(text: string, opts: { inTitle?: boolean } = {}): { tokens: TaggedToken[]; sentences: TaggedSentence[] } {
  const { tokens, sentences } = tokenize(text);
  const tagged = tagTokens(tokens, sentences, opts);
  return { tokens: tagged, sentences: sentences.map((s) => ({ ...s, tokens: s.tokens.map((t) => tagged[t.i]!) })) };
}

export const isClosedClass = (pos: PartOfSpeech | null) => !!pos && CLOSED_CLASS.has(pos);
