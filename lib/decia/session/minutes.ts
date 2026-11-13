/**
 * Compilação DETERMINÍSTICA da ata (RF37.CA02, "IA ✦" simulada por regras, D-12): da transcrição saem participantes, pauta,
 * falas por pessoa, decisões, encaminhamentos com RESPONSÁVEL e PRAZO e pendências — cada item com a frase exata de origem
 * (`SourceSpan`). Nada é inventado: o que as regras não reconhecem fica de fora (ou "a definir") e a pessoa revisa tudo antes
 * de ratificar.
 *
 * Regras de reconhecimento (frase a frase):
 *  - decisão: "decidiu-se", "decidimos", "fica/ficou/foi decidido", "fica/ficou/foi aprovado", "aprovado por unanimidade",
 *    "aprovamos", "fica/ficou definido", "ficou acordado", "acordamos", "deliberou-se", "resolveu-se", "fica/foi rejeitado",
 *    "Decisão: …" — negada ("ainda não foi decidido") vira PENDÊNCIA;
 *  - encaminhamento: "Encaminhamento: …" (com "responsável: X" e "prazo: …"), "X fica responsável por…", "X ficou de…",
 *    "X se compromete a…", "X fica com…", "fica a cargo de X…", "cabe a X…", "@x …", "eu fico com…", "eu me comprometo a…"
 *    (sempre); "X vai…", "X irá…", "X deve…", "eu vou…" só com prazo na frase (sem prazo é conversa, não compromisso);
 *  - pauta: "Pauta: a; b; c", "Primeiro ponto: …", "Item 2: …", "Próximo item: …", "Passando ao item …".
 */
import { parseDue } from "./dates";
import { matchPerson, type PersonRef } from "./people";
import { splitSentences, type ParsedTranscript, type Segment } from "./transcript";
import type { DateOnly, DueDate, FollowUpDraft, MinutesDraft, MinutesItem, PersonMatch, SourceSpan, SpeakerSummary } from "./types";

export interface CompileContext { members: readonly PersonRef[]; baseDate: DateOnly }

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/* ── Decisões e pendências ───────────────────────────────────────────────────────────────────────────────── */

const DECISION = /\b(decidiu-se|decidimos|decidid[oa]s?|fica(?:m)? aprovad[oa]s?|ficou aprovad[oa]s?|foi aprovad[oa]|foram aprovad[oa]s|aprovad[oa]s? por unanimidade|aprovamos|fica(?:m)? definid[oa]s?|ficou definid[oa]|ficou acordad[oa]|fica acordad[oa]|acordamos|deliberou-se|delibera-se|resolveu-se|fica rejeitad[oa]|foi rejeitad[oa]|rejeitamos)\b|^decis(?:ao|oes)\s*[:\-–]/;
const NEGATED = /\b(nao|nem|ainda nao|sem)\s+(?:\S+\s+){0,2}(?:foi\s+|ficou\s+|fica\s+)?(decidid|aprovad|definid|acordad)/;
const PENDING = /\b(fica(?:m)? pendentes?|ficou pendente|ficaram pendentes|em aberto|a confirmar|sem definicao|nao (?:foi|esta|ficou) (?:decidid|definid)|ainda nao (?:foi )?(?:decidid|definid)|pendencia\s*:)/;

export const isDecision = (sentence: string) => { const f = fold(sentence); return DECISION.test(f) && !NEGATED.test(f); };
export const isPending = (sentence: string) => { const f = fold(sentence); return PENDING.test(f) || (DECISION.test(f) && NEGATED.test(f)); };

const cleanItem = (s: string) => s.replace(/^\s*(?:decis(?:ão|ao|ões|oes)|pend[eê]ncias?|obs)\s*[:\-–]\s*/iu, "").trim();

/* ── Pauta ───────────────────────────────────────────────────────────────────────────────────────────────── */

const AGENDA_LINE = /^(?:pauta(?:\s+do\s+dia|\s+da\s+reuniao)?)\s*[:\-–]\s*/;
const AGENDA_SENTENCE = /^(?:(?:o|a)\s+)?(?:(?:primeiro|segundo|terceiro|quarto|quinto|proximo|ultimo)\s+(?:item|ponto|assunto|tema)(?:\s+da\s+pauta)?|(?:item|ponto)\s+(?:\d{1,2}|um|dois|tres|quatro|cinco)(?:\s+da\s+pauta)?|passando\s+(?:ao|para\s+o|pro)\s+(?:proximo\s+)?(?:item|ponto|assunto|tema))\s*(?:[:\-–]|\be\b|\bsobre\b)?\s*/;

function agendaFromText(text: string): string[] {
  const f = fold(text);
  const head = AGENDA_LINE.exec(f);
  if (!head) return [];
  const body = text.slice(head[0].length);
  return body
    .split(/;|\n|\s(?=\(?\d{1,2}[.)–-]\s)/)
    .map((s) => s.replace(/^\s*\(?\d{1,2}[.)–-]\s*/, "").replace(/^\s*[a-z][)]\s*/i, "").replace(/[.;,]\s*$/, "").trim())
    .filter((s) => s.length >= 2);
}

function agendaFromSentence(sentence: string): string | null {
  const m = AGENDA_SENTENCE.exec(fold(sentence));
  if (!m) return null;
  const rest = sentence.slice(m[0].length).replace(/[.;:]\s*$/, "").trim();
  return rest.length >= 2 ? rest : null;
}

/* ── Encaminhamentos ─────────────────────────────────────────────────────────────────────────────────────── */

const NAME = String.raw`(?:@[\p{L}\p{N}._-]{2,40}|\p{Lu}[\p{L}'’-]+(?:\s+(?:d[aeo]s?\s+)?\p{Lu}[\p{L}'’-]+){0,3}(?:\s+e\s+\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+){0,2})?)`;
const LEAD = String.raw`(?:^|[,;:]\s*|\b(?:e|que|então|entao|ok|certo|bom)\s+)`;
const STRONG_VERBS = [
  String.raw`fica(?:r[aá])?\s+respons[aá]vel\s+(?:por|pela|pelo|pelas|pelos)`, String.raw`ficou\s+respons[aá]vel\s+(?:por|pela|pelo|pelas|pelos)`,
  String.raw`se\s+compromete\s+a`, String.raw`se\s+comprometeu\s+(?:a|em)`, String.raw`ficou\s+de`, String.raw`fica\s+de`,
  String.raw`se\s+encarrega\s+de`, String.raw`se\s+encarregou\s+de`, String.raw`vai\s+ficar\s+com`, String.raw`fica\s+com`, String.raw`assume`, String.raw`assumiu`,
];
const WEAK_VERBS = [String.raw`vai`, String.raw`v[aã]o`, String.raw`ir[aá]`, String.raw`ir[aã]o`, String.raw`deve`, String.raw`devem`, String.raw`precisa`, String.raw`tem\s+que`];
const SUBJECT_VERB = (verbs: string[]) => new RegExp(`${LEAD}(?:[AaOo]\\s+)?(${NAME})\\s+(?:${verbs.join("|")})\\s+(.+)$`, "u");
const SUBJECT_STRONG = SUBJECT_VERB(STRONG_VERBS);
const SUBJECT_WEAK = SUBJECT_VERB(WEAK_VERBS);
const OBJECT_FIRST = [
  new RegExp(String.raw`\b(?:[Ff]ica|[Ff]icou)\s+a\s+cargo\s+d[aeo]s?\s+(${NAME})\s*(?:[:,–-]\s*)?(.*)$`, "u"),
  new RegExp(String.raw`\b(?:[Cc]abe|[Cc]aber[aá])\s+(?:a|à|ao)\s+(${NAME})\s+(.+)$`, "u"),
  new RegExp(String.raw`\b(?:[Ff]ica|[Ff]icou)\s+com\s+(?:a\s+|o\s+)?(${NAME})\s+(?:a\s+tarefa\s+de\s+|o\s+encargo\s+de\s+)?(.+)$`, "u"),
];
const MENTION_FIRST = new RegExp(String.raw`^(@[\p{L}\p{N}._-]{2,40})[,:]?\s+(.+)$`, "u");
const FIRST_PERSON_STRONG = /^(?:(?:ent[aã]o|ok|certo|bom|beleza|t[aá]),?\s+)?(?:eu\s+)?(?:fico\s+com|fico\s+respons[aá]vel\s+(?:por|pela|pelo|pelas|pelos)|me\s+comprometo\s+a|me\s+encarrego\s+de|assumo)\s+(.+)$/iu;
const FIRST_PERSON_WEAK = /^(?:(?:ent[aã]o|ok|certo|bom|beleza|t[aá]),?\s+)?(?:eu\s+)?vou\s+(.+)$/iu;
const EXPLICIT = /^(?:encaminhamentos?|a[cç](?:[aã]o|[oõ]es)|tarefa)\s*[:\-–]\s*(.+)$/iu;
const RESPONSIBLE_FIELD = new RegExp(String.raw`[,;(—–-]?\s*respons[aá]vel\s*[:\-–]?\s*(${NAME})\s*\)?`, "iu");
const DUE_FIELD = /[,;(—–-]?\s*prazo\s*[:\-–]?\s*/iu;

/** Sujeitos que parecem nome próprio mas não são pessoa ("Isso vai…", "Ninguém deve…"). */
const NOT_A_PERSON = new Set([
  "isso", "isto", "aquilo", "ele", "ela", "eles", "elas", "nos", "voce", "voces", "alguem", "ninguem", "todos", "todas", "quem", "gente",
  "cada", "esse", "essa", "este", "esta", "aquele", "aquela", "tudo", "nada", "o", "a", "os", "as", "um", "uma", "se", "nao", "sim", "tambem",
  "depois", "entao", "hoje", "amanha", "agora", "ai", "la", "aqui", "equipe", "time", "grupo", "sistema", "projeto", "segunda", "terca", "quarta",
  "quinta", "sexta", "sabado", "domingo", "pauta", "ata", "decisao", "prazo", "isso ai", "eu",
]);

function cleanAction(action: string, due: DueDate | null): string {
  let a = action;
  if (due?.raw) a = a.replace(due.raw, " ");
  a = a.replace(RESPONSIBLE_FIELD, " ").replace(/\s{2,}/g, " ");
  a = a.replace(/\s*(?:[,;—–-]\s*)?(?:at[ée](?:\s+(?:o|a))?(?:\s+dia)?|prazo\s*:?|para|no\s+prazo\s+de|com\s+prazo)\s*[.,;:!?]*\s*$/iu, "");
  a = a.replace(/^\s*(?:a|o|as|os)\s+(?=\p{L})/u, "").replace(/[\s.,;:!?—–-]+$/u, "").replace(/^[\s,;:—–-]+/u, "").trim();
  return a ? (a[0]!.toUpperCase() + a.slice(1)).slice(0, 200) : "";
}

interface RawFollowUp { action: string; responsible: PersonMatch; due: DueDate | null }

function subjectMatch(raw: string, speaker: string | null, people: readonly PersonRef[]): PersonMatch | null {
  const f = fold(raw.trim());
  if (f === "eu") return speaker ? matchPerson(speaker, people) : { status: "A_DEFINIR", raw: null };
  if (NOT_A_PERSON.has(f) || NOT_A_PERSON.has(f.split(/\s+/)[0]!)) return null;
  return matchPerson(raw, people);
}

/** Encaminhamento de uma frase (ou null). `speaker` resolve "eu fico com…". */
export function extractFollowUp(sentence: string, speaker: string | null, people: readonly PersonRef[], baseDate: DateOnly): RawFollowUp | null {
  const s = sentence.trim();
  const due = parseDue(s, baseDate);
  const explicit = EXPLICIT.exec(s);
  if (explicit) {
    let body = explicit[1]!;
    const field = RESPONSIBLE_FIELD.exec(body);
    let responsible: PersonMatch = field ? matchPerson(field[1]!, people) : { status: "A_DEFINIR", raw: null };
    if (!field) {
      const inner = extractFollowUp(body, speaker, people, baseDate);
      if (inner && inner.responsible.status !== "A_DEFINIR") return { ...inner, due: inner.due ?? due };
      const mention = /@[\p{L}\p{N}._-]{2,40}/u.exec(body);
      if (mention) responsible = matchPerson(mention[0], people);
    }
    body = body.replace(DUE_FIELD, " ");
    const action = cleanAction(body, due);
    return action ? { action, responsible, due } : null;
  }
  for (const re of OBJECT_FIRST) {
    const m = re.exec(s);
    if (m) {
      const responsible = subjectMatch(m[1]!, speaker, people);
      const action = cleanAction(m[2] ?? "", due);
      if (responsible && action) return { action, responsible, due };
    }
  }
  const mention = MENTION_FIRST.exec(s);
  if (mention) {
    const action = cleanAction(mention[2]!, due);
    if (action) return { action, responsible: matchPerson(mention[1]!, people), due };
  }
  const fp = FIRST_PERSON_STRONG.exec(s) ?? (due ? FIRST_PERSON_WEAK.exec(s) : null);
  if (fp) {
    const action = cleanAction(fp[1]!, due);
    if (action) return { action, responsible: speaker ? matchPerson(speaker, people) : { status: "A_DEFINIR", raw: null }, due };
  }
  for (const [re, strong] of [[SUBJECT_STRONG, true], [SUBJECT_WEAK, false]] as const) {
    const m = re.exec(s);
    if (!m) continue;
    const responsible = subjectMatch(m[1]!, speaker, people);
    if (!responsible) continue;
    // verbo fraco ("vai", "deve") só é compromisso com prazo; nome que não é membro também exige prazo
    if (!strong && !due) continue;
    if (responsible.status === "A_DEFINIR" && !due && !strong) continue;
    const action = cleanAction(m[2]!, due);
    if (action) return { action, responsible, due };
  }
  return null;
}

/* ── Compilação ──────────────────────────────────────────────────────────────────────────────────────────── */

const span = (seg: Segment, index: number, text: string): SourceSpan => ({ segment: index, line: seg.line, speaker: seg.speaker, text });
const wordCount = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length;

export function compileMinutes(parsed: ParsedTranscript, ctx: CompileContext): MinutesDraft {
  const agenda: MinutesItem[] = [];
  const decisions: MinutesItem[] = [];
  const pending: MinutesItem[] = [];
  const followUps: FollowUpDraft[] = [];
  const speakers = new Map<string, SpeakerSummary>();
  const seenAgenda = new Set<string>();
  const addAgenda = (text: string, source: SourceSpan) => {
    const k = fold(text);
    if (seenAgenda.has(k)) return;
    seenAgenda.add(k);
    agenda.push({ id: `ag-${agenda.length + 1}`, text, source });
  };
  let words = 0;
  parsed.segments.forEach((seg, i) => {
    words += wordCount(seg.text);
    if (seg.speaker) {
      const m = matchPerson(seg.speaker, ctx.members);
      const key = m.status === "CASADO" ? `u:${m.userId}` : `n:${fold(seg.speaker)}`;
      const name = m.status === "CASADO" ? ctx.members.find((p) => p.userId === m.userId)!.name : seg.speaker;
      const entry = speakers.get(key) ?? { name, userId: m.status === "CASADO" ? m.userId : null, utterances: [] };
      entry.utterances.push({ line: seg.line, text: seg.text });
      speakers.set(key, entry);
    }
    for (const item of agendaFromText(seg.text)) addAgenda(item, span(seg, i, seg.text));
    if (AGENDA_LINE.test(fold(seg.text))) return; // a linha da pauta não é deliberação
    for (const sentence of splitSentences(seg.text)) {
      const source = span(seg, i, sentence);
      const ag = agendaFromSentence(sentence);
      if (ag) addAgenda(ag, source);
      if (isPending(sentence)) pending.push({ id: `pd-${pending.length + 1}`, text: cleanItem(sentence), source });
      else if (isDecision(sentence)) decisions.push({ id: `dc-${decisions.length + 1}`, text: cleanItem(sentence), source });
      const fu = extractFollowUp(sentence, seg.speaker, ctx.members, ctx.baseDate);
      if (fu) followUps.push({ id: `fu-${followUps.length + 1}`, action: fu.action, responsible: fu.responsible, due: fu.due, source, accepted: null });
    }
  });
  const speeches = [...speakers.values()];
  return {
    baseDate: ctx.baseDate,
    participants: speeches.map((s) => ({ name: s.name, userId: s.userId })),
    agenda,
    speeches,
    decisions,
    followUps,
    pending,
    stats: { segments: parsed.segments.length, speakers: speeches.length, words },
  };
}
