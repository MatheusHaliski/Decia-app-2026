import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { addAlternative, addCriteria, addEvidence, createDecision, decide, linkWork, recordOutcome, setRecommendationStatus, setScore, setStatus, setWeight, unlinkWork } from "./commands";
import { createHttpRepository, DecisionApiLimitError, diffCommands, fromDto, isServerId, unsupportedChanges, type DecisionCommandDto, type DecisionTransport, type DecisionViewDto } from "./http";
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
  it("converte nulos em ausentes e preenche vazio o que não veio", () => {
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
    // sem `score` = remover a nota de quem pede (o servidor trata ausente e nulo igual)
    expect(diffCommands(b, removed, ME)).toEqual([{ type: "SET_SCORE", alternativeId: "a1", criterionId: "c1" }]);
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

const TASK = "22222222-2222-4222-8222-222222222222";
const PROJECT = "33333333-3333-4333-8333-333333333333";

describe("fase 7b — registros da decisão", () => {
  const withRecords = () => fromDto(dto("d1", 5, {
    alternatives: [{ id: "a1", label: "A", title: "Sim", doNothing: false, status: "ATIVA", origin: "HUMANO", position: 0 }],
    assumptions: [{ id: "p1", statement: "Orçamento aprovado", importance: "CRITICO", confidencePct: 70, validationStatus: "NAO_VALIDADA", origin: "HUMANO", alternativeId: null }],
    risks: [{ id: "r1", title: "Atraso", likelihood: "PROVAVEL", impact: "ALTO", severity: "ALTO", source: "MANUAL", status: "ABERTO", origin: "HUMANO", alternativeId: "a1" }],
    scenarios: [{ id: "s1", scenarioCase: "BASE", description: "No prazo", likelihood: "POSSIVEL", assumptionIds: ["p1"], expectedResult: "Março" }],
    forecasts: [{ id: "f1", statement: "Até março?", probabilityPct: 65, resolveBy: "2027-03-31", forecasterUserId: ME, resolution: "PENDENTE" }],
    recommendations: [{ id: "rec1", source: "MODELO", reasoningMd: "A lidera", supporting: ["s"], contradicting: ["c"], criticalAssumptionIds: ["p1"], limitationsMd: "l", whatWouldChangeMd: "w", modelVersion: "decia-scoring-v1", status: "SUGERIDA", createdAt: NOW.toISOString() }],
    triggers: [{ id: "g1", conditionText: "Custo > 1 mi", metricKey: "custo", comparator: ">", threshold: 1000000, status: "ATIVO" }],
    checkpoints: [{ id: "k1", dueAt: "2027-01-10T12:00:00Z", kind: "PROGRAMADO", status: "AGENDADO" }],
    workLinks: [{ id: "w1", targetType: "PROJETO", targetId: PROJECT, createdByUserId: ME, createdAt: NOW.toISOString() }],
    retrospective: null,
  }));

  it("fromDto mapeia premissas, riscos, cenários, previsões, recomendações, gatilhos, checkpoints e vínculos (sem perda)", () => {
    const agg = withRecords();
    expect(agg.assumptions[0]).toMatchObject({ id: "p1", importance: "CRITICO", confidencePct: 70 });
    expect(agg.assumptions[0].alternativeId).toBeUndefined();
    expect(agg.risks[0]).toMatchObject({ alternativeId: "a1", likelihood: "PROVAVEL" });
    expect(agg.scenarios[0]).toMatchObject({ case: "BASE", assumptionIds: ["p1"] });
    expect(agg.forecasts[0].probabilityPct).toBe(65);
    expect(agg.recommendations[0].status).toBe("SUGERIDA");
    expect(agg.triggers[0].threshold).toBe(1000000);
    expect(agg.checkpoints[0].status).toBe("AGENDADO");
    // o vínculo não copia dados: o rótulo fica vazio para a tela resolver
    expect(agg.workLinks[0]).toMatchObject({ targetType: "PROJETO", targetId: PROJECT, label: "" });
    expect(agg.retrospective).toBeUndefined();
    // ida e volta sem mudança = nenhum comando
    expect(diffCommands(agg, agg, ME)).toEqual([]);
  });

  it("diffCommands cria com ref, altera com itemId e remove registros", () => {
    const b = withRecords();
    const next = {
      ...b,
      assumptions: [{ ...b.assumptions[0], validationStatus: "VALIDADA" as const }, { id: "p-local", statement: "Equipe disponível", importance: "ALTO" as const, validationStatus: "NAO_VALIDADA" as const, origin: "HUMANO" as const }],
      risks: [],
      scenarios: [{ ...b.scenarios[0], assumptionIds: ["p1", "p-local"] }],
      triggers: [{ ...b.triggers[0], status: "DISPARADO" as const }],
      forecasts: [{ ...b.forecasts[0], resolution: "OCORREU" as const }, { id: "f-local", statement: "Custo abaixo do teto?", probabilityPct: 80, resolveBy: "2027-06-30T00:00:00.000Z", forecasterUserId: ME, resolution: "PENDENTE" as const }],
      checkpoints: [{ ...b.checkpoints[0], status: "CONCLUIDO" as const, action: "MANTER" as const, confidencePctAfter: 80 }],
    };
    const cmds = diffCommands(b, next, ME);
    expect(cmds).toContainEqual({ type: "PUT_ASSUMPTION", itemId: "p1", assumption: { statement: "Orçamento aprovado", importance: "CRITICO", confidencePct: 70, validationStatus: "VALIDADA" } });
    expect(cmds).toContainEqual({ type: "PUT_ASSUMPTION", ref: "p-local", assumption: { statement: "Equipe disponível", importance: "ALTO", validationStatus: "NAO_VALIDADA" } });
    expect(cmds).toContainEqual({ type: "REMOVE_RISK", itemId: "r1" });
    expect(cmds).toContainEqual(expect.objectContaining({ type: "PUT_SCENARIO", itemId: "s1", scenario: expect.objectContaining({ assumptionIds: ["p1", "p-local"] }) }));
    expect(cmds).toContainEqual(expect.objectContaining({ type: "PUT_TRIGGER", itemId: "g1", trigger: expect.objectContaining({ status: "DISPARADO" }) }));
    expect(cmds).toContainEqual({ type: "PUT_FORECAST", itemId: "f1", forecast: { resolution: "OCORREU" } });
    expect(cmds).toContainEqual({ type: "PUT_FORECAST", ref: "f-local", forecast: { statement: "Custo abaixo do teto?", probabilityPct: 80, resolveBy: "2027-06-30" } });
    expect(cmds).toContainEqual(expect.objectContaining({ type: "PUT_CHECKPOINT", itemId: "k1", checkpoint: expect.objectContaining({ status: "CONCLUIDO", action: "MANTER" }) }));
    // premissa nova vai antes do cenário que a cita
    expect(cmds.findIndex((c) => c.ref === "p-local")).toBeLessThan(cmds.findIndex((c) => c.type === "PUT_SCENARIO"));
  });

  it("aceitar recomendação vira PUT_RECOMMENDATION só com o estado; vínculo de tarefa vira LINK_WORK/UNLINK_WORK", () => {
    const b = withRecords();
    const accepted = setRecommendationStatus(b, "rec1", "ACEITA", ME, NOW);
    expect(diffCommands(b, accepted, ME)).toEqual([{ type: "PUT_RECOMMENDATION", itemId: "rec1", recommendation: { status: "ACEITA" } }]);
    const linked = linkWork(b, { targetType: "TAREFA", targetId: TASK, label: "Levantar preços" }, ME, NOW);
    const local = linked.workLinks.find((w) => w.targetId === TASK)!;
    expect(diffCommands(b, linked, ME)).toEqual([{ type: "LINK_WORK", ref: local.id, workLink: { targetType: "TAREFA", targetId: TASK } }]);
    expect(diffCommands(b, unlinkWork(b, "w1", ME, NOW), ME)).toEqual([{ type: "UNLINK_WORK", itemId: "w1" }]);
  });

  it("unsupportedChanges aponta o que a API não grava (nunca perda silenciosa)", () => {
    const b = withRecords();
    expect(unsupportedChanges(b, b)).toEqual([]);
    const lab = linkWork(b, { targetType: "TAREFA", targetId: "t-termo", label: "Tarefa do laboratório" }, ME, NOW);
    expect(unsupportedChanges(b, lab)).toEqual(["workLinks.labTarget"]);
    expect(diffCommands(b, lab, ME)).toEqual([]);
    const renamed = { ...b, decision: { ...b.decision, contextMd: "novo" }, alternatives: [{ ...b.alternatives[0], title: "Outro" }] };
    expect(unsupportedChanges(b, renamed)).toEqual(["decision.fields", "alternatives.edit"]);
    const ai = { ...b, recommendations: [...b.recommendations, { ...b.recommendations[0], id: "rec-ia", source: "IA" as const }] };
    expect(unsupportedChanges(b, ai)).toEqual(["recommendations.ai"]);
    expect(isServerId(TASK)).toBe(true);
    expect(isServerId("t-termo")).toBe(false);
  });

  it("save envia o suportado e expõe o limite; registros novos aprendem o id do servidor pelo conteúdo", async () => {
    const sent: DecisionCommandDto[][] = [];
    const { transport } = fakeTransport((method, _path, body) => {
      if (method === "GET") return [dto("d1", 1)];
      const b = body as { commands: DecisionCommandDto[] };
      sent.push(b.commands);
      return dto("d1", 2, { assumptions: [{ id: "srv-p", statement: "Equipe disponível", importance: "ALTO", validationStatus: "NAO_VALIDADA", origin: "HUMANO" }] });
    });
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    const base = repo.get("d1")!;
    const next = { ...base, decision: { ...base.decision, objective: "mudou" }, assumptions: [{ id: "p-local", statement: "Equipe disponível", importance: "ALTO" as const, validationStatus: "NAO_VALIDADA" as const, origin: "HUMANO" as const }] };
    repo.save(next);
    await repo.settled();
    expect(sent[0]).toEqual([{ type: "PUT_ASSUMPTION", ref: "p-local", assumption: { statement: "Equipe disponível", importance: "ALTO", validationStatus: "NAO_VALIDADA" } }]);
    expect(repo.lastError()).toBeInstanceOf(DecisionApiLimitError);
    expect((repo.lastError() as DecisionApiLimitError).limits).toEqual(["decision.fields"]);
    expect(repo.get("d1")!.assumptions[0].id).toBe("srv-p");
    // a cópia antiga com o id local não recria a premissa
    repo.save({ ...repo.get("d1")!, assumptions: next.assumptions });
    await repo.settled();
    expect(sent).toHaveLength(1);
  });

  it("criação com projeto do servidor manda projectId; confirmedId devolve o id definitivo; open busca pelo id", async () => {
    const { transport, calls } = fakeTransport((method, path) => {
      if (method === "GET" && path.startsWith("/api/decisions?targetType=")) return [dto("d-linked", 1, { workLinks: [{ id: "w", targetType: "TAREFA", targetId: TASK, createdByUserId: ME, createdAt: NOW.toISOString() }] })];
      if (method === "GET" && path === "/api/decisions/d-old-uuid") throw new ApiError(404, "NAO_ENCONTRADO", "x");
      if (method === "GET" && path.startsWith("/api/decisions/")) return dto(path.split("/").pop()!, 1);
      if (method === "GET") return [];
      return dto("d-srv", 0, { decision: { ...dto("d-srv", 0).decision, projectId: PROJECT } });
    });
    const repo = createHttpRepository({ userId: ME, transport });
    repo.subscribe(() => {});
    await repo.settled();
    const local = repo.create({ question: "Aprovar a saída da fase do projeto?", complexity: "PADRAO", impact: "ALTO", ownerUserId: ME, projectId: PROJECT }, NOW);
    expect(await repo.confirmedId!(local.decision.id)).toBe("d-srv");
    expect(calls.find((c) => c.method === "POST")!.body).toMatchObject({ projectId: PROJECT });
    // projeto do laboratório não vai para o servidor
    repo.create({ question: "Aprovar a saída da fase do projeto?", complexity: "PADRAO", impact: "ALTO", ownerUserId: ME, projectId: "decia-v1" }, NOW);
    await repo.settled();
    expect(calls.filter((c) => c.method === "POST")[1].body).not.toHaveProperty("projectId");

    await repo.linkedTo!("TAREFA", TASK);
    expect(repo.get("d-linked")).toBeDefined();
    const id = "44444444-4444-4444-8444-444444444444";
    const pending = repo.open!(id);
    expect(repo.isFetching(id)).toBe(true);
    await pending;
    expect(repo.isFetching(id)).toBe(false);
    expect(repo.get(id)?.decision.id).toBe(id);
  });
});
