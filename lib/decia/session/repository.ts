/**
 * Sessões do DECIA — repositório em memória (DEMO). A API da sessão ainda não existe e não é presumida: `SessionRepository` é o
 * contrato que um cliente HTTP real implementará depois (`/api/decia/sessions…`, `/api/meetings…`, `/api/org/ai-policy`). Cada
 * comando roda a função pura correspondente; quando ela devolve intenção de pontos, o repositório chama `deciaPoints.award`
 * (idempotente, com tetos do RF42) e anexa a nota discreta; quando devolve intenção de auditoria, grava no livro
 * somente-acréscimo. Os dados vivem só nesta aba do navegador — recarregar volta aos exemplos.
 */
"use client";
import { useSyncExternalStore } from "react";
import type { AgentCharter, AutonomyMode } from "@/lib/ai/autonomy";
import { createAuditLog, type AuditLog } from "@/lib/decia/audit/log";
import type { AuditInput } from "@/lib/decia/audit/types";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { deciaPoints, type PointsLedger } from "@/lib/points/ledger";
import type { MemorySearch } from "@/lib/memory/search";
import type { ViewerProfile } from "@/lib/viewer/profiles";
import { askAi as askAiFn, spontaneousAnswer } from "./assistant";
import { acceptAnswer as acceptAnswerFn, attachPoints, markNoticesRead, postMessage, toggleReaction, type PointsIntent, type PostInput } from "./chat";
import { buildDemoAudit, buildDemoOrgPolicy, buildDemoSessions, NEW_SESSION_PREFIX, orgActor } from "./fixtures";
import { transitionSession } from "./machine";
import {
  compileMeeting as compileMeetingFn, completeFollowUp as completeFollowUpFn, contestMeeting as contestMeetingFn, participantRatify, ratifyMeeting as ratifyMeetingFn,
  reopenMinutes as reopenMinutesFn, setConsent as setConsentFn, startMeeting as startMeetingFn, updateDraft as updateDraftFn, type MinutesTextLabels, type NewMeetingInput,
} from "./meeting";
import { composeMinutaProposal, editMinuta as editMinutaFn, requestProposal as requestProposalFn, resolveProposal as resolveProposalFn, revertProposal as revertProposalFn, type MinutaLabels, type ProposalDecision } from "./minuta";
import { applyOrgCeiling, changeOrgPolicy, changeSessionMode, effectivePolicy, initialSessionPolicy, viewerMode } from "./policy";
import type { CommandResult, DeciaSession, MinutesDraft, OrgAiPolicy, PeopleDirectory, PointsNote, QualityReaction, SessionStatus } from "./types";

export interface NewSessionInput { title: string; objective: string; decisionId?: string | null; participants: { userId: string; role: "EDITOR" | "COMENTADOR" | "LEITOR" }[] }

export interface SessionRepository {
  readonly source: "DEMO" | "API";
  readonly people: PeopleDirectory;
  readonly audit: AuditLog;
  list(): readonly DeciaSession[];
  get(id: string): DeciaSession | undefined;
  org(): OrgAiPolicy;
  subscribe(listener: () => void): () => void;

  create(input: NewSessionInput, actor: string, now?: Date): CommandResult<{ session: DeciaSession }>;
  post(sessionId: string, actor: string, input: PostInput, now?: Date): CommandResult<{ session: DeciaSession }>;
  react(sessionId: string, actor: string, messageId: string, reaction: QualityReaction): CommandResult<{ session: DeciaSession }>;
  acceptAnswer(sessionId: string, actor: string, questionId: string, answerId: string, now?: Date): CommandResult<{ session: DeciaSession; note: PointsNote | null }>;
  askAi(sessionId: string, actor: string, personal: AutonomyMode, question: string, now?: Date): CommandResult<{ session: DeciaSession }>;
  markRead(sessionId: string, userId: string): void;
  transition(sessionId: string, actor: string, to: SessionStatus, reason: string | null, now?: Date): CommandResult<{ session: DeciaSession }>;
  changeMode(sessionId: string, actor: string, to: AutonomyMode, charter: AgentCharter | null, now?: Date): CommandResult<{ session: DeciaSession; invalidated: number }>;
  requestProposal(sessionId: string, actor: string, personal: AutonomyMode, labels: MinutaLabels, now?: Date): CommandResult<{ session: DeciaSession }>;
  resolveProposal(sessionId: string, actor: string, proposalId: string, decision: ProposalDecision, now?: Date): CommandResult<{ session: DeciaSession }>;
  revertProposal(sessionId: string, actor: string, proposalId: string, reason: string, now?: Date): CommandResult<{ session: DeciaSession }>;
  editMinuta(sessionId: string, actor: string, text: string, now?: Date): CommandResult<{ session: DeciaSession }>;
  startMeeting(sessionId: string, actor: string, input: NewMeetingInput, now?: Date): CommandResult<{ session: DeciaSession; meetingId: string }>;
  setConsent(sessionId: string, actor: string, meetingId: string, userId: string, consented: boolean): CommandResult<{ session: DeciaSession }>;
  compileMeeting(sessionId: string, actor: string, meetingId: string, transcript: string, fileName: string | null): CommandResult<{ session: DeciaSession; draft: MinutesDraft }>;
  updateDraft(sessionId: string, actor: string, meetingId: string, draft: MinutesDraft): CommandResult<{ session: DeciaSession }>;
  ratifyMeeting(sessionId: string, actor: string, meetingId: string, labels: MinutesTextLabels, now?: Date): CommandResult<{ session: DeciaSession; note: PointsNote | null }>;
  ratifyAsParticipant(sessionId: string, actor: string, meetingId: string, now?: Date): CommandResult<{ session: DeciaSession; note: PointsNote | null }>;
  contestMeeting(sessionId: string, actor: string, meetingId: string, reason: string, now?: Date): CommandResult<{ session: DeciaSession }>;
  reopenMinutes(sessionId: string, actor: string, meetingId: string): CommandResult<{ session: DeciaSession }>;
  completeFollowUp(sessionId: string, actor: string, followUpId: string, now?: Date): CommandResult<{ session: DeciaSession; note: PointsNote | null }>;
  setOrgPolicy(profile: ViewerProfile, next: { ceiling: AutonomyMode; defaultMode: AutonomyMode }, now?: Date): CommandResult<{ org: OrgAiPolicy; notified: number; invalidated: number }>;
}

export interface MemoryRepositoryOptions {
  ledger?: PointsLedger;
  audit?: AuditLog;
  people?: PeopleDirectory;
  /** busca na Memória Institucional (padrão: `searchMemory`) — os testes injetam uma */
  search?: MemorySearch;
}

const noteFrom = (intent: PointsIntent, r: ReturnType<PointsLedger["award"]>): PointsNote =>
  r.ok
    ? { event: intent.event, userId: intent.userId, delta: r.entry.delta, status: "CREDITADO" }
    : { event: intent.event, userId: intent.userId, delta: null, status: r.reason === "DUPLICADO" ? "DUPLICADO" : r.reason === "TETO_ATINGIDO" ? "TETO_ATINGIDO" : r.reason === "REGRA_INATIVA" ? "REGRA_INATIVA" : "NAO_CONFIRMADO" };

export function createMemorySessionRepository(seed: readonly DeciaSession[], org: OrgAiPolicy, opts: MemoryRepositoryOptions = {}): SessionRepository {
  let items: readonly DeciaSession[] = [...seed];
  let orgPolicy = org;
  const ledger = opts.ledger ?? deciaPoints;
  const audit = opts.audit ?? createAuditLog();
  const people = opts.people ?? DEMO_PEOPLE;
  const listeners = new Set<() => void>();
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
  const emit = () => listeners.forEach((l) => l());
  const get = (id: string) => items.find((s) => s.id === id);
  const save = (s: DeciaSession) => {
    const i = items.findIndex((x) => x.id === s.id);
    items = i < 0 ? [s, ...items] : items.map((x, j) => (j === i ? s : x));
    emit();
  };
  const award = (session: DeciaSession, intent: PointsIntent, now: Date): { session: DeciaSession; note: PointsNote } => {
    const r = ledger.award({ userId: intent.userId, event: intent.event, ref: intent.ref, sessionId: intent.sessionId, note: intent.note }, now);
    const note = noteFrom(intent, r);
    return { session: attachPoints(session, intent, note), note };
  };
  const record = (inputs: readonly AuditInput[]) => inputs.forEach((a) => audit.append(a));
  const missing = { ok: false as const, reason: "NAO_PARTICIPA" as const };
  /** roda um comando puro sobre a sessão e grava o resultado */
  function run<T extends { session: DeciaSession }>(id: string, fn: (s: DeciaSession) => CommandResult<T>): CommandResult<T> {
    const s = get(id);
    if (!s) return missing;
    const r = fn(s);
    if (r.ok) save(r.session);
    return r;
  }

  return {
    source: "DEMO",
    people,
    audit,
    list: () => items,
    get,
    org: () => orgPolicy,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    create(input, actor, now = new Date()) {
      const title = input.title.trim();
      if (!title) return { ok: false, reason: "TITULO_VAZIO" };
      const at = now.toISOString();
      const id = `${NEW_SESSION_PREFIX}${now.getTime().toString(36)}-${(seq++).toString(36)}`;
      const others = input.participants.filter((p) => p.userId !== actor && people[p.userId]);
      const session: DeciaSession = {
        id, title: title.slice(0, 160), objective: input.objective.trim().slice(0, 200), status: "RASCUNHO", phase: "CONTEXTO", decisionId: input.decisionId ?? null,
        projectId: null, accessClass: "INTERNO", createdAt: at, updatedAt: at, scheduledAt: null,
        participants: [{ userId: actor, role: "PROPRIETARIO", joinedAt: at }, ...others.map((p) => ({ userId: p.userId, role: p.role, joinedAt: at }))],
        policy: initialSessionPolicy(orgPolicy, actor, now),
        messages: [], proposals: [], minuta: { revision: 1, text: "", history: [{ revision: 1, text: "", by: actor, at, origin: "HUMANO" }] },
        meetings: [], followUps: [], unread: {}, statusLog: [],
      };
      save(session);
      return { ok: true, session };
    },

    post(sessionId, actor, input, now = new Date()) {
      const s = get(sessionId);
      if (!s) return missing;
      const r = postMessage(s, actor, input, now, nextId("msg"));
      if (!r.ok) return r;
      let session = r.session;
      if (r.points) session = award(session, r.points, now).session;
      else if (r.evidence && !r.evidence.ok) session = attachPoints(session, { attachTo: { messageId: r.message.id } }, { event: "ARGUMENTO_EVIDENCIA", userId: actor, delta: null, status: "NAO_CONFIRMADO", reason: r.evidence.reason });
      // pergunta entre pessoas: nos modos com iniciativa, a IA oferece trechos da Memória (silêncio se não houver fonte)
      const sp = spontaneousAnswer(session, effectivePolicy(session, orgPolicy), r.message, people, now, nextId("msg"), { search: opts.search });
      if (sp) session = sp.session;
      save(session);
      return { ok: true, session };
    },

    react: (sessionId, actor, messageId, reaction) => run(sessionId, (s) => toggleReaction(s, actor, messageId, reaction)),

    acceptAnswer(sessionId, actor, questionId, answerId, now = new Date()) {
      const s = get(sessionId);
      if (!s) return missing;
      const r = acceptAnswerFn(s, actor, questionId, answerId);
      if (!r.ok) return r;
      const done = r.points ? award(r.session, r.points, now) : { session: r.session, note: null };
      save(done.session);
      return { ok: true, session: done.session, note: done.note };
    },

    askAi(sessionId, actor, personal, question, now = new Date()) {
      return run(sessionId, (s) => askAiFn(s, actor, viewerMode(s, orgPolicy, personal).policy, question, people, now, { question: nextId("msg"), answer: nextId("msg") }, { search: opts.search }));
    },

    markRead(sessionId, userId) {
      const s = get(sessionId);
      if (s && s.unread[userId]?.length) save(markNoticesRead(s, userId));
    },

    transition: (sessionId, actor, to, reason, now = new Date()) => run(sessionId, (s) => transitionSession(s, actor, to, reason, now, nextId("msg"))),

    changeMode: (sessionId, actor, to, charter, now = new Date()) => run(sessionId, (s) => changeSessionMode(s, orgPolicy, actor, to, now, charter, nextId("msg"))),

    requestProposal(sessionId, actor, personal, labels, now = new Date()) {
      return run(sessionId, (s) => requestProposalFn(s, orgPolicy, actor, viewerMode(s, orgPolicy, personal).policy, composeMinutaProposal(s, labels, people), now, { proposal: nextId("prop"), message: nextId("msg") }));
    },

    resolveProposal(sessionId, actor, proposalId, decision, now = new Date()) {
      const r = run(sessionId, (s) => resolveProposalFn(s, orgPolicy, actor, proposalId, decision, now));
      if (r.ok) record([r.audit]);
      return r;
    },

    revertProposal(sessionId, actor, proposalId, reason, now = new Date()) {
      const r = run(sessionId, (s) => revertProposalFn(s, orgPolicy, actor, proposalId, reason, now));
      if (r.ok) record([r.audit]);
      return r;
    },

    editMinuta: (sessionId, actor, text, now = new Date()) => run(sessionId, (s) => editMinutaFn(s, actor, text, now)),

    startMeeting(sessionId, actor, input, now = new Date()) {
      const r = run(sessionId, (s) => startMeetingFn(s, actor, input, now, { meeting: nextId("reu"), message: nextId("msg") }));
      return r.ok ? { ok: true, session: r.session, meetingId: r.meeting.id } : r;
    },

    setConsent: (sessionId, actor, meetingId, userId, consented) => run(sessionId, (s) => setConsentFn(s, actor, meetingId, userId, consented)),

    compileMeeting: (sessionId, actor, meetingId, transcript, fileName) => run(sessionId, (s) => compileMeetingFn(s, actor, meetingId, transcript, fileName, people)),

    updateDraft: (sessionId, actor, meetingId, draft) => run(sessionId, (s) => updateDraftFn(s, actor, meetingId, draft)),

    ratifyMeeting(sessionId, actor, meetingId, labels, now = new Date()) {
      const s = get(sessionId);
      if (!s) return missing;
      const r = ratifyMeetingFn(s, actor, meetingId, people, labels, effectivePolicy(s, orgPolicy), now, { message: nextId("msg"), followUp: () => nextId("enc") });
      if (!r.ok) return r;
      let session = r.session;
      let note: PointsNote | null = null;
      for (const intent of r.points) {
        const done = award(session, intent, now);
        session = done.session;
        if (intent.userId === actor) note = done.note;
      }
      save(session);
      record(r.audit);
      return { ok: true, session, note };
    },

    ratifyAsParticipant(sessionId, actor, meetingId, now = new Date()) {
      const s = get(sessionId);
      if (!s) return missing;
      const r = participantRatify(s, actor, meetingId, now);
      if (!r.ok) return r;
      const done = award(r.session, r.points, now);
      save(done.session);
      return { ok: true, session: done.session, note: done.note };
    },

    contestMeeting: (sessionId, actor, meetingId, reason, now = new Date()) => run(sessionId, (s) => contestMeetingFn(s, actor, meetingId, reason, now, nextId("msg"))),

    reopenMinutes: (sessionId, actor, meetingId) => run(sessionId, (s) => reopenMinutesFn(s, actor, meetingId)),

    completeFollowUp(sessionId, actor, followUpId, now = new Date()) {
      const s = get(sessionId);
      if (!s) return missing;
      const r = completeFollowUpFn(s, actor, followUpId, now, nextId("msg"));
      if (!r.ok) return r;
      const done = award(r.session, r.points, now);
      save(done.session);
      return { ok: true, session: done.session, note: done.note };
    },

    setOrgPolicy(profile, next, now = new Date()) {
      const before = orgPolicy;
      const r = changeOrgPolicy(orgPolicy, profile, orgActor(profile === "EMPRESA" ? "EMPRESA" : "ADMIN"), next, now);
      if (!r.ok) return r;
      orgPolicy = r.org;
      let notified = 0;
      let invalidated = 0;
      if (r.ceilingChanged) {
        items = items.map((s) => {
          if (s.status === "ARQUIVADA" || s.status === "CANCELADA") return s;
          const applied = applyOrgCeiling(s, before, orgPolicy, r.org.changedBy, now, nextId("msg"));
          notified += s.participants.length;
          invalidated += applied.invalidated;
          return applied.session;
        });
      }
      emit();
      return { ok: true, org: orgPolicy, notified, invalidated };
    },
  };
}

let demo: SessionRepository | null = null;
/** Repositório DEMO da aba (criado na primeira leitura, com as datas relativas ao agora). */
export function demoSessionRepository(): SessionRepository {
  if (!demo) {
    const now = new Date();
    demo = createMemorySessionRepository(buildDemoSessions(now), buildDemoOrgPolicy(now), { audit: createAuditLog(buildDemoAudit(now)) });
  }
  return demo;
}
/** Só para testes: troca o repositório usado pelos hooks. */
export function setDemoSessionRepository(repo: SessionRepository | null) {
  demo = repo;
}

export function useSessions(repo: SessionRepository = demoSessionRepository()): readonly DeciaSession[] {
  return useSyncExternalStore(repo.subscribe, repo.list, repo.list);
}
export function useSession(id: string, repo: SessionRepository = demoSessionRepository()): DeciaSession | undefined {
  return useSessions(repo).find((s) => s.id === id);
}
export function useOrgPolicy(repo: SessionRepository = demoSessionRepository()): OrgAiPolicy {
  return useSyncExternalStore(repo.subscribe, repo.org, repo.org);
}
