/**
 * Pessoa e voz verbal (RF53.CA03): mistura de tratamento tu/você no documento e excesso de voz passiva por bloco.
 * Falas e citações entre aspas ficam de fora: o registro de um personagem ou de uma fonte não é "corrigido".
 */
import type { BlockCtx, RawFinding, Span } from "./findings";
import { insideSpans, matchCase } from "./text";
import type { TaggedToken } from "./types";
import { generate, verbReadings } from "./verbs";

const isWord = (t: TaggedToken) => t.kind === "PALAVRA" || t.kind === "SIGLA";
const IRREGULAR_PARTICIPLES = new Set(["feito", "feita", "feitos", "feitas", "dito", "dita", "visto", "vista", "vistos", "vistas", "posto", "posta", "escrito", "escrita", "aberto", "aberta", "coberto", "descoberto", "entregue", "entregues", "aceito", "aceita", "eleito", "eleita", "expresso", "impresso", "morto", "morta", "preso", "presa", "pago", "paga", "gasto", "ganho", "revisto", "revista", "previsto", "prevista", "proposto", "proposta", "imposto", "disposto", "exposto", "composto", "suspenso", "suspensa", "concluso", "descrito", "descrita"]);
const ADVERBS_BETWEEN = new Set(["não", "também", "já", "sempre", "ainda", "nunca", "devidamente", "efetivamente", "previamente", "posteriormente", "inicialmente", "amplamente", "rapidamente", "integralmente", "parcialmente"]);

function isParticiple(t: TaggedToken | undefined): boolean {
  if (!t || !isWord(t)) return false;
  if (IRREGULAR_PARTICIPLES.has(t.lower)) return true;
  if (t.verb?.forma === "PARTICIPIO") return true;
  if (verbReadings(t.lower).some((r) => r.forma === "PARTICIPIO")) return true;
  return /(ad|id)(o|a|os|as)$/.test(t.lower) && !/[áéíóúâêô]/.test(t.lower);
}

/** Trechos de voz passiva (analítica "foi realizado" e sintética "realizou-se") de um bloco. */
export function passiveSpans(ctx: BlockCtx): (Span & { sentence: number })[] {
  const out: (Span & { sentence: number })[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (!isWord(t) || insideSpans(ctx.quoted, t.start, t.end)) continue;
    // sintética: verbo + "-se" em 3ª pessoa
    if (/-se$/.test(t.lower)) {
      const head = t.lower.slice(0, -3);
      if (verbReadings(head).some((r) => r.pessoa === 3 && !r.forma)) out.push({ start: t.start, end: t.end, sentence: t.sentence });
      continue;
    }
    const readings = verbReadings(t.lower);
    if (!readings.some((r) => (r.lemma === "ser" || r.lemma === "ser|ir") && !r.forma)) continue;
    let j = i + 1;
    while (toks[j] && toks[j]!.sentence === t.sentence && isWord(toks[j]!) && ADVERBS_BETWEEN.has(toks[j]!.lower)) j++;
    const p = toks[j];
    if (p && p.sentence === t.sentence && isParticiple(p) && p.pos !== "SUBSTANTIVO") out.push({ start: t.start, end: p.end, sentence: t.sentence });
  }
  return out;
}

export const PASSIVE_RATIO_LIMIT = 0.5;
export const PASSIVE_MIN_SENTENCES = 3;

/** Excesso de passiva: mais da metade das frases do bloco (com pelo menos 3 frases). */
export function passiveFindings(ctx: BlockCtx): RawFinding[] {
  if (ctx.block.kind !== "PARAGRAFO" && ctx.block.kind !== "LISTA") return [];
  const spans = passiveSpans(ctx);
  const total = ctx.sentences.length;
  const passiveSentences = new Set(spans.map((s) => s.sentence)).size;
  if (total < PASSIVE_MIN_SENTENCES || passiveSentences / total <= PASSIVE_RATIO_LIMIT || !spans.length) return [];
  const first = spans[0]!;
  return [{
    ruleId: "VOZ_PASSIVA",
    start: first.start,
    end: first.end,
    replacement: null,
    vars: { count: passiveSentences, total, pct: Math.round((passiveSentences / total) * 100) },
    confidence: 0.7,
    certainty: "HIPOTESE",
    related: spans.slice(1, 4).map((s) => ({ blockId: ctx.block.id, start: s.start, end: s.end, excerpt: ctx.text.slice(s.start, s.end) })),
  }];
}

/* ── Tratamento tu/você ──────────────────────────────────────────────────────────────────────────────────── */

const TU_PRONOUNS: Readonly<Record<string, string | null>> = { tu: "você", ti: "você", contigo: "com você", teu: "seu", tua: "sua", teus: "seus", tuas: "suas", te: null };

interface Marker { ctx: BlockCtx; t: TaggedToken; kind: "TU" | "VOCE" }

function markers(ctx: BlockCtx): Marker[] {
  if (ctx.block.kind === "CITACAO" || ctx.block.kind === "REFERENCIAS") return [];
  const out: Marker[] = [];
  for (const t of ctx.tokens) {
    if (!isWord(t) || insideSpans(ctx.quoted, t.start, t.end)) continue;
    if (t.lower === "você") out.push({ ctx, t, kind: "VOCE" });
    else if (t.lower in TU_PRONOUNS && (t.lower !== "te" || t.pos === "PRONOME")) out.push({ ctx, t, kind: "TU" });
    else if (t.pos === "VERBO" && t.verb?.pessoa === 2 && t.verb.numero === "SG" && !t.verb.forma) out.push({ ctx, t, kind: "TU" });
  }
  return out;
}

/** Tratamento misturado no documento: marca as ocorrências do tratamento minoritário (empate → mantém "você"). */
export function treatmentFindings(ctxs: readonly BlockCtx[]): { blockId: string; raw: RawFinding }[] {
  const all = ctxs.flatMap(markers);
  const tu = all.filter((m) => m.kind === "TU");
  const voce = all.filter((m) => m.kind === "VOCE");
  if (!tu.length || !voce.length) return [];
  const keepVoce = voce.length >= tu.length;
  const flagged = keepVoce ? tu : voce;
  const vars = { chosen: keepVoce ? "você" : "tu", tu: tu.length, voce: voce.length };
  return flagged.map(({ ctx, t }) => {
    let replacement: string | null = null;
    const suggestions: string[] = [];
    if (keepVoce) {
      if (t.lower in TU_PRONOUNS) {
        replacement = TU_PRONOUNS[t.lower] ? matchCase(t.text, TU_PRONOUNS[t.lower]!) : null;
        if (t.lower === "te") suggestions.push("lhe", "você");
      } else if (t.verb?.tempo && t.verb.modo) {
        const third = generate(t.verb.lemma.split("|")[0]!, { tempo: t.verb.tempo, modo: t.verb.modo, pessoa: 3, numero: "SG" });
        replacement = third ? matchCase(t.text, third) : null;
      }
    } else {
      suggestions.push(matchCase(t.text, "tu"));
    }
    return { blockId: ctx.block.id, raw: { ruleId: "TRATAMENTO_MISTO", start: t.start, end: t.end, replacement, suggestions, vars: { ...vars, word: t.text }, confidence: 0.8, certainty: "DEMONSTRAVEL" } };
  });
}
