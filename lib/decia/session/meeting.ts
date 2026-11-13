/**
 * Reunião da Ata Viva na sessão (RF37). Fluxo: nova reunião → transcrição (colada, arquivo .txt/.vtt/.srt ou gravação com
 * transcrição ao vivo no navegador, com consentimento de cada participante) → ata compilada ✦ → revisão humana (editar,
 * aceitar/recusar cada encaminhamento) → "Ratificar ata": publica a ata no chat, cria os encaminhamentos (responsável e prazo)
 * e abre 48 h para os demais participantes ratificarem ou contestarem. Contestar volta a ata para correção (nova versão).
 * Pontos (RF42, via repositório): ATA_RATIFICADA a cada participante que ratifica; ENCAMINHAMENTO_CUMPRIDO ao responsável.
 */
import type { AuditInput } from "@/lib/decia/audit/types";
import type { AiPolicy } from "@/lib/ai/autonomy";
import type { TaskDraft } from "@/lib/tasks/templates";
import type { PointsIntent } from "./chat";
import { parseDateOnly } from "./dates";
import { acceptsMeetings } from "./machine";
import { compileMinutes } from "./minutes";
import type { PersonRef } from "./people";
import { can, memberRole } from "./roles";
import { parseTranscript } from "./transcript";
import type {
  AccessClass, CommandResult, DateOnly, DeciaSession, FollowUpDraft, FollowUpTask, Meeting, MeetingSource, MinutesDraft, PeopleDirectory,
  SessionMessage,
} from "./types";

export const RATIFICATION_HOURS = 48;
export const MIN_CONTEST_CHARS = 10;

/** Sessões RESTRITO/SIGILOSO só aceitam transcrição colada (DECIA_SESSAO_E_MESA §D.3-2, F.1-20). */
export function allowedSources(accessClass: AccessClass): MeetingSource[] {
  return accessClass === "RESTRITO" || accessClass === "SIGILOSO" ? ["TRANSCRICAO_COLADA"] : ["TRANSCRICAO_COLADA", "ARQUIVO", "GRAVACAO_NAVEGADOR"];
}

const findMeeting = (session: DeciaSession, id: string) => session.meetings.find((m) => m.id === id);
const replaceMeeting = (session: DeciaSession, meeting: Meeting): DeciaSession => ({ ...session, meetings: session.meetings.map((m) => (m.id === meeting.id ? meeting : m)) });
const canOrganize = (session: DeciaSession, actor: string, meeting: Meeting) => actor === meeting.organizerId || memberRole(session, actor) === "PROPRIETARIO";
export const peopleRefs = (session: DeciaSession, people: PeopleDirectory): PersonRef[] => session.participants.map((p) => ({ userId: p.userId, name: people[p.userId]?.name ?? p.userId }));

export interface NewMeetingInput { title: string; baseDate: DateOnly; source: MeetingSource; participantIds: string[] }

export function startMeeting(session: DeciaSession, actor: string, input: NewMeetingInput, now: Date, ids: { meeting: string; message: string }): CommandResult<{ session: DeciaSession; meeting: Meeting }> {
  if (!can(session, actor, "NOVA_REUNIAO")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (!acceptsMeetings(session.status)) return { ok: false, reason: "SESSAO_NAO_ATIVA" };
  if (!allowedSources(session.accessClass).includes(input.source)) return { ok: false, reason: "FONTE_NAO_PERMITIDA" };
  const title = input.title.trim();
  if (!title) return { ok: false, reason: "TITULO_VAZIO" };
  if (!parseDateOnly(input.baseDate)) return { ok: false, reason: "DATA_INVALIDA" };
  const members = new Set(session.participants.map((p) => p.userId));
  const participantIds = [...new Set([actor, ...input.participantIds])].filter((id) => members.has(id));
  const at = now.toISOString();
  const meeting: Meeting = {
    id: ids.meeting, title: title.slice(0, 160), organizerId: actor, createdAt: at, baseDate: input.baseDate, source: input.source,
    status: input.source === "GRAVACAO_NAVEGADOR" ? "GRAVANDO" : "TRANSCREVENDO", participantIds, consents: [], transcript: "", fileName: null,
    compiled: null, draft: null, version: 0, ratifications: [], contests: [],
  };
  const message: SessionMessage = { id: ids.message, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {}, notice: { kind: "REUNIAO_INICIADA", meetingId: meeting.id, title: meeting.title, by: actor } };
  return { ok: true, meeting, session: { ...session, updatedAt: at, meetings: [...session.meetings, meeting], messages: [...session.messages, message] } };
}

/** Consentimento de gravação por participante (RF37.CA05): só a própria pessoa — ou quem organiza, registrando o que ela disse. */
export function setConsent(session: DeciaSession, actor: string, meetingId: string, userId: string, consented: boolean): CommandResult<{ session: DeciaSession }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (actor !== userId && !canOrganize(session, actor, meeting)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (!meeting.participantIds.includes(userId)) return { ok: false, reason: "NAO_PARTICIPOU" };
  const consents = consented ? [...new Set([...meeting.consents, userId])] : meeting.consents.filter((u) => u !== userId);
  return { ok: true, session: replaceMeeting(session, { ...meeting, consents }) };
}

export const missingConsents = (meeting: Pick<Meeting, "participantIds" | "consents">) => meeting.participantIds.filter((u) => !meeting.consents.includes(u));
/** Gravar só com o consentimento de TODOS os participantes (409 CONSENTIMENTO_PENDENTE). */
export const canRecord = (meeting: Pick<Meeting, "participantIds" | "consents" | "source">) => meeting.source === "GRAVACAO_NAVEGADOR" && missingConsents(meeting).length === 0;

/** Compila a ata a partir da transcrição (o original da IA fica guardado para a auditoria comparar com o ratificado). */
export function compileMeeting(session: DeciaSession, actor: string, meetingId: string, transcript: string, fileName: string | null, people: PeopleDirectory): CommandResult<{ session: DeciaSession; draft: MinutesDraft }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (!canOrganize(session, actor, meeting) && !can(session, actor, "NOVA_REUNIAO")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.status === "CONFIRMADA") return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  if (meeting.source === "GRAVACAO_NAVEGADOR" && missingConsents(meeting).length) return { ok: false, reason: "CONSENTIMENTO_PENDENTE" };
  if (!transcript.trim()) return { ok: false, reason: "TRANSCRICAO_VAZIA" };
  const refs = peopleRefs(session, people);
  const parsed = parseTranscript(transcript, fileName, refs.map((r) => r.name));
  if (!parsed.segments.length) return { ok: false, reason: "TRANSCRICAO_VAZIA" };
  const compiled = compileMinutes(parsed, { members: refs, baseDate: meeting.baseDate });
  // quem foi marcado como presente entra como participante mesmo sem fala transcrita
  const named = new Set(compiled.participants.map((p) => p.userId).filter(Boolean));
  const extra = meeting.participantIds.filter((u) => !named.has(u)).map((u) => ({ name: people[u]?.name ?? u, userId: u }));
  const draft: MinutesDraft = { ...compiled, participants: [...compiled.participants, ...extra] };
  return {
    ok: true,
    draft,
    session: replaceMeeting(session, { ...meeting, transcript: transcript.slice(0, 200_000), fileName, compiled: draft, draft, status: "ATA_PROPOSTA" }),
  };
}

/** Edição da ata em revisão (texto das decisões, encaminhamentos aceitos/recusados, responsável, prazo). */
export function updateDraft(session: DeciaSession, actor: string, meetingId: string, draft: MinutesDraft): CommandResult<{ session: DeciaSession }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (!canOrganize(session, actor, meeting) && !can(session, actor, "NOVA_REUNIAO")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.status !== "ATA_PROPOSTA") return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  return { ok: true, session: replaceMeeting(session, { ...meeting, draft }) };
}

export type FollowUpProblem = "SEM_DECISAO" | "SEM_ACAO" | "SEM_RESPONSAVEL" | "SEM_PRAZO";
export interface MinutesIssue { followUpId: string; problem: FollowUpProblem }

/** Antes de ratificar: cada encaminhamento aceito ou recusado; aceito = ação, responsável (membro) e prazo (422 do RF37). */
export function validateMinutes(draft: MinutesDraft): MinutesIssue[] {
  const issues: MinutesIssue[] = [];
  for (const f of draft.followUps) {
    if (f.accepted === null) issues.push({ followUpId: f.id, problem: "SEM_DECISAO" });
    else if (f.accepted) {
      if (f.action.trim().length < 3) issues.push({ followUpId: f.id, problem: "SEM_ACAO" });
      if (f.responsible.status !== "CASADO") issues.push({ followUpId: f.id, problem: "SEM_RESPONSAVEL" });
      if (!f.due || !parseDateOnly(f.due.date)) issues.push({ followUpId: f.id, problem: "SEM_PRAZO" });
    }
  }
  return issues;
}

export interface MinutesTextLabels {
  title: (title: string, date: string) => string;
  participants: string;
  agenda: string;
  decisions: string;
  followUps: string;
  pending: string;
  toDefine: string;
  none: string;
  refused: string;
  formatDate: (d: DateOnly) => string;
}

const personName = (people: PeopleDirectory, f: FollowUpDraft, labels: MinutesTextLabels) =>
  f.responsible.status === "CASADO" ? people[f.responsible.userId]?.name ?? f.responsible.userId : `${labels.toDefine}${f.responsible.raw ? ` (${f.responsible.raw})` : ""}`;

/** Uma linha por encaminhamento: "ação — responsável — prazo" (base do diff da auditoria). */
export function followUpLine(f: FollowUpDraft, people: PeopleDirectory, labels: MinutesTextLabels): string {
  return `${f.action} — ${personName(people, f, labels)} — ${f.due ? labels.formatDate(f.due.date) : labels.toDefine}`;
}

/** Texto corrido da ata (vai para a auditoria e para a descrição da tarefa ATA_REGISTRO). */
export function minutesText(title: string, draft: MinutesDraft, people: PeopleDirectory, labels: MinutesTextLabels, onlyAccepted = false): string {
  const list = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : `- ${labels.none}`);
  const followUps = onlyAccepted ? draft.followUps.filter((f) => f.accepted) : draft.followUps;
  return [
    labels.title(title, labels.formatDate(draft.baseDate)),
    "",
    labels.participants, list(draft.participants.map((p) => p.name)), "",
    labels.agenda, list(draft.agenda.map((a) => a.text)), "",
    labels.decisions, list(draft.decisions.map((d) => d.text)), "",
    labels.followUps, list(followUps.map((f) => `${followUpLine(f, people, labels)}${f.accepted === false ? ` (${labels.refused})` : ""}`)), "",
    labels.pending, list(draft.pending.map((p) => p.text)),
  ].join("\n");
}

const sameFollowUp = (a: FollowUpDraft, b: FollowUpDraft) =>
  a.action.trim() === b.action.trim() && (a.responsible.status === "CASADO" ? a.responsible.userId : null) === (b.responsible.status === "CASADO" ? b.responsible.userId : null) && (a.due?.date ?? null) === (b.due?.date ?? null);

/**
 * Ratificar: publica a ata (mensagem ATA com o retrato do que foi ratificado), cria os encaminhamentos aceitos, abre o prazo de
 * 48 h e devolve as intenções de auditoria (ata e cada encaminhamento: aceito, editado e aceito, recusado) e de pontos.
 */
export function ratifyMeeting(
  session: DeciaSession,
  actor: string,
  meetingId: string,
  people: PeopleDirectory,
  labels: MinutesTextLabels,
  effective: Pick<AiPolicy, "mode" | "version">,
  now: Date,
  ids: { message: string; followUp: (i: number) => string },
): CommandResult<{ session: DeciaSession; audit: AuditInput[]; points: PointsIntent[]; created: FollowUpTask[] }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (!canOrganize(session, actor, meeting) && !can(session, actor, "NOVA_REUNIAO")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.status !== "ATA_PROPOSTA" || !meeting.draft || !meeting.compiled) return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  if (validateMinutes(meeting.draft).length) return { ok: false, reason: "ATA_INVALIDA" };
  const draft = meeting.draft;
  const at = now.toISOString();
  const version = meeting.version + 1;
  const existing = new Set(session.followUps.filter((f) => f.meetingId === meeting.id).map((f) => f.draftId));
  const created: FollowUpTask[] = draft.followUps
    .filter((f) => f.accepted && !existing.has(f.id) && f.responsible.status === "CASADO" && f.due)
    .map((f, i) => ({
      id: ids.followUp(i), meetingId: meeting.id, draftId: f.id, action: f.action.trim(), responsibleId: (f.responsible as { userId: string }).userId,
      dueDate: f.due!.date, status: "ABERTO", createdAt: at, sourceText: f.source?.text ?? null,
    }));
  const message: SessionMessage = {
    id: ids.message, kind: "ATA", author: { kind: "PESSOA", userId: actor }, at, text: "", meetingId: meeting.id, minutesVersion: version, reactions: {},
    minutes: draft, meetingTitle: meeting.title,
  };
  const deadline = new Date(now.getTime() + RATIFICATION_HOURS * 3_600_000).toISOString();
  const next: Meeting = {
    ...meeting, status: "CONFIRMADA", version, ratifiedAt: at, ratifiedBy: actor, ratificationDeadlineAt: deadline, minutesMessageId: message.id,
    ratifications: [...meeting.ratifications.filter((r) => r.userId !== actor), { userId: actor, at }], contests: version > 1 ? [] : meeting.contests,
  };
  const policy = { mode: effective.mode, version: effective.version };
  const base = { at, actorId: actor, source: "SESSAO" as const, sessionId: session.id, decisionId: session.decisionId, contextTitle: session.title, policy, reason: null, before: "" };
  const compiledText = minutesText(meeting.title, meeting.compiled, people, labels);
  const finalText = minutesText(meeting.title, draft, people, labels, true);
  const audit: AuditInput[] = [{
    ...base, action: compiledText === minutesText(meeting.title, draft, people, labels) ? "ACEITOU" : "EDITOU_E_ACEITOU",
    target: { kind: "ATA", id: meeting.id, label: meeting.title }, proposed: compiledText, after: finalText,
  }];
  for (const f of draft.followUps) {
    const original = meeting.compiled.followUps.find((c) => c.id === f.id);
    const proposed = original ? followUpLine(original, people, labels) : null;
    const target = { kind: "ENCAMINHAMENTO" as const, id: `${meeting.id}:${f.id}`, label: f.action };
    if (f.accepted === false) audit.push({ ...base, action: "REJEITOU", target, proposed, after: "" });
    else audit.push({ ...base, action: original && sameFollowUp(original, f) ? "ACEITOU" : "EDITOU_E_ACEITOU", target, proposed, after: followUpLine(f, people, labels) });
  }
  const points: PointsIntent[] = [{ userId: actor, event: "ATA_RATIFICADA", ref: { type: "ATA", id: meeting.id }, sessionId: session.id, note: null, attachTo: { meetingId: meeting.id } }];
  return {
    ok: true, audit, points, created,
    session: { ...replaceMeeting(session, next), updatedAt: at, messages: [...session.messages, message], followUps: [...session.followUps, ...created] },
  };
}

/** Os demais participantes ratificam em até 48 h (cada ratificação credita ATA_RATIFICADA uma única vez). */
export function participantRatify(session: DeciaSession, actor: string, meetingId: string, now: Date): CommandResult<{ session: DeciaSession; points: PointsIntent }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (meeting.status !== "CONFIRMADA") return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  if (!meeting.participantIds.includes(actor)) return { ok: false, reason: "NAO_PARTICIPOU" };
  if (!can(session, actor, "RATIFICAR_ATA")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.ratifications.some((r) => r.userId === actor)) return { ok: false, reason: "JA_RATIFICOU" };
  if (meeting.ratificationDeadlineAt && now.getTime() > Date.parse(meeting.ratificationDeadlineAt)) return { ok: false, reason: "PRAZO_ENCERRADO" };
  const next = { ...meeting, ratifications: [...meeting.ratifications, { userId: actor, at: now.toISOString() }] };
  return {
    ok: true,
    session: replaceMeeting(session, next),
    points: { userId: actor, event: "ATA_RATIFICADA", ref: { type: "ATA", id: meeting.id }, sessionId: session.id, note: null, attachTo: { meetingId: meeting.id } },
  };
}

/** Contestar (com motivo) em até 48 h: a ata volta para correção de quem organizou, que é avisado. */
export function contestMeeting(session: DeciaSession, actor: string, meetingId: string, reason: string, now: Date, messageId: string): CommandResult<{ session: DeciaSession }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (meeting.status !== "CONFIRMADA") return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  if (!meeting.participantIds.includes(actor)) return { ok: false, reason: "NAO_PARTICIPOU" };
  if (!can(session, actor, "CONTESTAR_ATA")) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.ratificationDeadlineAt && now.getTime() > Date.parse(meeting.ratificationDeadlineAt)) return { ok: false, reason: "PRAZO_ENCERRADO" };
  const why = reason.trim();
  if (why.length < MIN_CONTEST_CHARS) return { ok: false, reason: "MOTIVO_OBRIGATORIO" };
  const at = now.toISOString();
  const message: SessionMessage = { id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {}, notice: { kind: "ATA_CONTESTADA", meetingId, title: meeting.title, by: actor, reason: why } };
  const unread = { ...session.unread, [meeting.organizerId]: [...(session.unread[meeting.organizerId] ?? []), messageId] };
  const next: Meeting = { ...meeting, status: "CONTESTADA", contests: [...meeting.contests, { userId: actor, at, reason: why }] };
  return { ok: true, session: { ...replaceMeeting(session, next), updatedAt: at, messages: [...session.messages, message], unread } };
}

/** Quem organizou corrige a ata contestada: volta à revisão (a próxima ratificação publica a versão seguinte). */
export function reopenMinutes(session: DeciaSession, actor: string, meetingId: string): CommandResult<{ session: DeciaSession }> {
  const meeting = findMeeting(session, meetingId);
  if (!meeting) return { ok: false, reason: "REUNIAO_INEXISTENTE" };
  if (!canOrganize(session, actor, meeting)) return { ok: false, reason: "SEM_PERMISSAO" };
  if (meeting.status !== "CONTESTADA") return { ok: false, reason: "ESTADO_DA_REUNIAO" };
  return { ok: true, session: replaceMeeting(session, { ...meeting, status: "ATA_PROPOSTA" }) };
}

/** Encaminhamento cumprido: pelo responsável ou pela pessoa proprietária; o responsável recebe ENCAMINHAMENTO_CUMPRIDO. */
export function completeFollowUp(session: DeciaSession, actor: string, followUpId: string, now: Date, messageId: string): CommandResult<{ session: DeciaSession; points: PointsIntent }> {
  const f = session.followUps.find((x) => x.id === followUpId);
  if (!f) return { ok: false, reason: "ENCAMINHAMENTO_INEXISTENTE" };
  if (actor !== f.responsibleId && memberRole(session, actor) !== "PROPRIETARIO") return { ok: false, reason: "SEM_PERMISSAO" };
  if (f.status === "CUMPRIDO") return { ok: false, reason: "JA_CUMPRIDO" };
  const at = now.toISOString();
  const message: SessionMessage = {
    id: messageId, kind: "SISTEMA", author: { kind: "SISTEMA" }, at, text: "", reactions: {},
    notice: { kind: "ENCAMINHAMENTO_CUMPRIDO", followUpId, action: f.action, by: actor, responsibleId: f.responsibleId },
  };
  return {
    ok: true,
    session: { ...session, updatedAt: at, messages: [...session.messages, message], followUps: session.followUps.map((x) => (x.id === followUpId ? { ...x, status: "CUMPRIDO", completedAt: at, completedBy: actor } : x)) },
    points: { userId: f.responsibleId, event: "ENCAMINHAMENTO_CUMPRIDO", ref: { type: "ENCAMINHAMENTO", id: f.id }, sessionId: session.id, note: null, attachTo: { followUpId: f.id } },
  };
}

/* ── Rascunhos para o criador de tarefas (lib/tasks/drafts) ─────────────────────────────────────────────── */

export interface DraftLabels { followUpDescription: (meeting: string, session: string, source: string) => string; minutesTitle: (meeting: string) => string; criterion: string }

/** Rascunho da tarefa de um encaminhamento: título = ação, prazo = o ratificado, origem citada na descrição. */
export function followUpTaskDraft(session: DeciaSession, f: FollowUpTask, meetingTitle: string, labels: DraftLabels): Partial<TaskDraft> {
  return {
    title: f.action.slice(0, 160),
    objective: f.action,
    descriptionMd: labels.followUpDescription(meetingTitle, session.title, f.sourceText ?? "—"),
    dueAt: f.dueDate,
    priority: "MEDIA",
    accessClass: session.accessClass,
    criteria: [labels.criterion],
  };
}

/** Rascunho da tarefa ATA_REGISTRO com o texto ratificado (RF37.CA03). */
export function minutesTaskDraft(session: DeciaSession, meeting: Meeting, people: PeopleDirectory, labels: MinutesTextLabels & DraftLabels): Partial<TaskDraft> {
  return {
    title: labels.minutesTitle(meeting.title).slice(0, 160),
    type: "ATA_REGISTRO",
    descriptionMd: meeting.draft ? minutesText(meeting.title, meeting.draft, people, labels, true) : "",
    dueAt: meeting.baseDate,
    priority: "MEDIA",
    accessClass: session.accessClass,
  };
}
