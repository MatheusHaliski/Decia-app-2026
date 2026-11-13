/**
 * Coerência, narrativa e gênero (RF54): conectivos por relação, coesão lexical entre parágrafos (lematização leve),
 * progressão temática por frase (constante, linear, anáfora, conectivo ou ruptura), consistência do tempo verbal,
 * seções esperadas do modelo (relatório técnico, parecer, ofício, ADR), impessoalidade/subjetividade conforme o gênero
 * e continuidade de personagens (morte → reaparição). Tudo heurístico: os achados são hipóteses com evidência ancorada.
 */
import { fold, insideSpans, lightStem } from "./text";
import { sentenceWordCount } from "./grammar";
import type { BlockCtx, RawFinding } from "./findings";
import type { DocType, LetterBlock, TaggedToken, Tempo, TextGenre } from "./types";

export const RELATIONS = ["ADICAO", "OPOSICAO", "CONCESSAO", "CAUSA", "CONSEQUENCIA", "CONCLUSAO", "FINALIDADE", "CONDICAO", "TEMPO", "EXPLICACAO", "COMPARACAO", "CONFORMIDADE"] as const;
export type Relation = (typeof RELATIONS)[number];

export interface ConnectiveHit {
  blockId: string;
  start: number;
  end: number;
  text: string;
  canonical: string;
  relation: Relation;
}

export interface CohesionLink {
  fromBlockId: string;
  toBlockId: string;
  shared: string[];
  overlap: number;
  startsWithConnective: boolean;
}

export interface ProgressionStat {
  blockId: string;
  sentences: number;
  constante: number;
  linear: number;
  anafora: number;
  conectivo: number;
  ruptura: number;
}

export interface SectionStatus {
  key: string;
  present: boolean;
  blockId: string | null;
  empty: boolean;
}

export interface CoherenceReport {
  connectives: ConnectiveHit[];
  byRelation: Record<Relation, number>;
  cohesion: CohesionLink[];
  progression: ProgressionStat[];
  tenses: { blockId: string; presente: number; passado: number; futuro: number }[];
  sections: SectionStatus[];
  findings: { blockId: string | null; raw: RawFinding }[];
}

/* ── Conectivos ──────────────────────────────────────────────────────────────────────────────────────────── */

/** [expressão, relação, só no início da frase/oração (antes de vírgula)] */
const CONNECTIVES: readonly [string, Relation, boolean?][] = [
  ["além disso", "ADICAO"], ["ademais", "ADICAO"], ["outrossim", "ADICAO"], ["bem como", "ADICAO"], ["não só", "ADICAO"], ["mas também", "ADICAO"],
  ["também", "ADICAO"], ["inclusive", "ADICAO"], ["além de", "ADICAO"], ["por sua vez", "ADICAO"],
  ["mas", "OPOSICAO"], ["porém", "OPOSICAO"], ["contudo", "OPOSICAO"], ["todavia", "OPOSICAO"], ["entretanto", "OPOSICAO"], ["no entanto", "OPOSICAO"],
  ["por outro lado", "OPOSICAO"], ["em contrapartida", "OPOSICAO"], ["ao passo que", "OPOSICAO"], ["apesar disso", "OPOSICAO"], ["mesmo assim", "OPOSICAO"],
  ["ainda assim", "OPOSICAO"], ["não obstante", "OPOSICAO"],
  ["embora", "CONCESSAO"], ["ainda que", "CONCESSAO"], ["mesmo que", "CONCESSAO"], ["apesar de", "CONCESSAO"], ["se bem que", "CONCESSAO"], ["conquanto", "CONCESSAO"],
  ["porque", "CAUSA"], ["já que", "CAUSA"], ["visto que", "CAUSA"], ["uma vez que", "CAUSA"], ["devido a", "CAUSA"], ["devido à", "CAUSA"], ["devido ao", "CAUSA"],
  ["em razão de", "CAUSA"], ["por causa de", "CAUSA"], ["porquanto", "CAUSA"], ["em virtude de", "CAUSA"], ["dado que", "CAUSA"], ["pois", "CAUSA"],
  ["de modo que", "CONSEQUENCIA"], ["de forma que", "CONSEQUENCIA"], ["de maneira que", "CONSEQUENCIA"], ["por isso", "CONSEQUENCIA"],
  ["consequentemente", "CONSEQUENCIA"], ["em consequência", "CONSEQUENCIA"], ["por conseguinte", "CONSEQUENCIA"], ["de modo a", "CONSEQUENCIA"],
  ["portanto", "CONCLUSAO"], ["logo", "CONCLUSAO", true], ["assim", "CONCLUSAO", true], ["dessa forma", "CONCLUSAO"], ["desse modo", "CONCLUSAO"],
  ["deste modo", "CONCLUSAO"], ["desta forma", "CONCLUSAO"], ["em suma", "CONCLUSAO"], ["enfim", "CONCLUSAO"], ["por fim", "CONCLUSAO"],
  ["em conclusão", "CONCLUSAO"], ["em síntese", "CONCLUSAO"], ["finalmente", "CONCLUSAO"], ["em resumo", "CONCLUSAO"], ["conclui-se", "CONCLUSAO"],
  ["para que", "FINALIDADE"], ["a fim de que", "FINALIDADE"], ["a fim de", "FINALIDADE"], ["com o objetivo de", "FINALIDADE"], ["com a finalidade de", "FINALIDADE"],
  ["com o intuito de", "FINALIDADE"],
  ["caso", "CONDICAO"], ["desde que", "CONDICAO"], ["contanto que", "CONDICAO"], ["a menos que", "CONDICAO"], ["salvo se", "CONDICAO"], ["exceto se", "CONDICAO"],
  ["quando", "TEMPO"], ["enquanto", "TEMPO"], ["depois que", "TEMPO"], ["antes que", "TEMPO"], ["logo que", "TEMPO"], ["assim que", "TEMPO"], ["sempre que", "TEMPO"],
  ["em seguida", "TEMPO"], ["posteriormente", "TEMPO"], ["anteriormente", "TEMPO"], ["inicialmente", "TEMPO"], ["primeiramente", "TEMPO"],
  ["simultaneamente", "TEMPO"], ["ao mesmo tempo", "TEMPO"], ["depois", "TEMPO", true], ["então", "TEMPO", true], ["atualmente", "TEMPO"],
  ["isto é", "EXPLICACAO"], ["ou seja", "EXPLICACAO"], ["por exemplo", "EXPLICACAO"], ["a saber", "EXPLICACAO"], ["ou melhor", "EXPLICACAO"],
  ["em outras palavras", "EXPLICACAO"], ["vale dizer", "EXPLICACAO"], ["de fato", "EXPLICACAO"], ["com efeito", "EXPLICACAO"],
  ["assim como", "COMPARACAO"], ["tal como", "COMPARACAO"], ["da mesma forma", "COMPARACAO"], ["do mesmo modo", "COMPARACAO"], ["igualmente", "COMPARACAO"],
  ["analogamente", "COMPARACAO"],
  ["conforme", "CONFORMIDADE"], ["segundo", "CONFORMIDADE"], ["de acordo com", "CONFORMIDADE"], ["consoante", "CONFORMIDADE"], ["em conformidade com", "CONFORMIDADE"],
];

const CONN_KEYS = CONNECTIVES.map(([text, relation, initialOnly]) => ({ text, relation, initialOnly: !!initialOnly, keys: text.split(" ").map(fold) })).sort(
  (a, b) => b.keys.length - a.keys.length,
);

/** Conectivos de uma lista de alternativas da mesma relação (sugestões para o repetido). */
export const connectivesOf = (relation: Relation) => CONNECTIVES.filter(([, r, initial]) => r === relation && !initial).map(([t]) => t);

const isWord = (t: TaggedToken) => t.kind === "PALAVRA" || t.kind === "SIGLA";
const POS_CHECKED = new Set(["conforme", "segundo", "caso", "quando", "enquanto"]);

export function findConnectives(ctx: BlockCtx): ConnectiveHit[] {
  const out: ConnectiveHit[] = [];
  const toks = ctx.tokens;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]!;
    if (!isWord(t) || insideSpans(ctx.quoted, t.start, t.end)) continue;
    for (const c of CONN_KEYS) {
      const n = c.keys.length;
      let ok = true;
      for (let k = 0; k < n; k++) {
        const w = toks[i + k];
        if (!w || !isWord(w) || w.key !== c.keys[k] || w.sentence !== t.sentence) { ok = false; break; }
      }
      if (!ok) continue;
      if (c.initialOnly) {
        const before = toks[i - 1];
        const after = toks[i + n];
        const initial = !before || before.sentence !== t.sentence || [",", ";", ":"].includes(before.text);
        if (!initial || after?.text !== ",") continue;
      }
      // palavras de várias classes só contam quando o etiquetador as viu como conjunção/preposição
      if (POS_CHECKED.has(c.text) && t.pos !== "CONJUNCAO" && t.pos !== "PREPOSICAO") continue;
      const last = toks[i + n - 1]!;
      out.push({ blockId: ctx.block.id, start: t.start, end: last.end, text: ctx.text.slice(t.start, last.end), canonical: c.text, relation: c.relation });
      i += n - 1;
      break;
    }
  }
  return out;
}

/* ── Coesão e progressão ─────────────────────────────────────────────────────────────────────────────────── */

const AUX = new Set(["ser", "estar", "ter", "haver", "fazer", "poder", "dever", "ficar", "ir", "ser|ir"]);
const ANAPHORA = new Set(["isso", "isto", "esse", "essa", "esses", "essas", "este", "esta", "estes", "estas", "tal", "tais", "ele", "ela", "eles", "elas", "dessa", "desse", "desses", "dessas", "nesse", "nessa", "nesses", "nessas", "deste", "desta", "neste", "nesta", "aquele", "aquela", "aqueles", "aquelas", "ambos", "ambas", "disso", "nisso", "daí", "mesmo", "mesma"]);

function contentStems(tokens: readonly TaggedToken[], quoted: BlockCtx["quoted"]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    if (!isWord(t) || t.key.length < 4 || insideSpans(quoted, t.start, t.end)) continue;
    if (t.pos === "SUBSTANTIVO" || t.pos === "ADJETIVO" || (t.pos === "VERBO" && !(t.verb && AUX.has(t.verb.lemma))) || (t.pos === "ADVERBIO" && t.lower.endsWith("mente")) || (t.ambiguous && t.candidates.some((c) => c.pos === "SUBSTANTIVO"))) {
      out.push(lightStem(t.text));
    }
  }
  return out;
}

/** a ruptura de progressão só é apontada em parágrafos com 4+ frases, uma vez por parágrafo */
export const PROGRESSION_MIN_SENTENCES = 4;

const intersect = (a: readonly string[], b: ReadonlySet<string>) => [...new Set(a.filter((x) => b.has(x)))];

function progression(ctx: BlockCtx, hits: readonly ConnectiveHit[]): { stat: ProgressionStat; findings: RawFinding[] } {
  const stat: ProgressionStat = { blockId: ctx.block.id, sentences: ctx.sentences.length, constante: 0, linear: 0, anafora: 0, conectivo: 0, ruptura: 0 };
  const findings: RawFinding[] = [];
  const stems = ctx.sentences.map((s) => contentStems(s.tokens, ctx.quoted));
  for (let k = 1; k < ctx.sentences.length; k++) {
    const s = ctx.sentences[k]!;
    const words = s.tokens.filter(isWord);
    const theme = stems[k]!.slice(0, 3);
    const prevTheme = new Set(stems[k - 1]!.slice(0, 3));
    const prevAll = new Set([...stems[k - 1]!, ...(stems[k - 2] ?? [])]);
    const firstWords = words.slice(0, 3);
    if (hits.some((h) => h.start >= s.start && h.start <= (firstWords[1]?.start ?? s.start))) stat.conectivo++;
    else if (firstWords.some((w) => ANAPHORA.has(w.lower))) stat.anafora++;
    else if (intersect(theme, prevTheme).length) stat.constante++;
    else if (intersect(stems[k]!, prevAll).length) stat.linear++;
    else {
      stat.ruptura++;
      if (ctx.sentences.length >= PROGRESSION_MIN_SENTENCES && sentenceWordCount(s) >= 8 && !findings.length && !insideSpans(ctx.quoted, s.start, s.end)) {
        const prev = ctx.sentences[k - 1]!;
        findings.push({ ruleId: "PROGRESSAO_RUPTURA", start: s.start, end: s.end, vars: { sentence: k + 1 }, confidence: 0.5, certainty: "HIPOTESE", related: [{ blockId: ctx.block.id, start: prev.start, end: prev.end, excerpt: prev.text }] });
      }
    }
  }
  return { stat, findings };
}

/* ── Tempo verbal ────────────────────────────────────────────────────────────────────────────────────────── */

const TENSE_GROUP: Partial<Record<Tempo, "presente" | "passado" | "futuro">> = {
  PRESENTE: "presente",
  PRETERITO_PERFEITO: "passado",
  PRETERITO_IMPERFEITO: "passado",
  PRETERITO_MAIS_QUE_PERFEITO: "passado",
  FUTURO_DO_PRESENTE: "futuro",
};

function tenseConsistency(ctx: BlockCtx): { counts: { presente: number; passado: number; futuro: number }; findings: RawFinding[] } {
  const counts = { presente: 0, passado: 0, futuro: 0 };
  const verbs: { t: TaggedToken; g: "presente" | "passado" | "futuro" }[] = [];
  for (const t of ctx.tokens) {
    if (t.pos !== "VERBO" || !t.verb?.tempo || t.verb.modo !== "INDICATIVO" || insideSpans(ctx.quoted, t.start, t.end)) continue;
    const g = TENSE_GROUP[t.verb.tempo];
    if (!g) continue;
    counts[g]++;
    verbs.push({ t, g });
  }
  const total = verbs.length;
  const findings: RawFinding[] = [];
  if (total >= 5 && ctx.block.kind === "PARAGRAFO") {
    const dominant = (Object.entries(counts) as [keyof typeof counts, number][]).sort((a, b) => b[1] - a[1])[0]!;
    if (dominant[1] / total >= 0.75 && dominant[1] < total) {
      for (const v of verbs.filter((x) => x.g !== dominant[0]).slice(0, 3)) {
        findings.push({ ruleId: "TEMPO_VERBAL_MISTO", start: v.t.start, end: v.t.end, vars: { dominant: dominant[0], found: v.g, word: v.t.text, count: dominant[1], total }, confidence: 0.5, certainty: "HIPOTESE" });
      }
    }
  }
  return { counts, findings };
}

/* ── Seções esperadas do modelo ──────────────────────────────────────────────────────────────────────────── */

export const EXPECTED_SECTIONS: Readonly<Record<DocType, readonly { key: string; synonyms: readonly string[] }[]>> = {
  RELATORIO_TECNICO: [
    { key: "introducao", synonyms: ["introducao", "apresentacao", "contexto"] },
    { key: "objetivo", synonyms: ["objetivo", "objetivos", "finalidade"] },
    { key: "metodologia", synonyms: ["metodologia", "metodo", "metodos", "materiais e metodos", "desenvolvimento", "procedimentos"] },
    { key: "resultados", synonyms: ["resultados", "resultado", "analise dos resultados", "discussao"] },
    { key: "conclusao", synonyms: ["conclusao", "conclusoes", "consideracoes finais", "recomendacoes"] },
    { key: "referencias", synonyms: ["referencias", "referencias bibliograficas", "bibliografia"] },
  ],
  PARECER: [
    { key: "relatorio", synonyms: ["relatorio", "historico", "dos fatos", "dos autos"] },
    { key: "analise", synonyms: ["analise", "fundamentacao", "fundamentos", "do merito", "merito", "da analise"] },
    { key: "conclusao", synonyms: ["conclusao", "conclusoes", "do parecer", "dispositivo"] },
  ],
  ADR: [
    { key: "status", synonyms: ["status", "situacao", "estado"] },
    { key: "contexto", synonyms: ["contexto"] },
    { key: "decisao", synonyms: ["decisao"] },
    { key: "consequencias", synonyms: ["consequencias", "implicacoes"] },
  ],
  OFICIO: [],
  LIVRE: [],
};

const OFICIO_ELEMENTS: readonly { key: string; re: RegExp }[] = [
  { key: "identificacao", re: /^\s*(of[ií]cio|memorando|memo)\b[^\n]*\bn[º°o.]/im },
  { key: "data", re: /\b\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\b/i },
  { key: "assunto", re: /^\s*assunto\s*:/im },
  { key: "vocativo", re: /^\s*(senhor|senhora|prezad[oa]s?|excelent[ií]ssim[oa]|ilustr[ií]ssim[oa]|magn[ií]fic[oa])\b[^\n]*,\s*$/im },
  { key: "fecho", re: /^\s*(atenciosamente|respeitosamente)\s*,?\s*$/im },
];

const headingKey = (text: string) => fold(text).trim().replace(/^(?:(?:\d+(?:\.\d+)*|[ivxlc]+)[.)\s–-]+)+/i, "").replace(/[:.]+$/, "").trim();

function sections(blocks: readonly LetterBlock[], docType: DocType): { statuses: SectionStatus[]; findings: { blockId: string | null; raw: RawFinding }[] } {
  const findings: { blockId: string | null; raw: RawFinding }[] = [];
  if (docType === "OFICIO") {
    const body = blocks.filter((b) => b.kind !== "TITULO").map((b) => b.text).join("\n");
    const statuses = OFICIO_ELEMENTS.map((e) => ({ key: e.key, present: e.re.test(body), blockId: null, empty: false }));
    for (const s of statuses) if (!s.present) findings.push({ blockId: null, raw: { ruleId: "ELEMENTO_OFICIO_AUSENTE", start: 0, end: 0, vars: { element: s.key }, confidence: 0.75, certainty: "HIPOTESE" } });
    return { statuses, findings };
  }
  const expected = EXPECTED_SECTIONS[docType];
  if (!expected.length) return { statuses: [], findings };
  const ruleId = docType === "RELATORIO_TECNICO" ? "SECAO_AUSENTE" : docType === "ADR" ? "SECAO_ADR_AUSENTE" : "SECAO_MODELO_AUSENTE";
  const found: { key: string; index: number; block: LetterBlock }[] = [];
  blocks.forEach((b, index) => {
    if (b.kind !== "TITULO") return;
    const h = headingKey(b.text);
    const sec = expected.find((e) => e.synonyms.some((s) => h === s || h.startsWith(`${s} `)));
    if (sec && !found.some((f) => f.key === sec.key)) found.push({ key: sec.key, index, block: b });
  });
  const statuses: SectionStatus[] = expected.map((e) => {
    const f = found.find((x) => x.key === e.key);
    if (!f) {
      const refBlock = e.key === "referencias" ? blocks.find((b) => b.kind === "REFERENCIAS") : undefined;
      return { key: e.key, present: !!refBlock, blockId: refBlock?.id ?? null, empty: refBlock ? !refBlock.text.trim() : false };
    }
    let empty = true;
    for (let i = f.index + 1; i < blocks.length && blocks[i]!.kind !== "TITULO"; i++) if (blocks[i]!.text.trim()) empty = false;
    return { key: e.key, present: true, blockId: f.block.id, empty };
  });
  for (const s of statuses) {
    if (!s.present) findings.push({ blockId: null, raw: { ruleId, start: 0, end: 0, vars: { section: s.key, docType }, confidence: 0.8, certainty: "DEMONSTRAVEL" } });
    else if (s.empty && s.blockId) {
      const b = blocks.find((x) => x.id === s.blockId)!;
      findings.push({ blockId: b.id, raw: { ruleId: "SECAO_VAZIA", start: 0, end: b.text.length, vars: { section: s.key }, confidence: 0.9, certainty: "DEMONSTRAVEL" } });
    }
  }
  // ordem: a sequência das seções encontradas deve seguir a do modelo
  const order = found.sort((a, b) => a.index - b.index).map((f) => ({ f, rank: expected.findIndex((e) => e.key === f.key) }));
  for (let i = 1; i < order.length; i++) {
    if (order[i]!.rank < order[i - 1]!.rank) {
      const b = order[i]!.f.block;
      findings.push({ blockId: b.id, raw: { ruleId: "SECAO_FORA_DE_ORDEM", start: 0, end: b.text.length, vars: { section: order[i]!.f.key, after: order[i - 1]!.f.key }, confidence: 0.75, certainty: "DEMONSTRAVEL" } });
      break;
    }
  }
  return { statuses, findings };
}

/* ── Gênero: impessoalidade, subjetividade e continuidade narrativa ──────────────────────────────────────── */

const FIRST_SG = new Set(["eu", "meu", "minha", "meus", "minhas", "mim", "comigo"]);
const FIRST_PL = new Set(["nós", "nosso", "nossa", "nossos", "nossas", "conosco"]);

function personMarkers(ctx: BlockCtx, plural: boolean): TaggedToken[] {
  if (ctx.block.kind === "CITACAO" || ctx.block.kind === "REFERENCIAS" || ctx.block.kind === "TITULO") return [];
  return ctx.tokens.filter((t) => {
    if (!isWord(t) || insideSpans(ctx.quoted, t.start, t.end)) return false;
    if (FIRST_SG.has(t.lower)) return true;
    if (plural && (FIRST_PL.has(t.lower) || (t.lower === "nos" && t.pos === "PRONOME"))) return true;
    return t.pos === "VERBO" && t.verb?.pessoa === 1 && (plural || t.verb.numero === "SG") && !t.verb.forma;
  });
}

const DEATH = /\b(morreu|morrera|faleceu|falecera|foi\s+mort[oa]|foi\s+assassinad[oa]|est[áa]\s+mort[oa]|estava\s+mort[oa]|sepultad[oa]|enterrad[oa]|assassinad[oa])\b/i;
const DEATH_OF = /\b(morte|corpo|enterro|vel[óo]rio|funeral)\s+de\s+(\p{Lu}[\p{L}'’-]+)/u;
const MEMORY = /\b(lembr\w*|record\w*|mem[óo]ria\w*|saudade\w*|t[úu]mulo|vel[óo]rio|enterro|sonh\w*|fantasma|esp[íi]rito|retrato|fotografia|foto|antes\s+de\s+morrer|em\s+vida|anos\s+antes|naquela\s+[ée]poca|quando\s+ainda|outrora|flashback)\b/i;
const ALIVE = /\b(viv[oa]|sobreviveu|sobrevivera|est[áa]\s+bem)\b/i;

function continuity(ctxs: readonly BlockCtx[]): { blockId: string; raw: RawFinding }[] {
  const names = new Set<string>();
  for (const c of ctxs) for (const t of c.tokens) if (t.sub === "próprio") names.add(t.text);
  if (!names.size) return [];
  const deaths = new Map<string, { blockId: string; start: number; end: number; excerpt: string }>();
  const out: { blockId: string; raw: RawFinding }[] = [];
  for (const c of ctxs) {
    if (c.block.kind !== "PARAGRAFO" && c.block.kind !== "CITACAO") continue;
    for (const s of c.sentences) {
      const toks = s.tokens;
      const present = toks.filter((t) => names.has(t.text));
      if (!present.length) continue;
      const deathMatch = s.text.match(DEATH);
      const deathOf = s.text.match(DEATH_OF);
      if (deathMatch || deathOf) {
        const who = deathOf?.[2] && names.has(deathOf[2]) ? deathOf[2] : present[0]!.text;
        if (!deaths.has(who)) deaths.set(who, { blockId: c.block.id, start: s.start, end: s.end, excerpt: s.text });
        continue;
      }
      for (const t of present) {
        const death = deaths.get(t.text);
        if (!death || MEMORY.test(s.text)) continue;
        const acts = toks.some((x) => x.pos === "VERBO" && !!x.verb && !x.verb.forma);
        if (!acts) continue;
        const alive = ALIVE.test(s.text);
        out.push({
          blockId: c.block.id,
          raw: {
            ruleId: "CONTINUIDADE_PERSONAGEM",
            start: s.start,
            end: s.end,
            vars: { name: t.text },
            confidence: alive ? 0.8 : 0.6,
            certainty: alive ? "DEMONSTRAVEL" : "HIPOTESE",
            related: [death],
          },
        });
        deaths.delete(t.text); // uma vez por personagem
      }
    }
  }
  return out;
}

/* ── API ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export function analyzeCoherence(ctxs: readonly BlockCtx[], opts: { docType: DocType; genre: TextGenre; citations: number; words: number }): CoherenceReport {
  const findings: CoherenceReport["findings"] = [];
  const connectives = ctxs.flatMap(findConnectives);
  const byRelation = Object.fromEntries(RELATIONS.map((r) => [r, 0])) as Record<Relation, number>;
  for (const h of connectives) byRelation[h.relation]++;

  // conectivo repetido (4+ vezes no documento)
  const counts = new Map<string, ConnectiveHit[]>();
  for (const h of connectives) counts.set(h.canonical, [...(counts.get(h.canonical) ?? []), h]);
  for (const [canonical, hits] of counts) {
    if (hits.length < 4 || ["mas", "quando", "porque", "pois", "também", "conforme"].includes(canonical)) continue;
    const last = hits[hits.length - 1]!;
    findings.push({ blockId: last.blockId, raw: { ruleId: "CONECTIVO_REPETIDO", start: last.start, end: last.end, suggestions: connectivesOf(last.relation).filter((c) => c !== canonical).slice(0, 3), vars: { connective: canonical, count: hits.length, relation: last.relation }, confidence: 0.7, certainty: "DEMONSTRAVEL" } });
  }

  const paragraphs = ctxs.filter((c) => c.block.kind === "PARAGRAFO");
  const progressionStats: ProgressionStat[] = [];
  const tenses: CoherenceReport["tenses"] = [];
  for (const c of paragraphs) {
    const hits = connectives.filter((h) => h.blockId === c.block.id);
    if (c.sentences.length >= 3 && !hits.length) {
      const first = c.sentences[0]!;
      findings.push({ blockId: c.block.id, raw: { ruleId: "PARAGRAFO_SEM_CONECTIVO", start: first.start, end: first.end, vars: { sentences: c.sentences.length }, confidence: 0.55, certainty: "HIPOTESE" } });
    }
    const p = progression(c, hits);
    progressionStats.push(p.stat);
    for (const raw of p.findings) findings.push({ blockId: c.block.id, raw });
    const tc = tenseConsistency(c);
    tenses.push({ blockId: c.block.id, ...tc.counts });
    for (const raw of tc.findings) findings.push({ blockId: c.block.id, raw });
  }

  // coesão entre parágrafos consecutivos da mesma seção
  const cohesion: CohesionLink[] = [];
  for (let i = 1; i < ctxs.length; i++) {
    const a = ctxs[i - 1]!;
    const b = ctxs[i]!;
    if (a.block.kind !== "PARAGRAFO" || b.block.kind !== "PARAGRAFO") continue;
    const sa = contentStems(a.tokens, a.quoted);
    const sb = contentStems(b.tokens, b.quoted);
    if (sa.length < 4 || sb.length < 4) continue;
    const shared = intersect(sb, new Set(sa));
    const firstSentence = b.sentences[0];
    const startsWithConnective = connectives.some((h) => h.blockId === b.block.id && firstSentence && h.start <= firstSentence.start + 2);
    const overlap = Math.round((shared.length / Math.min(new Set(sa).size, new Set(sb).size)) * 100) / 100;
    cohesion.push({ fromBlockId: a.block.id, toBlockId: b.block.id, shared: shared.slice(0, 6), overlap, startsWithConnective });
    if (!shared.length && !startsWithConnective && firstSentence) {
      const prevLast = a.sentences[a.sentences.length - 1];
      findings.push({
        blockId: b.block.id,
        raw: { ruleId: "COESAO_BAIXA", start: firstSentence.start, end: firstSentence.end, vars: { shared: 0 }, confidence: 0.6, certainty: "HIPOTESE", related: prevLast ? [{ blockId: a.block.id, start: prevLast.start, end: prevLast.end, excerpt: prevLast.text }] : undefined },
      });
    }
  }

  const sec = sections(ctxs.map((c) => c.block), opts.docType);
  findings.push(...sec.findings);

  // gênero
  if ((opts.genre === "TECNICO" || opts.genre === "ACADEMICO") && opts.docType !== "OFICIO") {
    const marks = ctxs.flatMap((c) => personMarkers(c, false).map((t) => ({ c, t }))).slice(0, 5);
    for (const { c, t } of marks) findings.push({ blockId: c.block.id, raw: { ruleId: "IMPESSOALIDADE", start: t.start, end: t.end, vars: { word: t.text, genre: opts.genre }, confidence: 0.7, certainty: "HIPOTESE" } });
  }
  if (opts.genre === "JORNALISTICO") {
    const marks = ctxs.flatMap((c) => personMarkers(c, true).map((t) => ({ c, t }))).slice(0, 5);
    for (const { c, t } of marks) findings.push({ blockId: c.block.id, raw: { ruleId: "SUBJETIVIDADE", start: t.start, end: t.end, vars: { word: t.text }, confidence: 0.7, certainty: "HIPOTESE" } });
  }
  if (opts.genre === "ACADEMICO" && opts.words >= 150 && opts.citations === 0) {
    findings.push({ blockId: null, raw: { ruleId: "TEXTO_SEM_CITACAO", start: 0, end: 0, vars: { words: opts.words }, confidence: 0.8, certainty: "DEMONSTRAVEL" } });
  }
  if (opts.genre === "NARRATIVO") findings.push(...continuity(ctxs));

  return { connectives, byRelation, cohesion, progression: progressionStats, tenses, sections: sec.statuses, findings };
}
