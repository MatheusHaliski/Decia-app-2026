import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentCharter } from "@/lib/ai/autonomy";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { createMemoryLedger } from "@/lib/points/ledger";
import type { AgentLabels } from "./agent";
import { createAgentStore } from "./agentStore";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "./fixtures";
import { MINUTA_TARGET } from "./policy";
import { createMemorySessionRepository } from "./repository";

const NOW = new Date("2026-11-12T15:00:00Z");
const S = DEMO_SESSION_IDS.infra;
const LABELS: AgentLabels = {
  section: { EVIDENCIAS: "Evidências", PERGUNTAS: "Perguntas", DECISOES: "Decisões", ENCAMINHAMENTOS: "Encaminhamentos", FONTES: "Fontes" },
  followUpProposal: (q) => `Proposta: ${q}`, summary: (s, n) => `${s}: ${n}`, reason: (s, n) => `${s} ${n}`, formatDate: (d) => d,
};
const charter: AgentCharter = {
  goal: "Completar a minuta com o que a sessão registrou", authorizedBy: "u-pessoa", scopeTargetIds: [MINUTA_TARGET], allowedTools: ["propor_minuta"],
  maxSteps: 10, maxTokens: 20_000, expiresAt: new Date(NOW.getTime() + 2 * 3_600_000).toISOString(), connectorIds: [],
};
function setup(tickMs: number | null = null) {
  const audit = createAuditLog();
  const repo = createMemorySessionRepository(buildDemoSessions(NOW), { ...buildDemoOrgPolicy(NOW), ceiling: "AGENTE" }, { ledger: createMemoryLedger(), audit, people: DEMO_PEOPLE, search: () => [] });
  const r = repo.changeMode(S, "u-pessoa", "AGENTE", charter, NOW);
  if (!r.ok) throw new Error(r.reason);
  const store = createAgentStore(repo, { tickMs, clock: () => NOW, search: () => [] });
  return { repo, audit, store };
}

afterEach(() => vi.useRealTimers());

describe("armazenamento do agente sobre o repositório da sessão", () => {
  it("passo manual grava a minuta e a auditoria encadeada (antes/depois, quem autorizou); conclui sozinho", () => {
    const { repo, audit, store } = setup();
    const before = repo.get(S)!.minuta.text;
    expect(store.start(S, "u-pessoa", LABELS).ok).toBe(true);
    expect(repo.get(S)!.messages.at(-1)!.notice).toMatchObject({ kind: "AGENTE", event: "INICIADO" });
    const out = store.step(S);
    expect(out.kind).toBe("APLICADO");
    expect(repo.get(S)!.minuta.text).not.toBe(before);
    const rec = audit.list().at(-1)!;
    expect(rec).toMatchObject({ action: "AGENTE_APLICOU", actorId: "u-pessoa", before, after: repo.get(S)!.minuta.text, agent: { authorizedBy: "u-pessoa", step: 1 } });
    expect(audit.verify()).toEqual({ ok: true });
    store.step(S);
    expect(store.step(S).kind).toBe("ENCERRADO");
    expect(store.latest(S)!.core.status).toBe("CONCLUIDO");
    store.dispose();
  });

  it("troca de modo no repositório encerra a execução na hora (INTERROMPIDO) e avisa os membros", () => {
    const { repo, store } = setup();
    store.start(S, "u-pessoa", LABELS);
    store.step(S);
    repo.changeMode(S, "u-pessoa", "ASSISTIDO", null, NOW);
    expect(store.latest(S)).toMatchObject({ endReason: "POLITICA_ALTERADA", core: { status: "INTERROMPIDO" } });
    const last = repo.get(S)!.messages.at(-1)!;
    expect(last.notice).toMatchObject({ kind: "AGENTE", event: "INTERROMPIDO", reason: "POLITICA_ALTERADA" });
    expect(repo.get(S)!.unread["u-bruno"]).toContain(last.id);
    expect(store.step(S)).toEqual({ kind: "NEGADO", reason: "EXECUCAO_ENCERRADA" });
    store.dispose();
  });

  it("motor automático: um passo a cada tick; pausar para, retomar continua; desfazer pausa e audita", () => {
    vi.useFakeTimers();
    const { repo, audit, store } = setup(1000);
    store.start(S, "u-pessoa", LABELS);
    vi.advanceTimersByTime(1000);
    expect(store.latest(S)!.steps).toHaveLength(1);
    expect(store.pause(S, "u-bruno").ok).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(store.latest(S)!.steps).toHaveLength(1);
    expect(store.resume(S, "u-pessoa").ok).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(store.latest(S)!.steps).toHaveLength(2);
    const run = store.latest(S)!;
    const u = store.undoTo(S, "u-bruno", run.id, 2, "volta");
    expect(u.ok).toBe(true);
    expect(store.latest(S)!.paused).toBe(true);
    expect(audit.list().at(-1)).toMatchObject({ action: "REVERTEU", target: { kind: "PASSO_AGENTE" }, agent: { step: 2 } });
    expect(repo.get(S)!.minuta.history.at(-1)!.origin).toBe("AGENTE_DESFEITO");
    vi.advanceTimersByTime(5000);
    expect(store.latest(S)!.steps.filter((s) => !s.undoneAt)).toHaveLength(1);
    store.dispose();
  });
});
