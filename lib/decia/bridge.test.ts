import { afterEach, describe, expect, it, vi } from "vitest";
import { openChangeDecision, openGateDecision, remapDecisionId, settleDecision, syncFromDecia } from "@/lib/projects/decia";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { createHttpRepository, fromDto, type DecisionCommandDto, type DecisionTransport, type DecisionViewDto } from "./http";
import { createMemoryRepository, linkedDecisions } from "./repository";
import { activeDecisionRepository, activeDecisionSource, setActiveDecisionRepository } from "./useDecisionRepository";

const ME = "11111111-1111-4111-8111-111111111111";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-11-24T12:00:00Z");

/** Servidor falso mínimo: cria a decisão (com o vínculo PROJETO quando há projectId) e aplica ADD_ALTERNATIVE/LINK_WORK. */
function fakeServer() {
  const store = new Map<string, DecisionViewDto>();
  const posts: { path: string; body: unknown }[] = [];
  let n = 0;
  const transport: DecisionTransport = {
    get: async <T,>() => [...store.values()] as T,
    post: async <T,>(path: string, body: unknown) => {
      posts.push({ path, body });
      if (path === "/api/decisions") {
        const b = body as { question: string; projectId?: string; criteria: string[] };
        const id = `aaaaaaaa-0000-4000-8000-${String(++n).padStart(12, "0")}`;
        const dto: DecisionViewDto = {
          decision: { id, version: 0, title: b.question, question: b.question, status: "RASCUNHO", ownerUserId: ME, createdByUserId: ME, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), projectId: b.projectId },
          participants: [{ userId: ME, role: "CONDUTOR", joinedAt: NOW.toISOString() }],
          criteria: b.criteria.map((name, i) => ({ id: `${id}-c${i}`, name, direction: "MAIOR_MELHOR", origin: "HUMANO", position: i })),
          workLinks: b.projectId ? [{ id: `${id}-w`, targetType: "PROJETO", targetId: b.projectId, createdByUserId: ME, createdAt: NOW.toISOString() }] : [],
        };
        store.set(id, dto);
        return dto as T;
      }
      const id = path.split("/")[3]!;
      const cur = store.get(id)!;
      const cmds = (body as { commands: DecisionCommandDto[] }).commands;
      const alts = [...(cur.alternatives ?? [])];
      for (const c of cmds) if (c.type === "ADD_ALTERNATIVE") alts.push({ id: `${id}-a${alts.length}`, label: String.fromCharCode(65 + alts.length), title: c.title, doNothing: false, status: "ATIVA", origin: "HUMANO", position: alts.length });
      const next = { ...cur, decision: { ...cur.decision, version: (cur.decision?.version ?? 0) + 1 }, alternatives: alts };
      store.set(id, next);
      return next as T;
    },
  };
  return { transport, store, posts };
}

afterEach(() => setActiveDecisionRepository(null));

describe("ponte Mesa → DECIA na mesma fonte (sem 404 projeto → decisão)", () => {
  it("na API a decisão do portão nasce no servidor; a Mesa recebe o id definitivo e a página acha a decisão", async () => {
    const server = fakeServer();
    const repo = createHttpRepository({ userId: ME, transport: server.transport });
    repo.subscribe(() => {});
    await repo.settled();
    const project = { ...buildDemoProject(), id: PROJECT };
    const opened = openGateDecision(repo, project, "ELABORACAO", "Elaboração", ME, NOW);
    expect(opened.labProject).toBe(false);
    const settled = await settleDecision(repo, opened);
    await repo.settled();
    expect(settled.decisionId).toMatch(/^aaaaaaaa-/);
    expect(settled.commands).toEqual([{ type: "GATE_SET", phase: "ELABORACAO", outcome: "PENDENTE", decisionId: settled.decisionId }, { type: "LINK_DECISION", decisionId: settled.decisionId }]);
    // a página da decisão lê o mesmo repositório: existe, com as 4 alternativas e o vínculo com o projeto
    const agg = repo.get(settled.decisionId)!;
    expect(agg.alternatives.map((a) => a.label)).toEqual(["A", "B", "C", "D"]);
    expect(agg.decision.projectId).toBe(PROJECT);
    expect(linkedDecisions(repo.list(), "PROJETO", PROJECT).map((a) => a.decision.id)).toEqual([settled.decisionId]);
    expect(server.posts[0]!.body).toMatchObject({ projectId: PROJECT, templateKey: "portao" });
    // o vínculo PROJETO criado pelo servidor não é repetido pelo lote das alternativas
    expect((server.posts[1]!.body as { commands: DecisionCommandDto[] }).commands.every((c) => c.type === "ADD_ALTERNATIVE")).toBe(true);
    // o id provisório também resolve (link antigo) e a sincronização da Mesa acha a decisão pelos dois
    expect(repo.get(opened.decisionId)?.decision.id).toBe(settled.decisionId);
    expect(syncFromDecia({ ...project, gates: project.gates.map((g) => (g.phase === "ELABORACAO" ? { ...g, outcome: "PENDENTE", decisionId: opened.decisionId } : g)) }, [], (id) => repo.get(id))).toEqual([]);
  });

  it("projeto do laboratório numa sessão real: a decisão existe na API, sem vínculo no servidor, e o retorno avisa", async () => {
    const server = fakeServer();
    const repo = createHttpRepository({ userId: ME, transport: server.transport });
    repo.subscribe(() => {});
    await repo.settled();
    const project = buildDemoProject();
    const opened = openChangeDecision(repo, project, project.changes[0]!, ME, NOW);
    expect(opened.labProject).toBe(true);
    const settled = await settleDecision(repo, opened);
    await repo.settled();
    expect(repo.get(settled.decisionId)).toBeDefined();
    expect(server.posts[0]!.body).not.toHaveProperty("projectId");
    expect(repo.lastError()).toBeNull();
  });

  it("no DEMO o id já é o definitivo e o remapeamento não muda nada", async () => {
    const repo = createMemoryRepository([]);
    const opened = openGateDecision(repo, buildDemoProject(), "ELABORACAO", "Elaboração", "u-pessoa", NOW);
    const settled = await settleDecision(repo, opened);
    expect(settled).toEqual({ ...opened });
    expect(repo.get(opened.decisionId)!.workLinks[0]).toMatchObject({ targetType: "PROJETO" });
    expect(remapDecisionId([{ type: "LINK_DECISION", decisionId: "x" }], "x", "y")).toEqual([{ type: "LINK_DECISION", decisionId: "y" }]);
  });
});

describe("fonte ativa fora do React (Memória, handoff)", () => {
  it("segue a fonte escolhida e reassina quando ela troca", () => {
    const a = createMemoryRepository([]);
    const b = createMemoryRepository([fromDto({ decision: { id: "d-b", status: "RESOLVIDA", createdAt: NOW.toISOString() } })]);
    const listener = vi.fn();
    expect(activeDecisionRepository().source).toBe("DEMO");
    setActiveDecisionRepository(a);
    const off = activeDecisionSource.subscribe(listener);
    expect(activeDecisionSource.list()).toEqual([]);
    setActiveDecisionRepository(b);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(activeDecisionSource.list().map((x) => x.decision.id)).toEqual(["d-b"]);
    b.save({ ...b.list()[0]!, decision: { ...b.list()[0]!.decision, title: "novo" } });
    expect(listener).toHaveBeenCalledTimes(2);
    a.save(b.list()[0]!); // a fonte antiga não avisa mais
    expect(listener).toHaveBeenCalledTimes(2);
    off();
  });
});

describe("criação recusada pelo servidor", () => {
  it("confirmedId rejeita (a Mesa não grava vínculo com id provisório)", async () => {
    const transport: DecisionTransport = {
      get: async <T,>() => [] as T,
      post: async () => { throw new Error("DECISAO_SEM_EMPRESA"); },
    };
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    const opened = openGateDecision(repo, { ...buildDemoProject(), id: PROJECT }, "ELABORACAO", "Elaboração", ME, NOW);
    await expect(settleDecision(repo, opened)).rejects.toThrow("DECISAO_SEM_EMPRESA");
    expect(repo.list()).toEqual([]);
  });
});
