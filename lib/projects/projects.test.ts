/**
 * Mesa de Trabalho (RF22): o canvas é conectado — cada edição nele muda as outras áreas (quadro, linha do tempo, EAP,
 * rastreabilidade, riscos) — e o feedback encontra os problemas plantados no projeto de demonstração.
 */
import { describe, expect, it } from "vitest";
import { createMemoryRepository } from "@/lib/decia/repository";
import type { DecisionAggregate } from "@/lib/decia/types";
import { ITEM_SIZE, makeRef, phaseZones, pmcZones } from "./canvas";
import { applyCommand, type ProjectCommand } from "./commands";
import { canvasZones } from "./derive";
import { gateOutcomeOf, openChangeDecision, openGateDecision, openSelectionDecision, syncFromDecia } from "./decia";
import { buildDemoProject } from "./fixtures";
import { computeMetrics, evaluateGate } from "./metrics";
import type { ProjectModel } from "./types";
import { boardView, canvasView, evmView, timelineView, traceabilityView, wbsView } from "./views";

const ctx = { actorId: "u-pessoa", now: new Date("2026-11-10T12:00:00Z") };
function run(model: ProjectModel, ...cmds: ProjectCommand[]): ProjectModel {
  return cmds.reduce((m, c) => {
    const r = applyCommand(m, c, ctx);
    if (!r.ok) throw new Error(`${c.type}: ${r.error} ${r.detail ?? ""}`);
    return r.model;
  }, model);
}
/** Canto superior esquerdo para que o CENTRO do item caia no centro da zona. */
function dropAt(model: ProjectModel, kind: keyof typeof ITEM_SIZE, zone: (z: ReturnType<typeof canvasZones>["zones"][number]) => boolean) {
  const z = canvasZones(model).zones.find(zone)!;
  return { x: z.rect.x + z.rect.w / 2 - ITEM_SIZE[kind].w / 2, y: z.rect.y + z.rect.h / 2 - ITEM_SIZE[kind].h / 2 };
}

describe("projeto de demonstração = números das aulas", () => {
  const p = buildDemoProject();

  it("caminho crítico de 14 dias: Termo → Arquitetura → portão → Desenvolvimento → Implantação; folga 2 na análise e 1 no plano", () => {
    const tl = timelineView(p);
    expect(tl.ok).toBe(true);
    expect(tl.finish).toBe(14);
    expect(tl.criticalPath).toEqual(["tA", "tB", "tM", "tD", "tE"]);
    const row = (id: string) => tl.rows.find((r) => r.task.id === id)!;
    expect(row("tC").totalFloat).toBe(2);
    expect(row("tP").totalFloat).toBe(1);
    expect(row("tD").duration).toBe(5); // PERT 3/5/7 ⇒ TE 5
    expect(tl.finishDate).toBe("2026-11-16");
  });

  it("valor agregado na data de status (dia 8) pela linha de base", () => {
    const e = evmView(p);
    expect(e.usesBaseline).toBe(true);
    expect(e).toMatchObject({ pv: 29_000, ev: 16_000, ac: 17_900, bac: 50_000, cost: "ACIMA_DO_ORCAMENTO", schedule: "ATRASADO" });
    expect(e.cpi).toBeCloseTo(0.8939, 3);
    expect(e.spi).toBeCloseTo(0.5517, 3);
  });

  it("o feedback encontra cada problema plantado", () => {
    const m = computeMetrics(p);
    const byId = Object.fromEntries([...m.quality, ...m.governance, ...m.group].map((x) => [x.id, x]));
    expect(byId.Q_RACI!.vars).toMatchObject({ n: 3, total: 7 }); // T04 sem A, T06 com dois A, T08 (scope creep) sem RACI
    expect(byId.Q_EAP_SUBSTANTIVOS!.status).toBe("ATENCAO"); // "Testar integração"
    expect(byId.Q_SCOPE_CREEP).toMatchObject({ status: "CRITICO", vars: { n: 1, codes: "T08" } });
    expect(byId.Q_RESERVA!.vars).toMatchObject({ reserve: 15_000, exposure: 21_000 });
    expect(byId.G_DECISOES_PORTAO).toMatchObject({ value: "0/2" });
    expect(byId.G_ACORDOS_SERVICO!.status).toBe("CRITICO"); // OLA 4 h = SLA 4 h
    expect(byId.Q_RASTREABILIDADE!.vars).toMatchObject({ coverage: 33, untraced: 1, untested: 2 });
    expect(byId.W_QUATRO_OLHOS!.value).toBe("1/2"); // T02 revisado pelo próprio responsável
    expect(byId.G_TAP_PATROCINADOR!.status).toBe("OK");
    expect(m.findings[0]!.severity).toBe("CRITICO");
    expect(m.findings.map((f) => f.metricId)).toEqual(expect.arrayContaining(["Q_SCOPE_CREEP", "Q_RACI", "G_ACORDOS_SERVICO"]));
  });

  it("portão da fase atual (elaboração) com critérios verificáveis", () => {
    expect(evaluateGate(p, "ELABORACAO")).toEqual([{ id: "RASTREABILIDADE_COMPLETA", ok: false }, { id: "SEM_GOLD_PLATING", ok: false }]);
    expect(evaluateGate(p, "DEMANDA").every((c) => c.ok)).toBe(true);
  });
});

describe("canvas conectado: editar no canvas muda as outras áreas", () => {
  it("soltar o cartão numa faixa de fase muda a coluna do quadro e gera versão", () => {
    const p = buildDemoProject();
    const at = dropAt(p, "TASK", (z) => z.kind === "PHASE" && z.phase === "EXECUCAO");
    const before = boardView(p).columns.find((c) => c.id === "ANALISE")!.count;
    const r = applyCommand(p, { type: "CANVAS_MOVE", ref: makeRef("TASK", "tC"), ...at }, ctx);
    expect(r.ok && r.structural).toBe(true);
    if (!r.ok) return;
    expect(r.model.tasks.find((t) => t.id === "tC")!.phase).toBe("EXECUCAO");
    expect(boardView(r.model).columns.find((c) => c.id === "ANALISE")!.count).toBe(before - 1);
    expect(r.model.versions.at(-1)).toMatchObject({ key: "taskPhase", vars: { code: "T04", phase: "EXECUCAO" } });
  });

  it("só reposicionar dentro da mesma fase não é estrutural", () => {
    const p = buildDemoProject();
    const at = dropAt(p, "TASK", (z) => z.kind === "PHASE" && z.phase === "ANALISE");
    const r = applyCommand(p, { type: "CANVAS_MOVE", ref: makeRef("TASK", "tC"), ...at }, ctx);
    expect(r.ok && r.structural).toBe(false);
    expect(r.ok && r.model.version).toBe(p.version);
  });

  it("ligar dois cartões cria dependência (CPM) e recusa ciclo", () => {
    const p = buildDemoProject();
    const r = applyCommand(p, { type: "CANVAS_CONNECT", from: makeRef("TASK", "tX"), to: makeRef("TASK", "tE") }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dep = r.model.dependencies.at(-1)!;
    expect(dep).toMatchObject({ from: "tX", to: "tE", type: "FS" });
    const slowed = run(r.model, { type: "DEP_UPDATE", id: dep.id, depType: "FS", lagDays: 20 });
    expect(timelineView(slowed).finish).toBe(23); // T08 (1 dia) + 20 de defasagem + T07 (2 dias)
    expect(timelineView(slowed).criticalPath).toEqual(["tX", "tE"]);
    expect(applyCommand(p, { type: "CANVAS_CONNECT", from: makeRef("TASK", "tE"), to: makeRef("TASK", "tA") }, ctx)).toMatchObject({ ok: false, error: "CICLO" });
  });

  it("post-it solto no bloco Requisitos vira requisito na matriz de rastreabilidade", () => {
    const p = run(buildDemoProject(), { type: "CANVAS_CREATE", x: 2000, y: 3000, text: "Notificar participantes por e-mail" });
    const note = p.canvas.notes.at(-1)!;
    expect(p.version).toBe(buildDemoProject().version); // post-it livre não é estrutural
    const at = dropAt(p, "NOTE", (z) => z.kind === "PMC" && z.block === "REQUISITOS");
    const q = run(p, { type: "CANVAS_MOVE", ref: makeRef("NOTE", note.id), ...at });
    expect(q.canvas.notes.some((n) => n.id === note.id)).toBe(false);
    const req = q.requirements.at(-1)!;
    expect(req).toMatchObject({ code: "RF-04", text: "Notificar participantes por e-mail" });
    expect(traceabilityView(q).rows).toHaveLength(4);
    expect(q.versions.at(-1)).toMatchObject({ key: "noteConverted", vars: { target: "REQUISITOS" } });
    expect(canvasView(q).items.some((i) => i.ref === makeRef("REQ", req.id))).toBe(true);
  });

  it("post-it em Riscos vira risco com VME; em Grupo de entregas vira entrega da EAP; numa faixa vira atividade", () => {
    let p = run(buildDemoProject(), { type: "CANVAS_CREATE", x: 2000, y: 3000, text: "Indisponibilidade do gov.br" });
    p = run(p, { type: "CANVAS_MOVE", ref: makeRef("NOTE", p.canvas.notes.at(-1)!.id), ...dropAt(p, "NOTE", (z) => z.kind === "PMC" && z.block === "RISCOS") });
    expect(p.risks.at(-1)).toMatchObject({ title: "Indisponibilidade do gov.br", kind: "AMEACA", probability: 0.3 });
    const zone = pmcZones().find((z) => z.kind === "PMC" && z.block === "ENTREGAS")!;
    p = run(p, { type: "CANVAS_CREATE", x: zone.rect.x + 30, y: zone.rect.y + 30, text: "Manual do usuário" });
    expect(wbsView(p).nodes.at(-1)!.node.title).toBe("Manual do usuário");
    const lane = phaseZones(600).find((z) => z.kind === "PHASE" && z.phase === "EXECUCAO")!;
    p = run(p, { type: "CANVAS_CREATE", x: lane.rect.x + 40, y: lane.rect.y + 40, text: "Migrar atas antigas" });
    expect(p.tasks.at(-1)).toMatchObject({ title: "Migrar atas antigas", phase: "EXECUCAO", addedAfterBaseline: true });
  });

  it("ligar requisito → entrega completa a rastreabilidade; entrega → atividade põe a atividade no pacote da EAP", () => {
    let p = buildDemoProject();
    p = run(p, { type: "CANVAS_CONNECT", from: makeRef("REQ", "r3"), to: makeRef("WBS", "w12") }, { type: "REQ_UPDATE", id: "r3", patch: { test: "CT-03" } }, { type: "REQ_UPDATE", id: "r2", patch: { test: "CT-02" } });
    expect(traceabilityView(p).coverage).toBe(100);
    expect(wbsView(p).issues.some((i) => i.kind === "ATIVIDADE_SEM_PACOTE" && i.taskId === "tC")).toBe(true);
    p = run(p, { type: "CANVAS_CONNECT", from: makeRef("WBS", "w11"), to: makeRef("TASK", "tC") });
    expect(wbsView(p).issues.some((i) => i.kind === "ATIVIDADE_SEM_PACOTE" && i.taskId === "tC")).toBe(false);
    expect(applyCommand(p, { type: "CANVAS_CONNECT", from: makeRef("REQ", "r1"), to: makeRef("RISK", "k1") }, ctx)).toMatchObject({ ok: false, error: "LIGACAO_INVALIDA" });
  });
});

describe("governança, mudanças e portões", () => {
  it("aprovar o portão da fase atual avança a fase; projeto arquivado recusa mudança estrutural", () => {
    const p = run(buildDemoProject(), { type: "GATE_SET", phase: "ELABORACAO", outcome: "APROVADO" });
    expect(p.currentPhase).toBe("ANALISE");
    const locked = run(p, { type: "CLOSURE_UPDATE", patch: { archived: true } });
    expect(applyCommand(locked, { type: "TASK_CREATE", title: "x", phase: "EXECUCAO" }, ctx)).toMatchObject({ ok: false, error: "PROJETO_BLOQUEADO" });
  });

  it("controle integrado de mudanças: normal passa pela análise; emergencial vai direto; implementar atualiza a linha de base", () => {
    const p = buildDemoProject();
    expect(applyCommand(p, { type: "CHANGE_SET_STATUS", id: "c1", status: "APROVADA" }, ctx)).toMatchObject({ ok: false, error: "TRANSICAO_INVALIDA" });
    let q = run(p, { type: "CHANGE_SET_STATUS", id: "c1", status: "EM_ANALISE" }, { type: "CHANGE_SET_STATUS", id: "c1", status: "APROVADA" });
    q = run(q, { type: "TASK_CREATE", title: "Módulo de relatórios", phase: "EXECUCAO", durationDays: 5, changeId: "c1" });
    expect(computeMetrics(q).quality.find((x) => x.id === "Q_SCOPE_CREEP")!.vars).toMatchObject({ n: 1 }); // só o T08 continua irregular
    const before = q.baseline!.setAt;
    q = run(q, { type: "CHANGE_SET_STATUS", id: "c1", status: "IMPLEMENTADA" });
    expect(q.baseline!.setAt).not.toBe(before);
    const e = run(p, { type: "CHANGE_REQUEST", title: "Correção de segurança", changeType: "EMERGENCIAL" });
    expect(applyCommand(e, { type: "CHANGE_SET_STATUS", id: e.changes.at(-1)!.id, status: "APROVADA" }, ctx).ok).toBe(true);
  });

  it("o portão e a mudança viram decisões do DECIA e o resultado volta para a Mesa", () => {
    const repo = createMemoryRepository([]);
    const p = buildDemoProject();
    const gate = openGateDecision(repo, p, "ELABORACAO", "Elaboração", "u-pessoa", ctx.now);
    let q = run(p, ...gate.commands);
    const agg = repo.get(gate.decisionId)!;
    expect(agg.decision.projectId).toBe(p.id);
    expect(agg.alternatives.map((a) => a.label)).toEqual(["A", "B", "C", "D"]);
    expect(agg.criteria.length).toBe(5);
    const decided: DecisionAggregate = { ...agg, decision: { ...agg.decision, status: "DECIDIDA", selectedAlternativeId: agg.alternatives[1]!.id } };
    expect(gateOutcomeOf(decided)).toBe("APROVADO_COM_RESSALVAS");
    q = run(q, ...syncFromDecia(q, [decided]));
    expect(q.gates.find((g) => g.phase === "ELABORACAO")).toMatchObject({ outcome: "APROVADO_COM_RESSALVAS", decisionId: gate.decisionId });
    expect(q.currentPhase).toBe("ANALISE");

    const ch = openChangeDecision(repo, q, q.changes[0]!, "u-pessoa", ctx.now);
    q = run(q, ...ch.commands);
    expect(q.changes[0]).toMatchObject({ status: "EM_ANALISE", decisionId: ch.decisionId });
    const cAgg = repo.get(ch.decisionId)!;
    q = run(q, ...syncFromDecia(q, [{ ...cAgg, decision: { ...cAgg.decision, status: "DECIDIDA", selectedAlternativeId: cAgg.alternatives[0]!.id } }]));
    expect(q.changes[0]!.status).toBe("APROVADA");
    expect(computeMetrics(q).governance.find((x) => x.id === "G_DECISOES_PORTAO")!.value).toBe("1/3");
  });

  it("seleção/priorização vira decisão estratégica no DECIA, ligada ao projeto, com os critérios do modelo de seleção", () => {
    const repo = createMemoryRepository([]);
    const p = buildDemoProject();
    const sel = openSelectionDecision(repo, p, "u-pessoa", ctx.now);
    const q = run(p, ...sel.commands);
    const agg = repo.get(sel.decisionId)!;
    expect(agg.decision).toMatchObject({ projectId: p.id, ownerUserId: "u-ana" });
    expect(agg.criteria.map((c) => c.name)).toContain("Retorno financeiro (VPL)");
    expect(agg.alternatives.length).toBe(3);
    expect(agg.workLinks.some((w) => w.targetType === "PROJETO" && w.targetId === p.id)).toBe(true);
    expect(q.decisionIds).toEqual([sel.decisionId]);
  });
});
