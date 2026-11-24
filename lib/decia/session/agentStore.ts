"use client";
/**
 * Estado das execuções do agente por sessão (DEMO, em memória; RF51.CA04). As regras são as funções puras de agent.ts; aqui ficam
 * o histórico de execuções, o relógio e o "motor" que avança um passo por vez (a cada `tickMs`, enquanto não pausado). Cada passo
 * aplicado, desfazer ou encerramento é gravado na sessão e na trilha de auditoria por `SessionRepository.commitAgent`.
 * O armazenamento escuta o repositório: se a política efetiva da sessão muda (modo, teto da organização ou novo mandato), a
 * execução é encerrada na hora (INTERROMPIDO) e todos os membros são avisados — sem esperar o próximo passo.
 * A API real (planejada) terá o mesmo contrato `AgentStore`; os dados vivem só nesta aba do navegador.
 */
import { useSyncExternalStore } from "react";
import type { MemorySearch } from "@/lib/memory/search";
import {
  isRunning, pauseAgent, reconcileAgent, resumeAgent, runAgentStep, startSessionAgent, stopAgent, undoAgentTo, type AgentDenial, type AgentLabels, type AgentResult,
  type AgentStepOutcome, type SessionAgentRun,
} from "./agent";
import type { SessionRepository } from "./repository";

export interface AgentStoreOptions {
  /** intervalo entre passos automáticos (ms); null = só passo manual ("Próximo passo") */
  tickMs?: number | null;
  /** busca na Memória (padrão: `searchMemory`) — os testes injetam uma */
  search?: MemorySearch;
  clock?: () => Date;
}

export interface AgentStore {
  readonly source: "DEMO" | "API";
  /** execuções da sessão, da mais antiga para a mais recente */
  runs(sessionId: string): readonly SessionAgentRun[];
  latest(sessionId: string): SessionAgentRun | null;
  start(sessionId: string, actor: string, labels: AgentLabels): AgentResult<{ run: SessionAgentRun }>;
  /** um passo agora (também usado pelo motor automático) */
  step(sessionId: string, labels?: AgentLabels): AgentStepOutcome;
  pause(sessionId: string, actor: string): AgentResult<{ run: SessionAgentRun }>;
  resume(sessionId: string, actor: string, labels?: AgentLabels): AgentResult<{ run: SessionAgentRun }>;
  stop(sessionId: string, actor: string): AgentResult<{ run: SessionAgentRun }>;
  undoTo(sessionId: string, actor: string, runId: string, n: number, reason: string | null): AgentResult<{ run: SessionAgentRun; undone: number }>;
  subscribe(listener: () => void): () => void;
  snapshot(): number;
  dispose(): void;
}

export const DEFAULT_AGENT_TICK_MS = 1500;

export function createAgentStore(repo: SessionRepository, opts: AgentStoreOptions = {}): AgentStore {
  const tickMs = opts.tickMs === undefined ? DEFAULT_AGENT_TICK_MS : opts.tickMs;
  const clock = opts.clock ?? (() => new Date());
  const bySession = new Map<string, readonly SessionAgentRun[]>();
  const labelsBySession = new Map<string, AgentLabels>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();
  let tick = 0;
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-${clock().getTime().toString(36)}-${(seq++).toString(36)}`;
  const emit = () => {
    tick++;
    listeners.forEach((l) => l());
  };
  const runs = (sessionId: string) => bySession.get(sessionId) ?? [];
  const latest = (sessionId: string) => runs(sessionId).at(-1) ?? null;
  const put = (run: SessionAgentRun) => {
    const list = runs(run.sessionId);
    const i = list.findIndex((r) => r.id === run.id);
    bySession.set(run.sessionId, i < 0 ? [...list, run] : list.map((r, j) => (j === i ? run : r)));
  };
  const clearTimer = (sessionId: string) => {
    const t = timers.get(sessionId);
    if (t !== undefined) clearTimeout(t);
    timers.delete(sessionId);
  };
  const schedule = (sessionId: string) => {
    clearTimer(sessionId);
    const run = latest(sessionId);
    if (tickMs === null || !isRunning(run) || run!.paused) return;
    timers.set(sessionId, setTimeout(() => {
      timers.delete(sessionId);
      const out = store.step(sessionId);
      if (out.kind === "APLICADO") schedule(sessionId);
    }, tickMs));
  };

  // troca de política (modo, teto, mandato) ou sessão fora de edição: encerra já, sem esperar o próximo passo
  let reconciling = false;
  const unsubscribe = repo.subscribe(() => {
    if (reconciling) return;
    reconciling = true;
    try {
      for (const [sessionId, list] of bySession) {
        const run = list.at(-1);
        if (!isRunning(run)) continue;
        let ended: SessionAgentRun | null = null;
        repo.commitAgent(sessionId, (s, org) => {
          const r = reconcileAgent(s, org, run!, clock(), nextId("msg"));
          if (!r) return null;
          ended = r.run;
          return { session: r.session, audit: [] };
        });
        const closed = ended as SessionAgentRun | null;
        if (closed) {
          put(closed);
          clearTimer(sessionId);
          emit();
        }
      }
    } finally {
      reconciling = false;
    }
  });

  const store: AgentStore = {
    source: "DEMO",
    runs,
    latest,

    start(sessionId, actor, labels) {
      let out: AgentResult<{ run: SessionAgentRun }> = { ok: false, reason: "NAO_PARTICIPA" };
      reconciling = true;
      try {
        repo.commitAgent(sessionId, (s, org) => {
          const r = startSessionAgent(s, org, actor, latest(sessionId), clock(), { run: nextId("agente"), message: nextId("msg") });
          if (!r.ok) {
            out = r;
            return null;
          }
          out = { ok: true, run: r.run };
          return { session: r.session, audit: [] };
        });
      } finally {
        reconciling = false;
      }
      const res = out as AgentResult<{ run: SessionAgentRun }>;
      if (res.ok) {
        labelsBySession.set(sessionId, labels);
        put(res.run);
        emit();
        schedule(sessionId);
      }
      return res;
    },

    step(sessionId, labels) {
      const run = latest(sessionId);
      if (labels) labelsBySession.set(sessionId, labels);
      const l = labelsBySession.get(sessionId);
      if (!run) return { kind: "NEGADO", reason: "SEM_EXECUCAO" };
      if (!l) return { kind: "NEGADO", reason: "SEM_EXECUCAO" };
      let out: AgentStepOutcome = { kind: "NEGADO", reason: "NAO_PARTICIPA" };
      reconciling = true;
      try {
        repo.commitAgent(sessionId, (s, org) => {
          out = runAgentStep(s, org, run, l, repo.people, clock(), nextId("msg"), { search: opts.search });
          if (out.kind === "NEGADO") return null;
          return { session: out.session, audit: out.kind === "APLICADO" ? [out.audit] : [] };
        });
      } finally {
        reconciling = false;
      }
      const done = out as AgentStepOutcome;
      if (done.kind !== "NEGADO") {
        put(done.run);
        if (done.kind === "ENCERRADO") clearTimer(sessionId);
        emit();
      }
      return done;
    },

    pause(sessionId, actor) {
      const run = latest(sessionId);
      const s = repo.get(sessionId);
      if (!run || !s) return { ok: false, reason: "SEM_EXECUCAO" };
      const r = pauseAgent(s, run, actor);
      if (r.ok) {
        put(r.run);
        clearTimer(sessionId);
        emit();
      }
      return r;
    },

    resume(sessionId, actor, labels) {
      const run = latest(sessionId);
      const s = repo.get(sessionId);
      if (!run || !s) return { ok: false, reason: "SEM_EXECUCAO" };
      const r = resumeAgent(s, run, actor);
      if (r.ok) {
        if (labels) labelsBySession.set(sessionId, labels);
        put(r.run);
        emit();
        schedule(sessionId);
      }
      return r;
    },

    stop(sessionId, actor) {
      const run = latest(sessionId);
      if (!run) return { ok: false, reason: "SEM_EXECUCAO" };
      let out: AgentResult<{ run: SessionAgentRun }> = { ok: false, reason: "NAO_PARTICIPA" };
      reconciling = true;
      try {
        repo.commitAgent(sessionId, (s) => {
          const r = stopAgent(s, run, actor, clock(), nextId("msg"));
          if (!r.ok) {
            out = r;
            return null;
          }
          out = { ok: true, run: r.run };
          return { session: r.session, audit: [] };
        });
      } finally {
        reconciling = false;
      }
      const res = out as AgentResult<{ run: SessionAgentRun }>;
      if (res.ok) {
        put(res.run);
        clearTimer(sessionId);
        emit();
      }
      return res;
    },

    undoTo(sessionId, actor, runId, n, reason) {
      const run = runs(sessionId).find((r) => r.id === runId);
      if (!run) return { ok: false, reason: "SEM_EXECUCAO" };
      let out: AgentResult<{ run: SessionAgentRun; undone: number }> = { ok: false, reason: "NAO_PARTICIPA" };
      reconciling = true;
      try {
        repo.commitAgent(sessionId, (s, org) => {
          const r = undoAgentTo(s, org, run, actor, n, reason, clock());
          if (!r.ok) {
            out = r;
            return null;
          }
          out = { ok: true, run: r.run, undone: r.undone };
          return { session: r.session, audit: [r.audit] };
        });
      } finally {
        reconciling = false;
      }
      const res = out as AgentResult<{ run: SessionAgentRun; undone: number }>;
      if (res.ok) {
        put(res.run);
        clearTimer(sessionId);
        emit();
      }
      return res;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => tick,
    dispose() {
      for (const id of [...timers.keys()]) clearTimer(id);
      unsubscribe();
      listeners.clear();
    },
  };
  return store;
}

const stores = new WeakMap<SessionRepository, AgentStore>();
/** Armazenamento do agente ligado a um repositório de sessões (um por repositório; as opções valem na primeira chamada). */
export function agentStoreFor(repo: SessionRepository, opts?: AgentStoreOptions): AgentStore {
  let s = stores.get(repo);
  if (!s) {
    s = createAgentStore(repo, opts);
    stores.set(repo, s);
  }
  return s;
}

const NO_RUNS: readonly SessionAgentRun[] = [];
/** Execuções da sessão (re-renderiza a cada passo). */
export function useAgentRuns(store: AgentStore, sessionId: string): readonly SessionAgentRun[] {
  useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return store.runs(sessionId) ?? NO_RUNS;
}

export type { AgentDenial };
