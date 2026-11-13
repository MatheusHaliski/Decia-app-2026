/**
 * "IA do DECIA" simulada e determinística (D-12; nenhuma chamada a modelo externo). Responde SÓ com:
 *   - fatos calculados pelo sistema a partir da própria sessão (perguntas abertas, evidências, encaminhamentos, decisões em ata);
 *   - trechos EXATOS da Memória Institucional (`searchMemory`, RF33), numerados [1], [2]… com a referência de cada um.
 * Sem fato nem fonte, a resposta diz que não encontrou — nunca inventa. O texto da pergunta e os trechos citados são DADOS
 * (RF51.CA06): nada do que vem deles muda permissões, ferramentas ou a política da IA.
 */
import { evaluateAiAction, type AiPolicy } from "@/lib/ai/autonomy";
import { searchMemory, type MemoryDoc, type MemorySearch } from "@/lib/memory/search";
import { evidenceMessages, openQuestions } from "./chat";
import { isChatOpen } from "./machine";
import { can, memberRole } from "./roles";
import type { AiAnswer, CommandResult, DeciaSession, MemoryCitation, PeopleDirectory, SessionFact, SessionMessage } from "./types";

export const MAX_CITATIONS = 3;
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export type FactIntent = SessionFact["key"];

/** Que fatos da sessão a pergunta pede (por palavras-chave, sem interpretação livre). */
export function factIntents(question: string): FactIntent[] {
  const q = fold(question);
  const out: FactIntent[] = [];
  if (/\bpergunt/.test(q) && /\b(abert|pendent|sem resposta|respond)/.test(q)) out.push("PERGUNTAS_ABERTAS");
  if (/\bevidenc|\bfontes? apresentad|\banexo/.test(q)) out.push("EVIDENCIAS");
  if (/\bencaminhament|\btarefas? da ata|\bpendencias?\b/.test(q)) out.push("ENCAMINHAMENTOS");
  if (/\bdecis(ao|oes)\b.*\bata\b|\bata\b.*\bdecid|\bo que (foi|ficou) decidido|\bdecidimos\b/.test(q)) out.push("DECISOES_EM_ATA");
  return out;
}

const nameOf = (people: PeopleDirectory, id: string) => people[id]?.name ?? id;
const authorName = (m: SessionMessage, people: PeopleDirectory) => (m.author.kind === "PESSOA" ? nameOf(people, m.author.userId) : "—");

/** Fatos pedidos, calculados da sessão. Os itens são os próprios textos registrados (dados), com autoria. */
export function sessionFacts(session: DeciaSession, intents: readonly FactIntent[], people: PeopleDirectory): SessionFact[] {
  const out: SessionFact[] = [];
  for (const key of intents) {
    if (key === "PERGUNTAS_ABERTAS") {
      const qs = openQuestions(session);
      out.push({ key, n: qs.length, items: qs.map((m) => `${authorName(m, people)}: ${m.text}`) });
    } else if (key === "EVIDENCIAS") {
      const ev = evidenceMessages(session);
      out.push({ key, n: ev.length, items: ev.map((m) => `${authorName(m, people)}: ${m.text}${m.reference ? ` (${m.reference.label})` : ""}`) });
    } else if (key === "ENCAMINHAMENTOS") {
      const open = session.followUps.filter((f) => f.status === "ABERTO");
      const done = session.followUps.filter((f) => f.status === "CUMPRIDO");
      out.push({ key, open: open.length, done: done.length, items: open.map((f) => `${f.action} — ${nameOf(people, f.responsibleId)} · ${f.dueDate}`) });
    } else {
      const decisions = session.meetings.filter((mt) => mt.status === "CONFIRMADA" || mt.status === "CONTESTADA").flatMap((mt) => mt.draft?.decisions ?? []);
      out.push({ key, n: decisions.length, items: decisions.map((d) => d.text) });
    }
  }
  return out;
}

export interface AnswerOptions {
  search?: MemorySearch;
  readable?: readonly MemoryDoc["accessClass"][];
}

/** Monta a resposta: trechos exatos da Memória (numerados) e fatos da sessão; vazio = "não encontrei". */
export function composeAnswer(question: string, session: DeciaSession, people: PeopleDirectory, opts: AnswerOptions = {}): AiAnswer {
  const search = opts.search ?? searchMemory;
  const hits = question.trim()
    ? search(question, { k: MAX_CITATIONS, readable: opts.readable ?? ["PUBLICO", "INTERNO"] })
    : [];
  const citations: MemoryCitation[] = hits.slice(0, MAX_CITATIONS).map((h, i) => ({
    n: i + 1, docId: h.docId, kind: h.kind, title: h.title, citation: h.citation, passage: h.passage.text, href: h.href,
  }));
  return { query: question.trim(), citations, facts: sessionFacts(session, factIntents(question), people) };
}

export const answerFound = (a: AiAnswer) => a.citations.length > 0 || a.facts.length > 0;

/**
 * Pergunta dirigida à IA: grava a pergunta (PERGUNTA com `toAi`) e a resposta da IA (RESPOSTA, autor IA, `requestedBy`).
 * Só quando o modo efetivo de quem pergunta permite RESPONDER a pedido (nunca em Manual).
 */
export function askAi(
  session: DeciaSession,
  actor: string,
  viewerPolicy: AiPolicy,
  question: string,
  people: PeopleDirectory,
  now: Date,
  ids: { question: string; answer: string },
  opts: AnswerOptions = {},
): CommandResult<{ session: DeciaSession; question: SessionMessage; answer: SessionMessage }> {
  if (!memberRole(session, actor)) return { ok: false, reason: "NAO_PARTICIPA" };
  if (!isChatOpen(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  if (!can(session, actor, "PERGUNTAR_IA")) return { ok: false, reason: "SEM_PERMISSAO" };
  const verdict = evaluateAiAction(viewerPolicy, "RESPONDER", { requestedByUser: true });
  if (!verdict.ok) return verdict;
  const text = question.trim();
  if (!text) return { ok: false, reason: "TEXTO_VAZIO" };
  const at = now.toISOString();
  const q: SessionMessage = { id: ids.question, kind: "PERGUNTA", author: { kind: "PESSOA", userId: actor }, at, text: text.slice(0, 2000), toAi: true, reactions: {} };
  const answer: SessionMessage = {
    id: ids.answer, kind: "RESPOSTA", author: { kind: "IA" }, at, text: "", replyTo: q.id, requestedBy: actor, reactions: {},
    ai: composeAnswer(text, session, people, opts),
  };
  return { ok: true, question: q, answer, session: { ...session, updatedAt: at, messages: [...session.messages, q, answer] } };
}

/**
 * Sugestão espontânea (só nos modos que permitem iniciativa da IA): depois de uma pergunta entre pessoas, a IA oferece trechos
 * da Memória que possam ajudar — e fica em silêncio se não houver fonte (nada de "não encontrei" sem ninguém ter pedido).
 */
export function spontaneousAnswer(
  session: DeciaSession,
  sessionPolicy: AiPolicy,
  question: SessionMessage,
  people: PeopleDirectory,
  now: Date,
  id: string,
  opts: AnswerOptions = {},
): { session: DeciaSession; answer: SessionMessage } | null {
  if (question.kind !== "PERGUNTA" || question.toAi) return null;
  if (!evaluateAiAction(sessionPolicy, "SUGESTAO_ESPONTANEA", { requestedByUser: false }).ok) return null;
  const ai = composeAnswer(question.text, session, people, opts);
  if (!ai.citations.length) return null;
  const answer: SessionMessage = { id, kind: "RESPOSTA", author: { kind: "IA" }, at: now.toISOString(), text: "", replyTo: question.id, requestedBy: null, reactions: {}, ai: { ...ai, facts: [] } };
  return { answer, session: { ...session, messages: [...session.messages, answer] } };
}
