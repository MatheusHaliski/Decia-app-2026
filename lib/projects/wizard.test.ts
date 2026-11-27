import { describe, expect, it } from "vitest";
import { applyCommand } from "./commands";
import { computeMetrics } from "./metrics";
import { budgetTotals, emptyWizard, isSmart, newDeliverable, smartParts, sprintCalendar, validateStep, validateWizard, wizardFromProject, wizardToProject, type ProjectWizardInput } from "./wizard";
import { buildDemoProject } from "./fixtures";

const NOW = new Date("2026-11-12T12:00:00Z");
const ACTOR = "u-pessoa";

function filled(): ProjectWizardInput {
  let w = emptyWizard({ today: "2026-11-12", actorId: ACTOR });
  w = { ...w, title: "Portal da transparência", area: "ADMINISTRACAO", description: "Publicar dados de contratos", originRef: "Ofício 12/2026" };
  w.objectives = [{ id: "o", text: "Publicar 100% dos contratos vigentes", indicator: "% de contratos publicados", target: "100%", deadline: "2027-06-30", goalCode: "OE-03" }];
  w.justification = ["Exigência da LAI"];
  w.scopeIn = ["Contratos vigentes"];
  w.scopeOut = ["Convênios"];
  w.successCriteria = ["Portal no ar"];
  const d1 = newDeliverable(w, "Painel de contratos");
  w = { ...w, deliverables: [d1.deliverable], raci: d1.raci };
  w.deliverables[0]!.format = { family: "DADOS", variant: "CSV", details: { delimiter: "SEMICOLON" } };
  w.stakeholders = [{ id: "s", name: "Controle interno", role: "Auditoria", power: 4, interest: 2 }];
  w.sponsorId = "u-ana";
  w.team = [{ id: "m", userId: "u-carla", role: "EQUIPE" }];
  w.milestones = [{ id: "mm", title: "Aprovação do comitê", date: "2026-12-10" }];
  w.endDate = "2027-06-30";
  w.budgetLines = [{ id: "b", title: "Desenvolvimento", amount: "10.000,00", spend: "GROW" }];
  w.contingency = "2000";
  w.management = "500";
  w.risks = [{ id: "k", title: "Atraso na base de dados", kind: "AMEACA", probability: "30", impact: "5000", impactLevel: 3, response: "MITIGAR", ownerId: "u-carla" }];
  w.goals = [{ id: "g", code: "OE-03", text: "Transparência", source: "PEI" }];
  w.approach = "AGIL";
  w.sprintCount = "3";
  return w;
}

describe("validação por passo", () => {
  it("vazio: cada passo aponta o que falta, com chaves por linha", () => {
    const w = emptyWizard({ today: "2026-11-12", actorId: ACTOR });
    expect(validateStep("ident", w)).toEqual({ title: "projectForm.err.title" });
    expect(Object.keys(validateStep("charter", w))).toEqual(["objectives.0.text", "justification", "scopeIn", "deliverables", "successCriteria"]);
    expect(validateStep("stakeholders", w)).toEqual({ stakeholders: "projectForm.err.stakeholders" });
    expect(validateStep("team", w)).toEqual({ sponsorId: "projectForm.err.sponsor" });
    expect(validateStep("review", w)).toEqual({});
  });

  it("RACI: um único A e ao menos um R por entrega", () => {
    const w = filled();
    expect(validateStep("team", w)).toEqual({});
    const id = w.deliverables[0]!.id;
    expect(validateStep("team", { ...w, raci: { [id]: { [ACTOR]: ["A"], "u-ana": ["A"] } } })).toEqual({ "raci.0": "projectForm.err.raciManyA" });
    expect(validateStep("team", { ...w, raci: { [id]: { [ACTOR]: ["A"] } } })).toEqual({ "raci.0": "projectForm.err.raciNoR" });
    expect(validateStep("team", { ...w, raci: { [id]: {} } })).toEqual({ "raci.0": "projectForm.err.raciNoA" });
  });

  it("cronograma, orçamento, riscos e acesso", () => {
    const w = filled();
    expect(validateStep("schedule", { ...w, endDate: "2026-11-01" }).endDate).toBe("projectForm.err.endBeforeStart");
    expect(validateStep("schedule", { ...w, milestones: [{ id: "x", title: "", date: "2028-01-01" }] })).toMatchObject({ "milestones.0.title": "projectForm.err.milestoneTitle", "milestones.0.date": "projectForm.err.outOfRange" });
    expect(validateStep("budget", { ...w, contingency: "-1" }).contingency).toBe("projectForm.err.amount");
    expect(validateStep("risks", { ...w, risks: [{ ...w.risks[0]!, probability: "130" }] })["risks.0.probability"]).toBe("projectForm.err.probability");
    expect(validateStep("governance", { ...w, accessClass: "SIGILOSO" }).accessReason).toBe("projectForm.err.accessReason");
    expect(validateStep("governance", { ...w, accessClass: "RESTRITO", visibility: "PUBLICA" }).visibility).toBe("projectForm.err.visibilityPublic");
    expect(validateStep("charter", { ...w, scopeOut: ["contratos vigentes"] }).scopeOut).toBe("projectForm.err.scopeConflict");
    expect(validateWizard(w)).toEqual({});
  });

  it("SMART, sprints e totais do orçamento", () => {
    const w = filled();
    expect(isSmart(w.objectives[0]!)).toBe(true);
    expect(smartParts({ ...w.objectives[0]!, goalCode: "" }).R).toBe(false);
    expect(sprintCalendar(w)).toEqual([
      { number: 1, start: "2026-11-12", end: "2026-11-25" }, { number: 2, start: "2026-11-26", end: "2026-12-09" }, { number: 3, start: "2026-12-10", end: "2026-12-23" },
    ]);
    expect(sprintCalendar({ ...w, approach: "PREDITIVO" })).toEqual([]);
    expect(budgetTotals(w)).toEqual({ lines: 10000, contingency: 2000, management: 500, baseline: 12000, total: 12500, threatsEmv: 1500 });
  });
});

describe("montagem do ProjectModel", () => {
  it("gera TAP, EAP com formato, atividades com RACI, marcos, riscos, orçamento, sprints, governança e acesso", () => {
    const p = wizardToProject(filled(), { id: "p-novo", actorId: ACTOR, now: NOW });
    expect(p).toMatchObject({
      id: "p-novo", title: "Portal da transparência", area: "ADMINISTRACAO", approach: "AGIL", description: "Publicar dados de contratos", targetEndDate: "2027-06-30",
      access: { accessClass: "INTERNO", visibility: "DEPARTAMENTO" }, origin: { kind: "CRIAR_PROJETO", ref: "Ofício 12/2026" }, version: 1,
      versions: [{ number: 1, key: "projectCreated" }], currentSprint: 1,
    });
    expect(p.charter).toMatchObject({ justification: ["Exigência da LAI"], scopeIn: ["Contratos vigentes"], scopeOut: ["Convênios"], successCriteria: ["Portal no ar"], summaryBudget: 12500, sponsorId: "u-ana", managerId: ACTOR });
    expect(p.charter.objectives[0]).toMatchObject({ smart: true, goalId: "g1", indicator: "% de contratos publicados" });
    expect(p.wbs[1]).toMatchObject({ id: "w1", parentId: "w0", title: "Painel de contratos", format: { family: "DADOS", variant: "CSV", details: { delimiter: "SEMICOLON" } } });
    expect(p.tasks.map((t) => [t.code, t.title, t.milestone ?? false])).toEqual([["T01", "Painel de contratos", false], ["T02", "Aprovação do comitê", true]]);
    expect(p.raci).toEqual([{ taskId: "t1", userId: ACTOR, letters: ["R", "A"] }]);
    expect(p.team).toEqual([{ userId: "u-ana", role: "PATROCINADOR" }, { userId: ACTOR, role: "GERENTE" }, { userId: "u-carla", role: "EQUIPE" }]);
    expect(p.risks[0]).toMatchObject({ probability: 0.3, impact: 5000, response: "MITIGAR", status: "ABERTO" });
    expect(p.reserves).toEqual({ contingency: 2000, management: 500 });
    expect(p.sprints).toHaveLength(3);
    expect(p.governance.iso38500).toEqual({});
    // o motor da Mesa calcula sobre o projeto novo sem erro
    expect(() => computeMetrics(p)).not.toThrow();
  });

  it("formato de entrega/atividade é versionado pelos comandos existentes e validado pelo catálogo", () => {
    const p = wizardToProject(filled(), { id: "p-novo", actorId: ACTOR, now: NOW });
    const ctx = { actorId: ACTOR, now: NOW };
    const r = applyCommand(p, { type: "TASK_UPDATE", id: "t1", patch: { format: { family: "PLANILHA", variant: "XLSX", details: { formulas: "true", bogus: "x" } } } }, ctx);
    expect(r.ok && r.model.tasks[0]!.format).toEqual({ family: "PLANILHA", variant: "XLSX", details: { formulas: "true" } });
    expect(r.ok && r.model.version).toBe(2);
    const bad = applyCommand(p, { type: "WBS_UPDATE", id: "w1", patch: { format: { family: "MARTE" as never } } }, ctx);
    expect(bad).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
    const cleared = applyCommand(p, { type: "WBS_UPDATE", id: "w1", patch: { format: undefined } }, ctx);
    expect(cleared.ok && cleared.model.wbs[1]!.format).toBeUndefined();
  });

  it("começar de um modelo: o assistente vem preenchido com o conteúdo do modelo", () => {
    const w = wizardFromProject(buildDemoProject(), { today: "2026-11-12", actorId: ACTOR });
    expect(w.title).toBe("Plataforma DECIA v1.0");
    expect(w.deliverables.map((d) => d.title)).toEqual(["Módulo de decisões", "Documentação de gerenciamento", "Implantação"]);
    expect(w.stakeholders).toHaveLength(5);
    expect(w.objectives[0]!.goalCode).toBe("OE-03");
    expect(validateStep("team", { ...w, sponsorId: "u-ana" })).toEqual({});
  });
});
