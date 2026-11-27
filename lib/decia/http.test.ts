import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { addAlternative, addCriteria, addEvidence, createDecision, decide, recordOutcome, setScore, setStatus, setWeight } from "./commands";
import { createHttpRepository, diffCommands, fromDto, type DecisionCommandDto, type DecisionTransport, type DecisionViewDto } from "./http";
import type { DecisionAggregate } from "./types";

const ME = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-11-24T12:00:00Z");

function dto(id: string, version: number, extra: Partial<DecisionViewDto> = {}, status: DecisionViewDto["decision"]["status"] = "RASCUNHO"): DecisionViewDto {
  return {
    decision: {
      id, version, title: "Qual fornecedor contratar", question: "Qual fornecedor contratar?", ownerUserId: ME, createdByUserId: ME, companyId: "c1",
      status, complexity: "RAPIDA", kind: "CONTRATACAO", impact: "MEDIO", urgency: "MEDIO", visibility: "PRIVADA", accessClass: "INTERNO",
      weightingEnabled: false, independentScoring: false, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), contextMd: null, stakeholders: null,
    },
    participants: [{ userId: ME, role: "CONDUTOR", joinedAt: NOW.toISOString() }],
    alternatives: [], criteria: [], assessments: [], evidence: [], evidenceLinks: [], snapshots: [], outcome: null,
    events: [{ id: "e1", actorUserId: ME, type: "DECISAO_CRIADA", payload: { complexity: "RAPIDA" }, at: NOW.toISOString() }],
    ...extra,
  };
}

function fakeTransport(handler: (method: "GET" | "POST", path: string, body?: unknown) => unknown) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const transport: DecisionTransport = {
    get: async <T,>(path: string) => { calls.push({ method: "GET", path }); return (await handler("GET", path)) as T; },
    post: async <T,>(path: string, body: unknown) => { calls.push({ method: "POST", path, body }); return (await handler("POST", path, body)) as T; },
  };
  return { transport, calls };
}

describe("fromDto", () => {
  it("converte nulos em ausentes e preenche as coleções que a API ainda não grava", () => {
    const agg = fromDto(dto("d1", 3));
    expect(agg.decision.version).toBe(3);
    expect(agg.decision.contextMd).toBeUndefined();
    expect(agg.decision.stakeholders).toEqual([]);
    expect(agg.risks).toEqual([]);
    expect(agg.recommendations).toEqual([]);
    expect(agg.outcome).toBeUndefined();
    expect(agg.events[0]).toMatchObject({ type: "DECISAO_CRIADA", payload: { complexity: "RAPIDA" } });
  });
});

describe("diffCommands", () => {
  const base = (): DecisionAggregate => fromDto(dto("d1", 2, { criteria: [{ id: "c-srv", name: "Custo", direction: "MAIOR_MELHOR", weightPct: null, origin: "HUMANO", position: 0 }] }));

  it("cria alternativas com ref, dá nota nelas no mesmo lote e muda o peso", () => {
    let next = addAlternative(base(), { title: "Nuvem" }, ME, NOW);
    const alt = next.alternatives[0].id;
    next = setScore(next, alt, "c-srv", ME, 4, NOW);
    next = setWeight(next, "c-srv", 100, ME, NOW);
    next = addCriteria(next, ["Prazo"], ME, NOW);
    next = addEvidence(next, { title: "Cotação", nature: "FATO", sourceLabel: "Portal", reliability: "ALTA", altId: alt, stance: "SUSTENTA" }, ME, NOW);
    const cmds = diffCommands(base(), next, ME);
    expect(cmds.map((c) => c.type)).toEqual(["ADD_ALTERNATIVE", "ADD_CRITERION", "SET_WEIGHT", "SET_SCORE", "ADD_EVIDENCE"]);
    expect(cmds[0]).toMatchObject({ ref: alt, title: "Nuvem", doNothing: false });
    expect(cmds[2]).toMatchObject({ criterionId: "c-srv", weightPct: 100 });
    expect(cmds[3]).toMatchObject({ alternativeId: alt, criterionId: "c-srv", score: 4 });
    expect(cmds[4]).toMatchObject({ alternativeId: alt, stance: "SUSTENTA", nature: "FATO" });
  });

  it("só envia as notas de quem está logado e remove a nota apagada", () => {
    const b = fromDto(dto("d1", 2, {
      alternatives: [{ id: "a1", label: "A", title: "Sim", doNothing: false, status: "ATIVA", origin: "HUMANO", position: 0 }],
      criteria: [{ id: "c1", name: "Custo", direction: "MAIOR_MELHOR", weightPct: null, origin: "HUMANO", position: 0 }],
      assessments: [
        { id: "s1", alternativeId: "a1", criterionId: "c1", assessorUserId: ME, score: 3, submittedAt: NOW.toISOString(), origin: "HUMANO" },
        { id: "s2", alternativeId: "a1", criterionId: "c1", assessorUserId: "outra", score: 5, submittedAt: NOW.toISOString(), origin: "HUMANO" },
      ],
    }));
    const removed = setScore(b, "a1", "c1", ME, null, NOW);
    expect(diffCommands(b, removed, ME)).toEqual([{ type: "SET_SCORE", alternativeId: "a1", criterionId: "c1", score: null }]);
    expect(diffCommands(b, b, ME)).toEqual([]);
  });

  it("decidir vira DECIDE (com avisos já confirmados na UI), resultado vira RECORD_OUTCOME e o resto TRANSITION", () => {
    let agg = createDecision({ question: "Qual fornecedor contratar?", complexity: "RAPIDA", impact: "MEDIO", ownerUserId: ME }, NOW);
    agg = addCriteria(agg, ["Custo"], ME, NOW);
    agg = addAlternative(agg, { title: "Sim" }, ME, NOW);
    agg = addAlternative(agg, { title: "Não", doNothing: true }, ME, NOW);
    const ready = agg;
    const { aggregate: decided } = decide(ready, { selectedAlternativeId: ready.alternatives[0].id, rationale: "Menor custo total.", confidencePct: 70, warningsConfirmed: true }, ME, NOW);
    const cmds = diffCommands(ready, decided, ME);
    expect(cmds).toEqual([{ type: "DECIDE", alternativeId: ready.alternatives[0].id, rationale: "Menor custo total.", confidencePct: 70, warningsConfirmed: true }]);
    const resolved = recordOutcome(decided, { result: "SUCESSO", summary: "Entregue." }, ME, NOW);
    expect(diffCommands(decided, resolved, ME)).toEqual([{ type: "RECORD_OUTCOME", result: "SUCESSO", summary: "Entregue." }]);
    expect(diffCommands(ready, setStatus(ready, "ENQUADRAMENTO", ME, NOW), ME)).toEqual([{ type: "TRANSITION", to: "ENQUADRAMENTO" }]);
  });
});

describe("createHttpRepository", () => {
  it("carrega no primeiro subscribe, cria com id provisório e troca pelo do servidor", async () => {
    const { transport, calls } = fakeTransport((method, path) => {
      if (method === "GET") return [dto("d-old", 1)];
      if (path === "/api/decisions") return dto("d-new", 0);
      throw new Error("inesperado");
    });
    const repo = createHttpRepository({ userId: ME, transport });
    expect(repo.source).toBe("API");
    const listener = vi.fn();
    repo.subscribe(listener);
    await repo.settled();
    expect(repo.status()).toBe("ready");
    expect(repo.list().map((a) => a.decision.id)).toEqual(["d-old"]);

    const local = repo.create({ question: "Qual fornecedor contratar?", complexity: "RAPIDA", impact: "MEDIO", templateKey: "fornecedor", ownerUserId: ME }, NOW);
    expect(repo.get(local.decision.id)?.decision.id).toBe(local.decision.id);
    await repo.settled();
    expect(calls[1]).toMatchObject({ method: "POST", path: "/api/decisions", body: { question: "Qual fornecedor contratar?", kind: "CONTRATACAO", templateKey: "fornecedor" } });
    expect((calls[1].body as { criteria: string[] }).criteria).toContain("Custo");
    // o id provisório continua achando a decisão (a URL do workspace não quebra)
    expect(repo.get(local.decision.id)?.decision.id).toBe("d-new");
    expect(repo.list().map((a) => a.decision.id)).toEqual(["d-new", "d-old"]);
    expect(listener).toHaveBeenCalled();
  });

  it("save envia o lote com a versão confirmada e aprende os ids das alternativas criadas", async () => {
    const sent: { version: number; commands: DecisionCommandDto[] }[] = [];
    let version = 4;
    const { transport } = fakeTransport((method, _path, body) => {
      if (method === "GET") return [dto("d1", 4)];
      const b = body as { version: number; commands: DecisionCommandDto[] };
      sent.push(b);
      version += 1;
      const alts = b.commands.filter((c) => c.type === "ADD_ALTERNATIVE").map((c, i) => ({ id: `srv-${i}`, label: "A", title: c.title!, doNothing: false, status: "ATIVA" as const, origin: "HUMANO" as const, position: i }));
      return dto("d1", version, { alternatives: alts });
    });
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    const base = repo.get("d1")!;
    const withAlt = addAlternative(base, { title: "Nuvem" }, ME, NOW);
    const localAlt = withAlt.alternatives[0].id;
    repo.save(withAlt);
    expect(repo.get("d1")!.alternatives[0].id).toBe(localAlt); // otimista
    await repo.settled();
    expect(sent[0]).toEqual({ version: 4, commands: [{ type: "ADD_ALTERNATIVE", ref: localAlt, title: "Nuvem", doNothing: false }] });
    expect(repo.get("d1")!.decision.version).toBe(5);
    expect(repo.get("d1")!.alternatives[0].id).toBe("srv-0");

    // a UI ainda tem o id local numa cópia antiga: não recria a alternativa
    repo.save(withAlt);
    await repo.settled();
    expect(sent).toHaveLength(1);
  });

  it("409 EDICAO_CONCORRENTE volta ao estado do servidor e expõe o erro", async () => {
    const { transport } = fakeTransport((method) => {
      if (method === "GET") return [dto("d1", 2)];
      throw new ApiError(409, "EDICAO_CONCORRENTE", "Este conteúdo foi alterado em outra sessão.");
    });
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    repo.save(addAlternative(repo.get("d1")!, { title: "Nuvem" }, ME, NOW));
    expect(repo.get("d1")!.alternatives).toHaveLength(1);
    await repo.settled();
    expect(repo.get("d1")!.alternatives).toHaveLength(0);
    expect((repo.lastError() as ApiError).code).toBe("EDICAO_CONCORRENTE");
  });

  it("falha na carga deixa o estado em erro e a criação recusada some da lista", async () => {
    const { transport } = fakeTransport((method) => {
      if (method === "GET") throw new ApiError(0, "OFFLINE", "offline");
      throw new ApiError(422, "DECISAO_SEM_EMPRESA", "sem empresa");
    });
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    expect(repo.status()).toBe("error");
    repo.create({ question: "Qual fornecedor contratar?", complexity: "RAPIDA", impact: "MEDIO", ownerUserId: ME }, NOW);
    expect(repo.list()).toHaveLength(1);
    await repo.settled();
    expect(repo.list()).toHaveLength(0);
    expect((repo.lastError() as ApiError).code).toBe("DECISAO_SEM_EMPRESA");
  });
});
