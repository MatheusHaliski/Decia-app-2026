import { describe, expect, it } from "vitest";
import { buildDemoProject } from "@/lib/projects/fixtures";
import { buildDemoSocial } from "@/lib/social/fixtures";
import { canSeeImpediment } from "./access";
import { DEMO_PACT_IDS, buildDemoPacts } from "./fixtures";
import { impedimentsFromAcervo, impedimentsFromProject } from "./impediments";
import { distribution, pactMetrics } from "./metrics";
import { demoOrg } from "./org";
import { applyPactCommand } from "./rules";
import { DEFAULT_QUEUE_FILTER, cooperationQueue, currentDueDate, departmentLedger, isOverdue, pendingActions, unblockToday } from "./queue";

const NOW = new Date("2026-11-12T15:00:00Z");
const org = demoOrg();
const state = buildDemoPacts(NOW);
const P = DEMO_PACT_IDS;
const pact = (id: string) => state.pacts.find((p) => p.id === id)!;

describe("fila de cooperação (RF49.CA11)", () => {
  it("só pactos autorizados, com filtros de caixa, estado, prazo e unidade", () => {
    const all = cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, status: "TODOS" }, NOW, 1, 50);
    expect(all.items.map((p) => p.id)).not.toContain(P.rotas);
    expect(all.items.map((p) => p.id)).toContain(P.painel);
    const received = cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, box: "RECEBIDOS" }, NOW, 1, 50).items.map((p) => p.id);
    expect(received).toEqual([P.cronograma]);
    const sent = cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, box: "ENVIADOS" }, NOW, 1, 50).items.map((p) => p.id).sort();
    expect(sent).toEqual([P.parecer, P.planilha, P.planta].sort());
    expect(cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, due: "VENCIDOS" }, NOW, 1, 50).items.map((p) => p.id)).toEqual([P.planilha]);
    expect(cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, status: "RECUSADO" }, NOW, 1, 50).items.map((p) => p.id)).toEqual([P.vistoria]);
    expect(cooperationQueue(state, org, "u-pessoa", { ...DEFAULT_QUEUE_FILTER, departmentId: "d-ajur" }, NOW, 1, 50).items.map((p) => p.id)).toEqual([P.parecer]);
    expect(cooperationQueue(state, org, null, DEFAULT_QUEUE_FILTER, NOW).total).toBe(0);
    expect(cooperationQueue(state, org, "u-admin", { ...DEFAULT_QUEUE_FILTER, status: "TODOS" }, NOW).total).toBe(0);
  });

  it("paginação estável por prazo vigente e idade", () => {
    const f = { ...DEFAULT_QUEUE_FILTER, status: "TODOS" as const };
    const p1 = cooperationQueue(state, org, "u-secretaria", f, NOW, 1, 3);
    const p2 = cooperationQueue(state, org, "u-secretaria", f, NOW, 2, 3);
    const last = cooperationQueue(state, org, "u-secretaria", f, NOW, 99, 3);
    expect(p1.total).toBe(9);
    expect(p1.pages).toBe(3);
    expect(last.page).toBe(3);
    const ids = [...p1.items, ...p2.items, ...last.items].map((p) => p.id);
    expect(new Set(ids).size).toBe(9);
    const dues = ids.map((id) => currentDueDate(pact(id)));
    expect([...dues].sort()).toEqual(dues);
  });

  it("prazo vigente: acordado > proposto > pedido; vencido só antes da entrega", () => {
    expect(currentDueDate(pact(P.planilha))).toBe(pact(P.planilha).agreements[0]!.agreedDueDate);
    expect(isOverdue(pact(P.planilha), NOW)).toBe(true);
    expect(currentDueDate(pact(P.parecer))).toBe(pact(P.parecer).proposals.at(-1)!.commitments[0]!.dueDate);
    expect(currentDueDate(pact(P.dotacao))).toBe(pact(P.dotacao).requestedDueDate);
    expect(isOverdue(pact(P.rotas), NOW)).toBe(false);
  });
});

describe("“Quem eu posso destravar hoje?” e ações pendentes", () => {
  it("pessoa: responder ao pedido que recebeu; não aparece o que só ela pediu", () => {
    const items = unblockToday(state, org, "u-pessoa", NOW);
    expect(items.map((x) => [x.pact.id, x.actions])).toEqual([[P.cronograma, ["RESPONDER"]]]);
    expect(pendingActions(org, pact(P.parecer), "u-pessoa")).toEqual(["ACEITAR_PROPOSTA"]);
    expect(pendingActions(org, pact(P.planilha), "u-pessoa")).toEqual(["ACEITAR_RENEGOCIACAO"]);
  });

  it("chefia: aceitar pela unidade; empresa: decidir o conflito escalonado; executor: aceitar e entregar", () => {
    expect(unblockToday(state, org, "u-chefe", NOW).map((x) => [x.pact.id, x.actions])).toEqual([[P.rampas, ["ACEITAR_PROPOSTA"]]]);
    expect(unblockToday(state, org, "u-secretaria", NOW).map((x) => [x.pact.id, x.actions])).toEqual([[P.planilha, ["RESOLVER_ESCALONAMENTO"]]]);
    expect(unblockToday(state, org, "u-rui", NOW).map((x) => x.actions)).toEqual([["ACEITAR_COMO_EXECUTOR", "ENTREGAR"]]);
    expect(pendingActions(org, pact(P.painel), "u-chefe")).toEqual(["CONFIRMAR_DESBLOQUEIO"]);
  });

  it("visão da chefia: o que a unidade precisa receber e o que prometeu entregar", () => {
    const l = departmentLedger(state, org, "u-chefe", "d-cpoe", NOW);
    expect(l.toReceive.map((p) => p.id)).toEqual([P.dotacao]);
    expect(l.toDeliver.map((p) => p.id).sort()).toEqual([P.planta, P.rampas].sort());
  });

  it("o limite do exemplo bloqueia o aceite da chefia da CPOE até a exceção", () => {
    const prop = pact(P.rampas).proposals.at(-1)!.id;
    const blocked = applyPactCommand(state, { type: "ACEITAR", pactId: P.rampas, proposalId: prop, as: "DESTINATARIO" }, { actorId: "u-chefe", now: NOW, org });
    expect(blocked).toMatchObject({ ok: false, error: "LIMITE_COMPROMISSOS", info: { count: 1, limit: 1 } });
  });
});

describe("métricas agregadas (RF49.CA12)", () => {
  it("mediana e p90 pelo posto mais próximo; sem dados é nulo, não zero", () => {
    expect(distribution([])).toEqual({ n: 0, median: null, p90: null });
    expect(distribution([5])).toEqual({ n: 1, median: 5, p90: 5 });
    expect(distribution([4, 1, 3, 2])).toEqual({ n: 4, median: 2.5, p90: 4 });
    expect(distribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toMatchObject({ median: 5.5, p90: 9 });
    const none = pactMetrics([]);
    expect(none).toMatchObject({ total: 0, returnRate: null, onTime: { rate: null }, waitToCommit: { n: 0, median: null } });
  });

  it("exemplo: amostra, devoluções, renegociações, desbloqueios e casos abertos/encerrados visíveis", () => {
    const m = pactMetrics(state.pacts);
    expect(m.total).toBe(10);
    expect(m.byStatus).toMatchObject({ SOLICITADO: 2, EM_NEGOCIACAO: 2, COMPROMETIDO: 2, VALIDADO: 2, RECUSADO: 1, CANCELADO: 1 });
    expect(m.open).toBe(6);
    expect(m.waitToCommit.n).toBe(4);
    expect(m.waitToValidation).toMatchObject({ n: 2, median: 13.5, p90: 15 });
    expect(m).toMatchObject({ deliveries: 3, returns: 1, renegotiationsRequested: 1, renegotiationsAccepted: 0, unblocksConfirmed: 1, validatedWithoutUnblock: 1 });
    expect(m.returnRate).toBeCloseTo(1 / 3, 10);
    expect(m.onTime).toEqual({ eligible: 2, onTime: 2, rate: 1 });
  });
});

describe("impedimentos (Acervo, Mesa e registro manual)", () => {
  it("Acervo: tarefa BLOQUEADA com causa vira impedimento; Mesa: atividade que espera outra pessoa começar", () => {
    const social = buildDemoSocial(NOW);
    const acervo = impedimentsFromAcervo(social.tasks, org);
    expect(acervo.map((i) => [i.taskId, i.blockedBy, i.accessClass])).toEqual([["t-pessoa-protocolo", "Aguardando parecer jurídico", "RESTRITO"]]);
    const mesa = impedimentsFromProject(buildDemoProject(), org, "d-uts");
    expect(mesa.map((i) => i.title)).toEqual(["T05 Aprovação do comitê (portão)", "T07 Implantação, aceite e treinamento"]);
    expect(mesa[0]).toMatchObject({ ownerId: "u-pessoa", suggestedTarget: { kind: "PESSOA", userId: "u-diego" } });
    expect(mesa[0]!.dependents.map((d) => d.label)).toEqual(["T05 Aprovação do comitê (portão)", "T06 Desenvolvimento do módulo de decisões (Carla Exemplo)", "T07 Implantação, aceite e treinamento (Elisa Exemplo)"]);
    // pessoa de outra empresa não é sugerida como destino (escopo inicial: mesma empresa)
    expect(mesa[1]!.suggestedTarget).toBeNull();
    expect(canSeeImpediment(org, mesa[1]!, "u-pessoa")).toBe(true); // gerente do projeto acompanha
    expect(canSeeImpediment(org, mesa[1]!, "u-chefe")).toBe(false);
  });

  it("registro manual: o que trava, desde quando e quem depende (validados)", () => {
    const bad = applyPactCommand(state, { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "", blockedBy: "x", since: "2099-01-01", dependents: [" "] } }, { actorId: "u-pessoa", now: NOW, org });
    expect(bad).toMatchObject({ ok: false, error: "VALIDACAO", fields: { title: "OBRIGATORIO", blockedBy: "OBRIGATORIO", since: "DATA", dependents: "OBRIGATORIO" } });
    const ok = applyPactCommand(state, { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "Relatório de vistoria", blockedBy: "Falta o laudo da Defesa Civil", since: "2026-11-01", dependents: ["Equipe de vistoria"] } }, { actorId: "u-pessoa", now: NOW, org });
    expect(ok.ok && ok.state.impediments[0]).toMatchObject({ source: "MANUAL", ownerId: "u-pessoa", departmentId: "d-uts", since: "2026-11-01" });
    expect(applyPactCommand(state, { type: "REGISTRAR_IMPEDIMENTO", draft: { title: "x y z", blockedBy: "abc", since: "2026-11-01", dependents: ["a"] } }, { actorId: "u-secretaria", now: NOW, org })).toMatchObject({ error: "ACESSO_NEGADO" });
  });
});
