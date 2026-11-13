/**
 * Chat classificado da sessão (§B.3 L1, RF29.CA03): mensagem, evidência com anexo/referência, pergunta, resposta, reações de
 * qualidade e aceite da resposta. Funções puras: devolvem a sessão nova e, quando o RF42 premia a contribuição, a INTENÇÃO de
 * pontuar (o repositório chama `deciaPoints.award`, que é idempotente e aplica os tetos). Nunca se pontua volume (§E.3): só
 * argumento com evidência confirmada, pergunta respondida (aceita por quem perguntou), ata ratificada e encaminhamento cumprido.
 */
import type { EarnEvent, PointsRef } from "@/lib/points/ledger";
import { isChatOpen } from "./machine";
import { can, memberRole, type SessionAction } from "./roles";
import type {
  CommandResult, DeciaSession, EvidenceReference, HumanMessageKind, PointsNote, QualityReaction, SessionMessage,
} from "./types";

export const MAX_MESSAGE_CHARS = 4000;
/** Texto mínimo para um argumento com evidência contar (abaixo disso é ruído para o RF42). */
export const MIN_EVIDENCE_CHARS = 20;
/** Repetidas com similaridade acima de 90 % não pontuam (RF42 "repetidas > 90 %"). */
export const REPEAT_SIMILARITY = 0.9;

export interface PointsIntent { userId: string; event: EarnEvent; ref: PointsRef; sessionId: string; note: string | null; attachTo: { messageId?: string; meetingId?: string; followUpId?: string } }

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const words = (s: string) => new Set(fold(s).match(/[\p{L}\p{N}]{2,}/gu) ?? []);

/** Similaridade de Jaccard entre os conjuntos de palavras (0–1), sem acento e sem caixa. */
export function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Endereço aceito numa referência: http(s) ou caminho interno do app ("/tasks/…"); nada de `javascript:` ou `data:`. */
export function safeHref(href: string | null | undefined): string | null | false {
  const h = href?.trim();
  if (!h) return null;
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h;
  if (/^\/(?!\/)[^\s\\]*$/.test(h)) return h;
  return false;
}

export type EvidenceCheck = { ok: true } | { ok: false; reason: "SEM_REFERENCIA" | "TEXTO_CURTO" | "REPETIDA" };

/** "IA confirma" o argumento com evidência (simulada, determinística): tem referência, não é ruído e não repete o que já foi dito. */
export function confirmEvidence(text: string, reference: EvidenceReference | null | undefined, previous: readonly string[]): EvidenceCheck {
  if (!reference?.label.trim()) return { ok: false, reason: "SEM_REFERENCIA" };
  if (text.trim().length < MIN_EVIDENCE_CHARS) return { ok: false, reason: "TEXTO_CURTO" };
  if (previous.some((p) => similarity(p, text) > REPEAT_SIMILARITY)) return { ok: false, reason: "REPETIDA" };
  return { ok: true };
}

const ACTION_OF: Record<HumanMessageKind, SessionAction> = { MENSAGEM: "ENVIAR_MENSAGEM", EVIDENCIA: "ENVIAR_EVIDENCIA", PERGUNTA: "PERGUNTAR", RESPOSTA: "RESPONDER" };

export interface PostInput { kind: HumanMessageKind; text: string; reference?: EvidenceReference | null; replyTo?: string | null; toAi?: boolean }

export function postMessage(
  session: DeciaSession,
  actor: string,
  input: PostInput,
  now: Date,
  messageId: string,
): CommandResult<{ session: DeciaSession; message: SessionMessage; points: PointsIntent | null; evidence: EvidenceCheck | null }> {
  if (!memberRole(session, actor)) return { ok: false, reason: "NAO_PARTICIPA" };
  if (!isChatOpen(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  if (!can(session, actor, ACTION_OF[input.kind])) return { ok: false, reason: "SEM_PERMISSAO" };
  const text = input.text.trim();
  if (!text) return { ok: false, reason: "TEXTO_VAZIO" };
  if (text.length > MAX_MESSAGE_CHARS) return { ok: false, reason: "TEXTO_LONGO" };
  let reference: EvidenceReference | null = null;
  if (input.reference && (input.reference.label.trim() || input.reference.href?.trim())) {
    const href = safeHref(input.reference.href);
    if (href === false || !input.reference.label.trim()) return { ok: false, reason: "REFERENCIA_INVALIDA" };
    reference = { kind: input.reference.kind, label: input.reference.label.trim().slice(0, 200), href };
  }
  if (input.kind === "EVIDENCIA" && !reference) return { ok: false, reason: "REFERENCIA_OBRIGATORIA" };
  if (input.kind === "RESPOSTA") {
    const q = session.messages.find((m) => m.id === input.replyTo);
    if (!q || q.kind !== "PERGUNTA") return { ok: false, reason: "RESPOSTA_SEM_PERGUNTA" };
  }
  const message: SessionMessage = {
    id: messageId, kind: input.kind, author: { kind: "PESSOA", userId: actor }, at: now.toISOString(), text, reference,
    replyTo: input.kind === "RESPOSTA" ? input.replyTo ?? null : null, toAi: input.kind === "PERGUNTA" ? !!input.toAi : undefined, reactions: {},
  };
  let points: PointsIntent | null = null;
  let evidence: EvidenceCheck | null = null;
  if (input.kind === "EVIDENCIA") {
    const previous = session.messages.filter((m) => m.author.kind === "PESSOA" && m.text).map((m) => m.text);
    evidence = confirmEvidence(text, reference, previous);
    if (evidence.ok) {
      points = { userId: actor, event: "ARGUMENTO_EVIDENCIA", ref: { type: "MENSAGEM", id: messageId }, sessionId: session.id, note: null, attachTo: { messageId } };
    }
  }
  return { ok: true, message, points, evidence, session: { ...session, updatedAt: message.at, messages: [...session.messages, message] } };
}

/** Liga/desliga a reação de qualidade da pessoa (uma por tipo); ninguém reage à própria mensagem nem a avisos do sistema. */
export function toggleReaction(session: DeciaSession, actor: string, messageId: string, reaction: QualityReaction): CommandResult<{ session: DeciaSession; on: boolean }> {
  if (!can(session, actor, "REAGIR")) return { ok: false, reason: "SEM_PERMISSAO" };
  const msg = session.messages.find((m) => m.id === messageId);
  if (!msg || msg.kind === "SISTEMA") return { ok: false, reason: "MENSAGEM_INEXISTENTE" };
  if (msg.author.kind === "PESSOA" && msg.author.userId === actor) return { ok: false, reason: "AUTO_REACAO" };
  const current = msg.reactions[reaction] ?? [];
  const on = !current.includes(actor);
  const next = on ? [...current, actor] : current.filter((u) => u !== actor);
  const reactions = { ...msg.reactions, [reaction]: next };
  return { ok: true, on, session: { ...session, messages: session.messages.map((m) => (m.id === messageId ? { ...m, reactions } : m)) } };
}

/**
 * Quem perguntou (ou a pessoa proprietária) aceita uma resposta: a pergunta fica respondida e a autora da resposta recebe
 * PERGUNTA_RESPONDIDA (+4, RF42) — só se for outra pessoa (responder à própria pergunta ou resposta da IA não pontua).
 */
export function acceptAnswer(session: DeciaSession, actor: string, questionId: string, answerId: string): CommandResult<{ session: DeciaSession; points: PointsIntent | null }> {
  const q = session.messages.find((m) => m.id === questionId);
  const a = session.messages.find((m) => m.id === answerId);
  if (!q || q.kind !== "PERGUNTA" || !a) return { ok: false, reason: "MENSAGEM_INEXISTENTE" };
  const asker = q.author.kind === "PESSOA" ? q.author.userId : null;
  if (actor !== asker && memberRole(session, actor) !== "PROPRIETARIO") return { ok: false, reason: "SEM_PERMISSAO" };
  if (a.kind !== "RESPOSTA" || a.replyTo !== questionId) return { ok: false, reason: "NAO_E_RESPOSTA_DA_PERGUNTA" };
  if (q.acceptedAnswerId) return { ok: false, reason: "JA_RESPONDIDA" };
  const answerer = a.author.kind === "PESSOA" ? a.author.userId : null;
  const points: PointsIntent | null = answerer && answerer !== asker
    ? { userId: answerer, event: "PERGUNTA_RESPONDIDA", ref: { type: "PERGUNTA", id: questionId }, sessionId: session.id, note: null, attachTo: { messageId: answerId } }
    : null;
  return { ok: true, points, session: { ...session, messages: session.messages.map((m) => (m.id === questionId ? { ...m, acceptedAnswerId: answerId } : m)) } };
}

export const openQuestions = (session: Pick<DeciaSession, "messages">) =>
  session.messages.filter((m) => m.kind === "PERGUNTA" && !m.acceptedAnswerId && !m.toAi);
export const evidenceMessages = (session: Pick<DeciaSession, "messages">) => session.messages.filter((m) => m.kind === "EVIDENCIA");
export const answersTo = (session: Pick<DeciaSession, "messages">, questionId: string) => session.messages.filter((m) => m.kind === "RESPOSTA" && m.replyTo === questionId);

export const unreadFor = (session: Pick<DeciaSession, "unread">, userId: string): readonly string[] => session.unread[userId] ?? [];

export function markNoticesRead(session: DeciaSession, userId: string): DeciaSession {
  if (!session.unread[userId]?.length) return session;
  const unread = { ...session.unread };
  delete unread[userId];
  return { ...session, unread };
}

/** Anexa a nota de pontos (ganho discreto ou motivo de não ter contado) à mensagem/reunião/encaminhamento de origem. */
export function attachPoints(session: DeciaSession, intent: Pick<PointsIntent, "attachTo">, note: PointsNote): DeciaSession {
  const { messageId, meetingId, followUpId } = intent.attachTo;
  if (messageId) {
    return { ...session, messages: session.messages.map((m) => (m.id === messageId ? { ...m, points: [...(m.points ?? []).filter((p) => p.event !== note.event || p.userId !== note.userId), note] } : m)) };
  }
  if (meetingId) {
    return {
      ...session,
      meetings: session.meetings.map((mt) => (mt.id === meetingId ? { ...mt, ratifications: mt.ratifications.map((r) => (r.userId === note.userId ? { ...r, points: note } : r)) } : mt)),
    };
  }
  if (followUpId) return { ...session, followUps: session.followUps.map((f) => (f.id === followUpId ? { ...f, points: note } : f)) };
  return session;
}
