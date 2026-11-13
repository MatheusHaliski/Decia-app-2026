/**
 * Regras gramaticais do Letters (RF53.CA02/CA03): crase, concordância nominal e verbal nos casos claros, regência de
 * verbos comuns, "onde" para tempo, "a nível de", pleonasmos, palavra duplicada, repetição próxima, frase longa,
 * espaços e registro informal. Cada regra devolve trecho exato, confiança e — só quando segura — a correção.
 * Falas e citações entre aspas não são corrigidas pelas regras de estilo. Funções puras.
 */
import { dedupe, type BlockCtx, type RawFinding } from "./findings";
import { PLURAL_ARTICLES, PLURAL_DETERMINERS, SINGULAR_ARTICLES, SUBJECT_PRONOUNS } from "./lexicon";
import { fold, insideSpans, isCapitalized, lightStem, matchCase, pluralize } from "./text";
import type { TaggedToken } from "./types";
import { isParticiple } from "./verbal";
import { generate, swapThirdPersonNumber, verbReadings } from "./verbs";

/* ── Utilidades ──────────────────────────────────────────────────────────────────────────────────────────── */

const isWordTok = (t: TaggedToken | undefined): t is TaggedToken => !!t && (t.kind === "PALAVRA" || t.kind === "SIGLA");

/** Próximo token de palavra colado (mesma frase, sem pontuação no meio). */
function next(ctx: BlockCtx, i: number, step = 1): TaggedToken | undefined {
  const t = ctx.tokens[i + step];
  const cur = ctx.tokens[i];
  if (!t || !cur || t.sentence !== cur.sentence || !isWordTok(t)) return undefined;
  return t;
}
function prev(ctx: BlockCtx, i: number): TaggedToken | undefined {
  return next(ctx, i, -1);
}

const isNominalTok = (t: TaggedToken | undefined, min = 0.6) => !!t && (t.pos === "SUBSTANTIVO" || t.pos === "ADJETIVO") && t.confidence >= min;
const nominalCandidate = (t: TaggedToken | undefined) => !!t && (t.pos === "SUBSTANTIVO" || t.pos === "ADJETIVO" || (t.ambiguous && t.candidates.some((c) => (c.pos === "SUBSTANTIVO" || c.pos === "ADJETIVO") && c.p >= 0.4)));
const isInfinitive = (t: TaggedToken | undefined) =>
  !!t && (t.verb?.forma === "INFINITIVO" || (t.pos !== "SUBSTANTIVO" && /(ar|er|ir|or)$/.test(t.lower) && verbReadings(t.lower).some((r) => r.forma === "INFINITIVO")));
const lemmaOf = (t: TaggedToken | undefined) => (t ? new Set(verbReadings(t.lower).map((r) => r.lemma)) : new Set<string>());
const quotedTok = (ctx: BlockCtx, t: TaggedToken) => insideSpans(ctx.quoted, t.start, t.end);

const FEM_SUFFIX = /(ção|ções|são|sões|dade|dades|tude|tudes|agem|agens|ência|ências|ância|âncias|ice|ices)$/;
const MASC_SUFFIX = /(mento|mentos|ismo|ismos)$/;
/** Femininos terminados em -o: "a foto", "a tribo". */
const FEM_IN_O = new Set(["foto", "fotos", "moto", "motos", "tribo", "tribos", "libido", "virago", "radio"]);
const INVARIABLE_S = new Set(["lápis", "pires", "óculos", "atlas", "ônibus", "vírus", "bônus", "tênis", "oásis", "férias", "parabéns", "núpcias", "arredores", "status", "campus", "corpus", "mês", "país", "gás", "português", "inglês", "francês", "através", "simples"]);

/** Plural ↔ singular de determinantes e contrações. */
const DET_NUMBER: Readonly<Record<string, string>> = (() => {
  const pairs: [string, string][] = [
    ["o", "os"], ["a", "as"], ["um", "uns"], ["uma", "umas"], ["este", "estes"], ["esta", "estas"], ["esse", "esses"], ["essa", "essas"],
    ["aquele", "aqueles"], ["aquela", "aquelas"], ["meu", "meus"], ["minha", "minhas"], ["teu", "teus"], ["tua", "tuas"], ["seu", "seus"],
    ["sua", "suas"], ["nosso", "nossos"], ["nossa", "nossas"], ["algum", "alguns"], ["alguma", "algumas"], ["outro", "outros"], ["outra", "outras"],
    ["todo", "todos"], ["toda", "todas"], ["muito", "muitos"], ["muita", "muitas"], ["certo", "certos"], ["certa", "certas"],
    ["do", "dos"], ["da", "das"], ["no", "nos"], ["na", "nas"], ["ao", "aos"], ["à", "às"], ["pelo", "pelos"], ["pela", "pelas"],
    ["num", "nuns"], ["numa", "numas"], ["deste", "destes"], ["desta", "destas"], ["desse", "desses"], ["dessa", "dessas"],
    ["daquele", "daqueles"], ["daquela", "daquelas"], ["neste", "nestes"], ["nesta", "nestas"], ["nesse", "nesses"], ["nessa", "nessas"],
    ["naquele", "naqueles"], ["naquela", "naquelas"],
  ];
  const map: Record<string, string> = {};
  for (const [s, p] of pairs) { map[s] = p; map[p] = s; }
  return map;
})();

/** Masculino → feminino (e volta) de determinantes. */
const DET_GENDER: Readonly<Record<string, string>> = (() => {
  const pairs: [string, string][] = [
    ["o", "a"], ["os", "as"], ["um", "uma"], ["uns", "umas"], ["do", "da"], ["dos", "das"], ["no", "na"], ["nos", "nas"], ["ao", "à"],
    ["aos", "às"], ["pelo", "pela"], ["pelos", "pelas"], ["este", "esta"], ["estes", "estas"], ["esse", "essa"], ["esses", "essas"],
    ["aquele", "aquela"], ["aqueles", "aquelas"], ["meu", "minha"], ["meus", "minhas"], ["seu", "sua"], ["seus", "suas"], ["nosso", "nossa"],
    ["nossos", "nossas"], ["num", "numa"], ["dum", "duma"], ["deste", "desta"], ["desse", "dessa"], ["neste", "nesta"], ["nesse", "nessa"],
    ["daquele", "daquela"], ["naquele", "naquela"],
  ];
  const map: Record<string, string> = {};
  for (const [m, f] of pairs) { map[m] = f; map[f] = m; }
  return map;
})();
const MASC_DETS = new Set(["o", "os", "um", "uns", "do", "dos", "no", "nos", "ao", "aos", "pelo", "pelos", "este", "estes", "esse", "esses", "aquele", "aqueles", "meu", "meus", "seu", "seus", "nosso", "nossos", "num", "dum", "deste", "desse", "neste", "nesse", "daquele", "naquele"]);
const FEM_DETS_SAFE = new Set(["as", "uma", "umas", "da", "das", "na", "nas", "pela", "pelas", "esta", "estas", "essa", "essas", "aquela", "aquelas", "minha", "minhas", "sua", "suas", "nossa", "nossas", "numa", "duma", "desta", "dessa", "nesta", "nessa"]);

const isDetToken = (t: TaggedToken | undefined) => !!t && (t.pos === "ARTIGO" || (t.pos === "PRONOME" && /possessivo|demonstrativo|indefinido/.test(t.sub ?? "")) || (t.pos === "PREPOSICAO" && !!t.contraction && /contração/.test(t.sub ?? "")));

/* ── Crase ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** Expressões fixas com palavra masculina, sem artigo: "a pé", "a prazo", "a partir". */
const MASC_FIXED = new Set(["pé", "prazo", "cavalo", "respeito", "título", "princípio", "caminho", "vapor", "lápis", "óleo", "contento", "esmo", "granel", "fim", "nível", "despeito", "favor", "par", "partir", "mão-armada"]);
const CRASE_PRONOUNS = new Set(["esta", "essa", "este", "esse", "isto", "isso", "ela", "elas", "ele", "eles", "você", "vocês", "cada", "qualquer", "quaisquer", "nenhuma", "nenhum", "alguma", "algum", "ninguém", "alguém", "tudo", "mim", "ti", "si", "uma", "um", "vossa", "todas", "todos"]);
const CRASE_BEFORE = new Set(["devido", "relação", "quanto", "graças", "junto", "referente", "rumo", "frente", "face", "alusão", "atinente", "concernente", "relativo", "relativa", "obediência", "favorável", "contrário", "contrária"]);

function crase(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (!isWordTok(t) || quotedTok(ctx, t)) continue;
    const n = next(ctx, i);
    if (t.lower === "à" || t.lower === "às") {
      if (!n) continue;
      const plainA = matchCase(t.text, "a");
      if (isInfinitive(n) && n.pos !== "SUBSTANTIVO" && n.pos !== "ADJETIVO") {
        // "à partir", "à fazer": não há artigo antes de verbo
        out.push({ ruleId: "CRASE_VERBO", start: t.start, end: t.end, replacement: plainA, vars: { word: n.text }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
      } else if (CRASE_PRONOUNS.has(n.lower)) {
        // "à uma hora" (horas) é crase correta
        const after = next(ctx, i, 2);
        if (n.lower === "uma" && after && /^(h|hora|horas)$/.test(after.lower)) continue;
        out.push({ ruleId: "CRASE_PRONOME", start: t.start, end: t.end, replacement: plainA, vars: { word: n.text }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
      } else if (!n.capitalized && MASC_FIXED.has(n.lower)) {
        out.push({ ruleId: "CRASE_MASCULINO", start: t.start, end: t.end, replacement: plainA, vars: { word: n.text }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
      } else if (!n.capitalized && nominalCandidate(n) && /[^ã]os?$/.test(n.lower) && !FEM_IN_O.has(n.lower)) {
        out.push({ ruleId: "CRASE_MASCULINO", start: t.start, end: t.end, replacement: null, suggestions: [plainA, matchCase(t.text, t.lower === "à" ? "ao" : "aos")], vars: { word: n.text }, confidence: 0.75, certainty: "HIPOTESE" });
      } else if (t.lower === "à" && !n.capitalized && nominalCandidate(n) && /[aeo]s$/.test(n.lower) && !INVARIABLE_S.has(n.lower)) {
        out.push({ ruleId: "CRASE_PLURAL", start: t.start, end: t.end, replacement: null, suggestions: [matchCase(t.text, "às"), plainA], vars: { word: n.text }, confidence: 0.7 });
      }
      continue;
    }
    // crase obrigatória ausente: "a medida que", "a proporção que", "as vezes"
    if (t.lower === "a" && n && (n.lower === "medida" || n.lower === "proporção") && next(ctx, i, 2)?.lower === "que") {
      out.push({ ruleId: "CRASE_LOCUCAO", start: t.start, end: t.end, replacement: matchCase(t.text, "à"), vars: { expr: `à ${n.lower} que` }, confidence: 0.95, certainty: "DEMONSTRAVEL" });
      continue;
    }
    if (t.lower === "as" && n?.lower === "vezes") {
      const p = toks[i - 1];
      const before = p && p.sentence === t.sentence && isWordTok(p) ? p.lower : null;
      const after = next(ctx, i, 2)?.lower;
      const quantified = before !== null && /^(todas|muitas|poucas|várias|algumas|das|nas|pelas|duas|três|quatro|cinco|quantas|tantas|outras|certas|diversas|inúmeras|as|mais|menos)$/.test(before);
      if (!quantified && after !== "que" && after !== "em") {
        out.push({ ruleId: "CRASE_LOCUCAO", start: t.start, end: t.end, replacement: matchCase(t.text, "às"), vars: { expr: "às vezes" }, confidence: 0.75, certainty: "HIPOTESE" });
      }
      continue;
    }
    // "devido a falta" → "devido à falta" (substantivo feminino singular determinado)
    if (t.lower === "a" && n && !n.capitalized) {
      const p = prev(ctx, i);
      const pp = p ? prev(ctx, p.i) : undefined;
      const trigger = p && CRASE_BEFORE.has(p.lower) && (p.lower !== "relação" || (pp && /^(em|com)$/.test(pp.lower)));
      if (trigger && isNominalTok(n, 0.55) && n.pos === "SUBSTANTIVO" && !/s$/.test(n.lower) && (/a$/.test(n.lower) || FEM_SUFFIX.test(n.lower)) && !isInfinitive(n)) {
        out.push({ ruleId: "CRASE_DEVIDO", start: t.start, end: t.end, replacement: matchCase(t.text, "à"), vars: { expr: `${p!.lower} à ${n.lower}` }, confidence: 0.7, certainty: "HIPOTESE" });
      }
    }
  }
  return out;
}

/* ── Concordância nominal (número e gênero) ──────────────────────────────────────────────────────────────── */

function nominalAgreement(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const d = toks[i]!;
    if (!isWordTok(d) || !isDetToken(d) || quotedTok(ctx, d)) continue;
    let n = next(ctx, i);
    // "os mais importante": salta um intensificador
    if (n && /^(mais|menos|muito|bem|tão)$/.test(n.lower)) n = next(ctx, n.i);
    if (!n || n.kind !== "PALAVRA" || n.capitalized || !isNominalTok(n, 0.6)) continue;
    const between = ctx.text.slice(d.end, n.start);
    const dl = d.lower;
    // número: determinante plural + nome singular ("os documento")
    if (PLURAL_DETERMINERS.has(dl) && !/s$/.test(n.lower) && !/x$/.test(n.lower) && !(dl === "nos" && d.pos === "PRONOME")) {
      const plural = pluralize(n.text);
      const singularDet = DET_NUMBER[dl];
      out.push({
        ruleId: "CONCORDANCIA_NOMINAL",
        start: d.start,
        end: n.end,
        replacement: plural ? `${d.text}${between}${plural}` : null,
        suggestions: singularDet ? [`${matchCase(d.text, singularDet)}${between}${n.text}`] : [],
        vars: { det: d.text, word: n.text },
        confidence: n.confidence >= 0.8 ? 0.85 : 0.7,
        certainty: "DEMONSTRAVEL",
      });
      continue;
    }
    // número: determinante singular + nome plural ("o documentos")
    const singularDetSet = new Set([...SINGULAR_ARTICLES, "do", "da", "no", "na", "ao", "pelo", "pela", "num", "numa", "deste", "desta", "desse", "dessa", "neste", "nesta", "nesse", "nessa"]);
    if (singularDetSet.has(dl) && /(os|as|es|ões|ães|ais|éis|óis|ns)$/.test(n.lower) && !/(us|is)$/.test(n.lower) && !INVARIABLE_S.has(n.lower) && n.pos === "SUBSTANTIVO") {
      const pluralDet = DET_NUMBER[dl];
      if (!pluralDet) continue;
      out.push({ ruleId: "CONCORDANCIA_NOMINAL", start: d.start, end: n.end, replacement: `${matchCase(d.text, pluralDet)}${between}${n.text}`, vars: { det: d.text, word: n.text }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
      continue;
    }
    // gênero: "o reunião", "uma documento"
    if (n.pos !== "SUBSTANTIVO" || n.lower === "personagem" || n.lower === "personagens") continue;
    const swap = DET_GENDER[dl];
    if (!swap) continue;
    if ((MASC_DETS.has(dl) && FEM_SUFFIX.test(n.lower)) || (FEM_DETS_SAFE.has(dl) && MASC_SUFFIX.test(n.lower))) {
      out.push({ ruleId: "CONCORDANCIA_GENERO", start: d.start, end: n.end, replacement: `${matchCase(d.text, swap)}${between}${n.text}`, vars: { det: d.text, word: n.text }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
    }
  }
  return out;
}

/** Nome + adjetivo/particípio: "os documentos analisado", "a reunião realizado". */
function adjectiveAgreement(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const d = toks[i]!;
    if (!isWordTok(d) || !isDetToken(d) || quotedTok(ctx, d)) continue;
    const n = next(ctx, i);
    if (!n || n.pos !== "SUBSTANTIVO" || n.capitalized) continue;
    const a = next(ctx, n.i);
    if (!a || a.capitalized) continue;
    const participle = /(ad|id)(o|a|os|as)$/.test(a.lower) && !/[áéíóúâêô]/.test(a.lower.slice(0, -3));
    const adjLike = a.pos === "ADJETIVO" || (a.pos === "VERBO" && a.verb?.forma === "PARTICIPIO") || (a.ambiguous && participle && a.candidates.some((c) => c.pos === "ADJETIVO"));
    if (!adjLike || !participle) continue;
    const dl = d.lower;
    const nounPlural = PLURAL_DETERMINERS.has(dl) && /s$/.test(n.lower);
    const nounSingular = !PLURAL_DETERMINERS.has(dl) && !/s$/.test(n.lower);
    const adjPlural = /s$/.test(a.lower);
    if (nounPlural && !adjPlural) {
      out.push({ ruleId: "CONCORDANCIA_ADJETIVO", start: a.start, end: a.end, replacement: a.text + "s", vars: { noun: n.text, word: a.text, kind: "numero" }, confidence: 0.7 });
      continue;
    }
    if (nounSingular && adjPlural) {
      out.push({ ruleId: "CONCORDANCIA_ADJETIVO", start: a.start, end: a.end, replacement: a.text.slice(0, -1), vars: { noun: n.text, word: a.text, kind: "numero" }, confidence: 0.65 });
      continue;
    }
    // gênero pelo sufixo do nome
    const fem = FEM_SUFFIX.test(n.lower) && n.lower !== "personagem";
    const masc = MASC_SUFFIX.test(n.lower);
    if (fem && /(ad|id)os?$/.test(a.lower)) {
      out.push({ ruleId: "CONCORDANCIA_ADJETIVO", start: a.start, end: a.end, replacement: a.text.replace(/o(s?)$/, "a$1"), vars: { noun: n.text, word: a.text, kind: "genero" }, confidence: 0.7 });
    } else if (masc && /(ad|id)as?$/.test(a.lower)) {
      out.push({ ruleId: "CONCORDANCIA_ADJETIVO", start: a.start, end: a.end, replacement: a.text.replace(/a(s?)$/, "o$1"), vars: { noun: n.text, word: a.text, kind: "genero" }, confidence: 0.7 });
    }
  }
  return out;
}

/* ── Concordância verbal ─────────────────────────────────────────────────────────────────────────────────── */

const COLLECTIVES = new Set(["maioria", "minoria", "parte", "metade", "grupo", "conjunto", "série", "porção", "percentual", "quantidade", "número", "totalidade", "resto", "maior", "bando", "equipe", "comissão", "lista", "dezena", "centena", "milhar"]);
const CLAUSE_HEAD = new Set(["que", "quando", "se", "porque", "pois", "embora", "como", "mas", "porém", "contudo", "onde", "enquanto", "caso", "conforme", "portanto", "assim"]);
const LIGHT_ADVERBS = new Set(["não", "também", "já", "sempre", "ainda", "nunca", "só", "apenas", "efetivamente", "realmente"]);

const finiteVerb = (t: TaggedToken | undefined) => !!t && t.pos === "VERBO" && !!t.verb && !t.verb.forma && !!t.verb.numero && t.verb.pessoa !== undefined && !t.lower.includes("-");

function verbalAgreement(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const d = toks[i]!;
    if (!isWordTok(d) || quotedTok(ctx, d)) continue;
    const before = toks[i - 1];
    const atClauseStart = !before || before.sentence !== d.sentence || [",", ";", ":", "(", "—", "–"].includes(before.text) || (isWordTok(before) && CLAUSE_HEAD.has(before.lower));
    // A) sujeito pronominal + verbo ("eles participou")
    const pron = SUBJECT_PRONOUNS[d.lower];
    if (pron && atClauseStart) {
      let v = next(ctx, i);
      while (v && (LIGHT_ADVERBS.has(v.lower) || /^(me|te|se|lhe|lhes|nos|vos|o|a|os|as)$/.test(v.lower)) && next(ctx, v.i)) v = next(ctx, v.i);
      if (!finiteVerb(v)) continue;
      const vf = v!.verb!;
      if (vf.pessoa === pron.pessoa && vf.numero === pron.numero) continue;
      const fixed = vf.tempo && vf.modo ? generate(vf.lemma.split("|")[0]!, { tempo: vf.tempo, modo: vf.modo, pessoa: pron.pessoa, numero: pron.numero }) : null;
      out.push({ ruleId: "CONCORDANCIA_PRONOME", start: v!.start, end: v!.end, replacement: fixed ? matchCase(v!.text, fixed) : null, vars: { subject: d.text, word: v!.text }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
      continue;
    }
    // B) sintagma nominal sujeito + verbo ("os servidores participou")
    if (!atClauseStart || !(PLURAL_ARTICLES.has(d.lower) || SINGULAR_ARTICLES.has(d.lower)) || !isDetToken(d) || d.pos === "PREPOSICAO") continue;
    if (before && isWordTok(before) && /^(e|ou|nem)$/.test(before.lower)) continue; // sujeito composto possível
    const head = next(ctx, i);
    if (!head || head.pos !== "SUBSTANTIVO" || head.capitalized) continue;
    let j = head.i;
    let viaPP = false;
    // adjetivos colados ao núcleo
    for (let k = 0; k < 2; k++) {
      const a = next(ctx, j);
      if (a && a.pos === "ADJETIVO") j = a.i;
    }
    // complemento preposicionado: "O relatório dos auditores apontaram"
    const p = next(ctx, j);
    if (p && /^(de|do|da|dos|das)$/.test(p.lower)) {
      let q = next(ctx, p.i);
      if (q && isDetToken(q)) q = next(ctx, q.i);
      if (!q || q.pos !== "SUBSTANTIVO") continue;
      j = q.i;
      const a = next(ctx, j);
      if (a && a.pos === "ADJETIVO") j = a.i;
      viaPP = true;
    }
    let v = next(ctx, j);
    while (v && LIGHT_ADVERBS.has(v.lower)) v = next(ctx, v.i);
    if (!finiteVerb(v) || v!.verb!.pessoa !== 3) continue;
    const subjectPlural = PLURAL_ARTICLES.has(d.lower) && /s$/.test(head.lower);
    const subjectSingular = SINGULAR_ARTICLES.has(d.lower) && !/s$/.test(head.lower);
    if (!subjectPlural && !subjectSingular) continue;
    const verbPlural = v!.verb!.numero === "PL";
    if (subjectPlural === verbPlural) continue;
    if (subjectSingular && COLLECTIVES.has(head.lower)) continue; // "a maioria dos servidores participaram" é aceita
    const fixed = swapThirdPersonNumber(v!.lower);
    out.push({
      ruleId: "CONCORDANCIA_VERBAL",
      start: v!.start,
      end: v!.end,
      replacement: fixed ? matchCase(v!.text, fixed) : null,
      vars: { subject: ctx.text.slice(d.start, head.end), word: v!.text },
      confidence: viaPP ? 0.65 : 0.85,
      certainty: viaPP ? "HIPOTESE" : "DEMONSTRAVEL",
    });
  }
  return out;
}

/** Haver existencial e fazer (tempo decorrido) são impessoais: "haviam problemas" → "havia problemas". */
function impersonalVerbs(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const TIME = /^(anos|meses|dias|semanas|horas|minutos|décadas|séculos|segundos)$/;
  for (const t of ctx.tokens) {
    if (!isWordTok(t) || quotedTok(ctx, t)) continue;
    const n = next(ctx, t.i);
    const readings = verbReadings(t.lower);
    const haver3pl = readings.some((r) => r.lemma === "haver" && r.pessoa === 3 && r.numero === "PL" && !r.forma);
    if (haver3pl && n && n.lower !== "de" && n.lower !== "que" && !isParticiple(n)) {
      const p = prev(ctx, t.i);
      if (p && (p.pos === "SUBSTANTIVO" || SUBJECT_PRONOUNS[p.lower])) continue; // "eles haviam de", "os servidores haviam saído"
      const fixed = swapThirdPersonNumber(t.lower);
      out.push({ ruleId: "VERBO_IMPESSOAL", start: t.start, end: t.end, replacement: fixed ? matchCase(t.text, fixed) : null, vars: { word: t.text, verb: "haver" }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
      continue;
    }
    if (/^(fazem|fizeram|farão|fariam|faziam)$/.test(t.lower) && n) {
      const n2 = next(ctx, n.i);
      const quantity = n.kind === "NUMERO" || n.pos === "NUMERAL" || /^(muitos|alguns|poucos|vários|uns|tantos)$/.test(n.lower);
      if (quantity && n2 && TIME.test(n2.lower)) {
        const fixed = swapThirdPersonNumber(t.lower);
        out.push({ ruleId: "VERBO_IMPESSOAL", start: t.start, end: t.end, replacement: fixed ? matchCase(t.text, fixed) : null, vars: { word: t.text, verb: "fazer" }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
      }
    }
  }
  return out;
}

/* ── Regência ────────────────────────────────────────────────────────────────────────────────────────────── */

const ART_TO_A: Readonly<Record<string, string>> = { o: "ao", a: "à", os: "aos", as: "às" };
const EM_DROP: Readonly<Record<string, string>> = { em: "", no: " o", na: " a", nos: " os", nas: " as", num: " um", numa: " uma" };

function regency(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (const t of toks) {
    if (!isWordTok(t) || quotedTok(ctx, t)) continue;
    const lemmas = lemmaOf(t);
    if (!lemmas.size) continue;
    const n = next(ctx, t.i);
    // assistir (ver) / obedecer: objeto indireto com "a"
    if ((lemmas.has("assistir") || lemmas.has("obedecer") || lemmas.has("desobedecer")) && n && ART_TO_A[n.lower]) {
      const afterArt = next(ctx, n.i);
      // "assistiu a uma palestra": o "a" já é a preposição
      if (n.lower === "a" && (!afterArt || !isNominalTok(afterArt, 0.5) || isDetToken(afterArt))) continue;
      if (n.pos === "PRONOME" && n.lower !== "a") continue;
      const isAssistir = lemmas.has("assistir");
      out.push({
        ruleId: isAssistir ? "REGENCIA_ASSISTIR" : "REGENCIA_OBEDECER",
        start: n.start,
        end: n.end,
        replacement: matchCase(n.text, ART_TO_A[n.lower]!),
        vars: { verb: t.text, word: n.text },
        confidence: isAssistir ? 0.65 : 0.85,
        certainty: isAssistir ? "HIPOTESE" : "DEMONSTRAVEL",
      });
      continue;
    }
    // implicar (acarretar) é transitivo direto: "implica em custos" → "implica custos"
    if (lemmas.has("implicar") && !t.lower.includes("-") && n && EM_DROP[n.lower] !== undefined) {
      const p = prev(ctx, t.i);
      if (p?.lower === "se") continue; // implicar-se em (envolver-se)
      out.push({ ruleId: "REGENCIA_IMPLICAR", start: t.end, end: n.end, replacement: EM_DROP[n.lower]!, vars: { verb: t.text, word: n.text }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
      continue;
    }
    // preferir … a (e não "do que"; e sem "mais")
    if (lemmas.has("preferir")) {
      if (n?.lower === "mais") {
        out.push({ ruleId: "REGENCIA_PREFERIR", start: t.end, end: n.end, replacement: "", vars: { verb: t.text, word: "mais", kind: "mais" }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
      }
      const sent = ctx.sentences[t.sentence];
      if (!sent) continue;
      for (const u of sent.tokens) {
        const ut = toks[u.i]!;
        if (u.i <= t.i + 1 || !isWordTok(ut)) continue;
        if (ut.lower === "do" && next(ctx, u.i)?.lower === "que") {
          const q = next(ctx, u.i)!;
          out.push({ ruleId: "REGENCIA_PREFERIR", start: ut.start, end: q.end, replacement: matchCase(ut.text, "a"), vars: { verb: t.text, word: "do que", kind: "comparacao" }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
          break;
        }
        if (ut.lower === "que" && toks[u.i - 1]?.lower !== "do" && u.i > t.i + 2) {
          out.push({ ruleId: "REGENCIA_PREFERIR", start: ut.start, end: ut.end, replacement: matchCase(ut.text, "a"), vars: { verb: t.text, word: "que", kind: "comparacao" }, confidence: 0.65, certainty: "HIPOTESE" });
          break;
        }
      }
    }
  }
  return out;
}

/* ── Usos: "onde" para tempo, "a nível de" ───────────────────────────────────────────────────────────────── */

const TIME_NOUNS = new Set(["ano", "anos", "mês", "meses", "dia", "dias", "semana", "semanas", "período", "períodos", "momento", "momentos", "época", "épocas", "ocasião", "data", "hora", "horas", "instante", "fase", "fases", "etapa", "etapas", "século", "década", "ciclo", "exercício", "trimestre", "semestre", "bimestre", "mandato", "gestão"]);
const ABSTRACT_NOUNS = new Set(["situação", "caso", "contexto", "reunião", "documento", "relatório", "artigo", "lei", "decreto", "texto", "norma", "edital", "processo", "cenário", "parecer", "ofício", "capítulo", "seção"]);

function usage(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const toks = ctx.tokens;
  for (const t of toks) {
    if (!isWordTok(t) || quotedTok(ctx, t)) continue;
    if (t.lower === "onde") {
      // antecedente nas três palavras anteriores (a vírgula pode separar)
      for (let k = 1; k <= 4; k++) {
        const a = toks[t.i - k];
        if (!a || a.sentence !== t.sentence) break;
        if (!isWordTok(a)) continue;
        const time = TIME_NOUNS.has(a.lower);
        const abstract = ABSTRACT_NOUNS.has(a.lower);
        if (time || abstract) {
          out.push({ ruleId: "ONDE_TEMPO", start: t.start, end: t.end, replacement: matchCase(t.text, "em que"), suggestions: [matchCase(t.text, "quando")], vars: { antecedent: a.text, kind: time ? "tempo" : "abstrato" }, confidence: time ? 0.85 : 0.65, certainty: time ? "DEMONSTRAVEL" : "HIPOTESE" });
          break;
        }
        if (a.pos === "VERBO") break;
      }
      continue;
    }
    if (t.lower === "a") {
      const n = next(ctx, t.i);
      const d = n ? next(ctx, n.i) : undefined;
      if (n?.lower === "nível" && d && /^(de|do|da|dos|das)$/.test(d.lower)) {
        const tail = d.lower;
        const quanto: Record<string, string> = { de: "a", do: "ao", da: "à", dos: "aos", das: "às" };
        out.push({ ruleId: "A_NIVEL_DE", start: t.start, end: d.end, replacement: null, suggestions: [matchCase(t.text, `em nível ${tail}`), matchCase(t.text, `no âmbito ${tail}`), matchCase(t.text, `quanto ${quanto[tail]}`)], vars: { expr: ctx.text.slice(t.start, d.end) }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
      }
    }
  }
  return out;
}

/* ── Pleonasmos ──────────────────────────────────────────────────────────────────────────────────────────── */

const B = "(?<![\\p{L}\\d])";
const E = "(?![\\p{L}\\d])";
const PLEONASMS: readonly { re: RegExp; fix: (m: RegExpMatchArray) => string; confidence: number }[] = [
  ["(subir|sobe|sobem|subiu|subiram|subia|subiam|subindo|suba|subam|subisse|subirá|subiria|subimos)\\s+(?:para\\s+)?cima", 1, 0.85],
  ["(descer|desce|descem|desceu|desceram|descia|desciam|descendo|desça|desçam|descesse|descerá|descemos)\\s+(?:para\\s+)?baixo", 1, 0.85],
  ["(entrar|entra|entram|entrou|entraram|entrava|entrando|entrem|entrasse|entrará)\\s+(?:para\\s+)?dentro", 1, 0.85],
  ["(sair|sai|saem|saiu|saíram|saía|saindo|saia|saiam|saísse|sairá)\\s+(?:para\\s+)?fora", 1, 0.85],
  ["(elos?)\\s+de\\s+ligação", 1, 0.9],
  ["(encarar|encara|encaram|encarou|encararam|encarando|encare)\\s+de\\s+frente", 1, 0.8],
  ["(repetir|repete|repetem|repetiu|repetiram|repetindo|repita)\\s+(?:de\\s+novo|novamente)", 1, 0.8],
  ["(planos?)\\s+para\\s+o\\s+futuro", 1, 0.75],
  ["outras?\\s+(alternativas?)", 1, 0.8],
  ["(acabamento)\\s+final", 1, 0.8],
  ["(consenso)\\s+geral", 1, 0.8],
  ["(fatos?)\\s+reais?", 1, 0.75],
  ["(conviver|convive|convivem|conviveu|conviveram|convivendo)\\s+junto", 1, 0.85],
  ["(surpresas?)\\s+inesperadas?", 1, 0.85],
  ["(monopólio)\\s+exclusivo", 1, 0.85],
  ["(multidão)\\s+de\\s+pessoas", 1, 0.8],
  ["principal\\s+(protagonista)", 1, 0.8],
  ["(erário)\\s+público", 1, 0.85],
  ["(hemorragia)\\s+de\\s+sangue", 1, 0.9],
  ["(estrear|estreia|estreiam|estreou|estrearam|estreando)\\s+pela\\s+primeira\\s+vez", 1, 0.85],
  ["(detalhes)\\s+minuciosos", 1, 0.7],
  ["pequenos\\s+(detalhes)", 1, 0.6],
  ["(certeza)\\s+absoluta", 1, 0.6],
  ["(comparecer|compareça|compareceu|compareceram|comparecem|comparecendo)\\s+pessoalmente", 1, 0.75],
  ["(prever|prevê|previu|previram|preveem)\\s+antecipadamente", 1, 0.85],
  ["(adiar|adia|adiou|adiaram|adiando)\\s+para\\s+depois", 1, 0.85],
  ["(ganhar|ganha|ganhou|ganharam)\\s+grátis", 1, 0.8],
].map(([src, group, confidence]) => {
  const re = new RegExp(`${B}${src as string}${E}`, "giu");
  return { re, fix: (m: RegExpMatchArray) => m[group as number] ?? m[0], confidence: confidence as number };
});
/** "há dez anos atrás" → "há dez anos" (o "atrás" repete o "há"). */
const HA_ATRAS = new RegExp(`${B}(há\\s+(?:[\\p{L}\\d]+\\s+){1,2}?(?:anos|meses|dias|semanas|horas|minutos|décadas|séculos))\\s+atrás${E}`, "giu");

function pleonasms(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const push = (m: RegExpMatchArray, fixed: string, confidence: number) => {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (insideSpans(ctx.quoted, start, end)) return;
    out.push({ ruleId: "PLEONASMO", start, end, replacement: matchCase(m[0], fixed), vars: { expr: m[0], fix: fixed }, confidence, certainty: "DEMONSTRAVEL" });
  };
  for (const p of PLEONASMS) for (const m of ctx.text.matchAll(p.re)) push(m, p.fix(m), p.confidence);
  for (const m of ctx.text.matchAll(HA_ATRAS)) push(m, m[1]!, 0.9);
  return out;
}

/* ── Estilo: duplicadas, repetição, frase longa ──────────────────────────────────────────────────────────── */

function duplicated(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  for (let i = 1; i < ctx.tokens.length; i++) {
    const a = ctx.tokens[i - 1]!;
    const b = ctx.tokens[i]!;
    if (!isWordTok(a) || !isWordTok(b) || a.key !== b.key || a.sentence !== b.sentence) continue;
    if (!/^\s+$/.test(ctx.text.slice(a.end, b.start))) continue;
    if (a.capitalized && b.capitalized && a.i > 0) continue; // "Bora Bora"
    if (quotedTok(ctx, b)) continue;
    out.push({ ruleId: "PALAVRA_DUPLICADA", start: a.end, end: b.end, replacement: "", vars: { word: b.text }, confidence: 0.9, certainty: "DEMONSTRAVEL" });
  }
  return out;
}

export const LONG_SENTENCE_WORDS = 40;
export const REPETITION_WINDOW = 15;

const CONTENT_POS = new Set(["SUBSTANTIVO", "ADJETIVO", "VERBO", "ADVERBIO"]);
const AUX_STEMS = new Set(["ser", "estar", "ter", "haver", "fazer", "poder", "dever", "ficar", "ir"]);

function repetition(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  const seen = new Map<string, { t: TaggedToken; wordIndex: number }>();
  const reported = new Set<string>();
  let wordIndex = 0;
  for (const t of ctx.tokens) {
    if (!isWordTok(t)) continue;
    wordIndex++;
    if (t.kind === "SIGLA" || t.capitalized && t.sub === "próprio" || t.key.length < 5 || !t.pos || !CONTENT_POS.has(t.pos) || quotedTok(ctx, t)) continue;
    if (t.pos === "VERBO" && t.verb && t.verb.lemma.split("|").some((l) => AUX_STEMS.has(l))) continue;
    if (t.pos === "ADVERBIO" && !t.lower.endsWith("mente")) continue;
    const stem = lightStem(t.text);
    const first = seen.get(stem);
    if (first && wordIndex - first.wordIndex <= REPETITION_WINDOW && wordIndex - first.wordIndex > 1 && !reported.has(stem)) {
      reported.add(stem);
      out.push({
        ruleId: "REPETICAO_PROXIMA",
        start: t.start,
        end: t.end,
        replacement: null,
        vars: { word: t.text, distance: wordIndex - first.wordIndex },
        confidence: 0.6,
        certainty: "HIPOTESE",
        related: [{ blockId: ctx.block.id, start: first.t.start, end: first.t.end, excerpt: first.t.text }],
      });
    }
    seen.set(stem, { t, wordIndex });
  }
  return out;
}

export const sentenceWordCount = (s: { tokens: readonly { kind: string }[] }) => s.tokens.filter((t) => t.kind === "PALAVRA" || t.kind === "SIGLA" || t.kind === "NUMERO").length;

function longSentences(ctx: BlockCtx): RawFinding[] {
  return ctx.sentences
    .filter((s) => sentenceWordCount(s) > LONG_SENTENCE_WORDS && !insideSpans(ctx.quoted, s.start, s.end))
    .map((s) => ({ ruleId: "FRASE_LONGA", start: s.start, end: s.end, replacement: null, vars: { count: sentenceWordCount(s), limit: LONG_SENTENCE_WORDS }, confidence: 0.9, certainty: "DEMONSTRAVEL" as const }));
}

/* ── Pontuação e registro ────────────────────────────────────────────────────────────────────────────────── */

function spacing(ctx: BlockCtx): RawFinding[] {
  const out: RawFinding[] = [];
  for (const m of ctx.text.matchAll(/([ \t]+)([,.;:!?)])(?!\d)/g)) {
    const start = m.index ?? 0;
    if (ctx.text.slice(start).startsWith(" ...")) continue;
    if (start === 0 || ctx.text[start - 1] === "\n") continue;
    out.push({ ruleId: "ESPACO_ANTES_PONTUACAO", start, end: start + m[0].length, replacement: m[2]!, vars: { mark: m[2]! }, confidence: 0.95, certainty: "DEMONSTRAVEL" });
  }
  for (const m of ctx.text.matchAll(/\(([ \t]+)/g)) {
    const start = m.index ?? 0;
    out.push({ ruleId: "ESPACO_ANTES_PONTUACAO", start, end: start + m[0].length, replacement: "(", vars: { mark: "(" }, confidence: 0.95, certainty: "DEMONSTRAVEL" });
  }
  for (const m of ctx.text.matchAll(/(?<=\S)( {2,})(?=\S)/g)) {
    const start = m.index ?? 0;
    out.push({ ruleId: "ESPACO_DUPLO", start, end: start + m[0].length, replacement: " ", vars: { count: m[0].length }, confidence: 0.95, certainty: "DEMONSTRAVEL" });
  }
  return out;
}

const INFORMAL: Readonly<Record<string, string | null>> = { pra: "para", pras: "para as", pro: "para o", pros: "para os", tá: "está", tô: "estou", vc: "você", vcs: "vocês", tb: "também", tbm: "também", pq: null, né: null, aí: null };

function informal(ctx: BlockCtx): RawFinding[] {
  if (ctx.genre !== "TECNICO" && ctx.genre !== "ACADEMICO") return [];
  const out: RawFinding[] = [];
  for (const t of ctx.tokens) {
    if (!isWordTok(t) || quotedTok(ctx, t)) continue;
    if (t.lower === "aí") continue; // advérbio de lugar legítimo
    if (t.lower in INFORMAL) {
      const fix = INFORMAL[t.lower] ?? null;
      out.push({ ruleId: "REGISTRO_INFORMAL", start: t.start, end: t.end, replacement: fix ? matchCase(t.text, fix) : null, suggestions: t.lower === "pq" ? ["porque", "por que"] : [], vars: { word: t.text }, confidence: 0.85, certainty: "DEMONSTRAVEL" });
    }
    if (t.lower === "a" && next(ctx, t.i)?.lower === "gente") {
      const g = next(ctx, t.i)!;
      out.push({ ruleId: "REGISTRO_INFORMAL", start: t.start, end: g.end, replacement: null, suggestions: [matchCase(t.text, "nós")], vars: { word: ctx.text.slice(t.start, g.end) }, confidence: 0.8, certainty: "DEMONSTRAVEL" });
    }
  }
  return out;
}

/* ── API ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Regras gramaticais de um bloco (títulos recebem só as regras locais; citações e referências, nenhuma). */
export function grammarFindings(ctx: BlockCtx): RawFinding[] {
  const kind = ctx.block.kind;
  if (kind === "CITACAO" || kind === "REFERENCIAS") return [];
  const local = [...crase(ctx), ...nominalAgreement(ctx), ...adjectiveAgreement(ctx), ...verbalAgreement(ctx), ...impersonalVerbs(ctx), ...regency(ctx), ...usage(ctx), ...pleonasms(ctx), ...duplicated(ctx), ...spacing(ctx), ...informal(ctx)];
  const prose = kind === "TITULO" ? [] : [...repetition(ctx), ...longSentences(ctx)];
  return dedupe([...local, ...prose]);
}

export { isWordTok, isDetToken, finiteVerb, fold, isCapitalized };
