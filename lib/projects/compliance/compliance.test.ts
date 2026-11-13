/**
 * Espelho de Conformidade (RF32): regras determinísticas que conferem a estrutura do projeto com os checklists — ATENDIDO (com o
 * que atende), PARCIAL (fase errada, sem responsável, só mencionado), FALTANDO e NÃO SE APLICA (com o motivo) —, placar por fonte
 * e por fase, sugestão da tarefa faltante pelo comando existente e o portão da Aprovação com a justificativa do chefe.
 */
import { describe, expect, it } from "vitest";
import { applyCommand, type CommandResult, type ProjectCommand } from "../commands";
import { buildDemoProject } from "../fixtures";
import type { ProjectModel, Task } from "../types";
import { CATALOG_VERSION, defaultChecklists, departmentSeed, FEDERAL_CHECKLISTS } from "./catalog";
import { approvalGate, evaluateMirror, mirrorSummary, projectSignals } from "./evaluate";
import { complianceContext, createMemoryComplianceRepository, nextDepartmentCode } from "./store";
import { createSuggestedTasks, moveCommand, planSuggestion, suggestionCommand, taskTitle } from "./suggest";
import { hasKeyword, normalizeText, parseKeywords } from "./text";
import type { ComplianceChecklist, ItemResult } from "./types";

const ctx = { actorId: "u-pessoa", now: new Date("2026-11-12T12:00:00Z") };
const byCode = (items: readonly ItemResult[], code: string) => items.find((r) => r.item.code === code)!;

/** Projeto mínimo de outra área: sem contratação, sem dado pessoal, sem sistema, sem obra. */
function minimal(tasks: Task[] = []): ProjectModel {
  return {
    id: "p-min", title: "Campanha interna de boas práticas", startDate: "2026-03-02", statusDate: "2026-03-02", approach: "PREDITIVO", area: "MARKETING",
    boardModel: "INSTITUCIONAL", currentPhase: "DEMANDA", team: [],
    charter: { justification: [], objectives: [], product: "", highLevelRequirements: [], premises: [], constraints: [], highLevelRisks: [], teamRoles: [], milestones: [], summaryBudget: 0 },
    businessCase: { rate: 0.1, cashflows: [], benefits: [] }, stakeholders: [], requirements: [], wbs: [], tasks, dependencies: [], raci: [], risks: [], changes: [],
    lessons: [], gates: [], budgetLines: [], reserves: { contingency: 0, management: 0 },
    governance: { goals: [], spend: "GROW", orgStructure: "FUNCIONAL", iso38500: {} },
    closure: { acceptance: false, contractsClosed: false, resourcesReleased: false, finalReport: false, archived: false },
    canvas: { positions: {}, notes: [] }, decisionIds: [], versions: [], version: 1,
  };
}
const task = (id: string, title: string, phase: Task["phase"], extra: Partial<Task> = {}): Task => ({
  id, code: id.toUpperCase(), title, phase, status: "A_FAZER", durationDays: 1, percentComplete: 0, budget: 0, actualCost: 0, createdBy: "u1", ...extra,
});

describe("texto: palavra inteira, sem acento, prefixo com *", () => {
  it("normaliza e casa", () => {
    expect(normalizeText("Análise de Riscos e LGPD!")).toBe("analise de riscos e lgpd");
    expect(hasKeyword(normalizeText("Atraso na contratação"), "contrat*")).toBe(true);
    expect(hasKeyword(normalizeText("Elaborar o TR"), "tr")).toBe(true);
    expect(hasKeyword(normalizeText("Trabalho de campo"), "tr")).toBe(false);
    expect(hasKeyword(normalizeText("Estudo técnico preliminar"), "estudo tecnico preliminar")).toBe(true);
    expect(parseKeywords("ETP, estudo técnico; etp\n termo*")).toEqual(["ETP", "estudo técnico", "termo*"]);
  });
});

describe("catálogo versionado", () => {
  it("cada item tem id, código, base legal, fase, tipo de projeto e regra; ids e códigos únicos", () => {
    const items = defaultChecklists().flatMap((c) => c.items);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.code)).size).toBe(items.length);
    for (const i of items) {
      expect(i.basis ?? i.basisKey).toBeTruthy();
      expect(i.titleKey ?? i.title).toBeTruthy();
      expect(i.phase).toBeTruthy();
      expect(i.rule.kind).toBeTruthy();
    }
    // federais citam norma com número e ano
    for (const c of FEDERAL_CHECKLISTS) for (const i of c.items) expect(i.basis).toMatch(/(Lei|Decreto|NBR) [\d.]+(\/|:)\d{4}|eMAG/);
    expect(CATALOG_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("diretrizes estaduais e municipais são exemplos marcados", () => {
    const sources = defaultChecklists().map((c) => [c.source, c.example]);
    expect(sources).toEqual(expect.arrayContaining([["ESTADUAL", true], ["MUNICIPAL", true], ["FEDERAL", false], ["DEPARTAMENTO", false]]));
  });
});

describe("projeto DEMO no Espelho", () => {
  const r = evaluateMirror(buildDemoProject());

  it("sinais com evidência: contratação (fornecedor de nuvem), dados pessoais (LGPD, login), sistema; sem dado sensível nem obra", () => {
    expect(r.signals.CONTRATACAO.on).toBe(true);
    expect(r.signals.CONTRATACAO.evidence.map((e) => e.label)).toEqual(expect.arrayContaining(["Fornecedor de nuvem", "Atraso na contratação de nuvem"]));
    expect(r.signals.DADOS_PESSOAIS.on).toBe(true);
    expect(r.signals.SISTEMA_DIGITAL.evidence[0]).toMatchObject({ kind: "AREA", label: "SOFTWARE" });
    expect(r.signals.DADOS_SENSIVEIS.on).toBe(false);
    expect(r.signals.OBRA_OU_ESPACO.on).toBe(false);
  });

  it("atendido mostra o que atende", () => {
    expect(byCode(r.items, "LGPD-BASE")).toMatchObject({ status: "ATENDIDO", evidence: [{ kind: "TASK", code: "T04", phase: "ANALISE", inPhase: true, responsibleId: "u-diego" }] });
    expect(byCode(r.items, "14133-RISCOS").evidence[0]).toMatchObject({ kind: "RISK", label: "Atraso na contratação de nuvem" });
    expect(byCode(r.items, "14133-RECEB")).toMatchObject({ status: "ATENDIDO", evidence: [{ code: "T07" }] });
  });

  it("faltando bloqueia quando obrigatório; parcial diz o que falta; não se aplica diz o porquê", () => {
    expect(byCode(r.items, "14133-ETP")).toMatchObject({ status: "FALTANDO", blocking: true, canSuggest: true, reason: { code: "FALTANDO" } });
    expect(byCode(r.items, "LGPD-DPO")).toMatchObject({ status: "FALTANDO", blocking: false });
    expect(byCode(r.items, "LGPD-SEG")).toMatchObject({ status: "PARCIAL", reason: { code: "SO_MENCAO" }, evidence: [{ kind: "REQ", code: "RF-03" }], canSuggest: true });
    expect(byCode(r.items, "UF-PDTIC")).toMatchObject({ status: "PARCIAL", reason: { code: "META_SEM_LIGACAO", vars: { code: "ND-07" } }, canSuggest: false });
    expect(byCode(r.items, "DEP-2")).toMatchObject({ status: "FALTANDO", reason: { code: "PORTOES_SEM_DECISAO", vars: { total: 2 } }, blocking: true });
    expect(byCode(r.items, "DEP-4")).toMatchObject({ status: "PARCIAL", reason: { code: "REVISAO_PARCIAL", vars: { reviewed: 1, done: 2 } } });
    expect(byCode(r.items, "LGPD-RIPD")).toMatchObject({ status: "NAO_SE_APLICA", reason: { code: "NA_SINAL", vars: { signal: "DADOS_SENSIVEIS" } } });
    expect(byCode(r.items, "NBR9050").status).toBe("NAO_SE_APLICA");
  });

  it("placar geral, por fonte e por fase", () => {
    expect(r.score).toEqual({ applicable: 20, met: 4, partial: 6, missing: 10, notApplicable: 3, percent: 20 });
    expect(r.bySource.FEDERAL).toMatchObject({ applicable: 13, met: 3, percent: 23 });
    expect(r.bySource.MUNICIPAL).toMatchObject({ applicable: 1, met: 1, notApplicable: 1, percent: 100 });
    expect(r.bySource.DEPARTAMENTO).toMatchObject({ applicable: 4, met: 0, partial: 3 });
    expect(r.byPhase.ELABORACAO.applicable).toBeGreaterThan(0);
    const phaseTotal = Object.values(r.byPhase).reduce((s, x) => s + x.applicable + x.notApplicable, 0);
    expect(phaseTotal).toBe(r.items.length);
    expect(r.blocking.map((x) => x.item.code)).toEqual(["14133-ETP", "14133-TR", "14133-PRECOS", "14133-JURIDICO", "14133-FISCAL", "LBI-SISTEMAS", "UF-TIC", "DEP-2"]);
  });

  it("mirrorSummary: leitura compacta para o Feedback da Mesa, sem tela", () => {
    const s = mirrorSummary(buildDemoProject());
    expect(s).toMatchObject({ catalogVersion: CATALOG_VERSION, percent: 20, met: 4, applicable: 20, gate: "BLOQUEADO" });
    expect(s.blocking).toHaveLength(8);
    expect(s.bySource.FEDERAL).toEqual({ percent: 23, applicable: 13, met: 3 });
  });
});

describe("projeto mínimo: quase nada se aplica, e o motivo aparece", () => {
  it("sem contratação, dado pessoal, sistema ou obra, só valem a LAI e o departamento", () => {
    const r = evaluateMirror(minimal());
    const applicable = r.items.filter((x) => x.status !== "NAO_SE_APLICA").map((x) => x.item.code);
    expect(applicable).toEqual(["LAI-TRANSP", "UF-PDTIC", "DEP-1", "DEP-3"]);
    expect(byCode(r.items, "14133-ETP").reason).toEqual({ code: "NA_SINAL", vars: { signal: "CONTRATACAO" } });
    expect(byCode(r.items, "DEP-2").reason.code).toBe("PORTOES_NENHUM");
    expect(byCode(r.items, "DEP-4").reason.code).toBe("REVISAO_SEM_ENTREGAS");
    expect(r.score).toMatchObject({ applicable: 4, met: 0, percent: 0 });
  });

  it("contratação declarada na necessidade liga a Lei 14.133", () => {
    const p = { ...minimal(), governance: { ...minimal().governance, need: "CONTRATACAO" as const } };
    expect(projectSignals(p).CONTRATACAO).toMatchObject({ on: true, evidence: [{ kind: "NEED" }] });
    expect(byCode(evaluateMirror(p).items, "14133-ETP").status).toBe("FALTANDO");
  });

  it("atividade com a palavra: na fase e com responsável atende; sem responsável ou na fase errada é parcial", () => {
    const p = { ...minimal(), governance: { ...minimal().governance, need: "CONTRATACAO" as const } };
    const etp = (t: Task) => byCode(evaluateMirror({ ...p, tasks: [t] }).items, "14133-ETP");
    expect(etp(task("t1", "Estudo técnico preliminar", "ELABORACAO", { responsibleId: "u1" }))).toMatchObject({ status: "ATENDIDO" });
    expect(etp(task("t1", "Elaborar o ETP", "PLANEJAMENTO", { responsibleId: "u1" })).status).toBe("ATENDIDO");
    expect(etp(task("t1", "Elaborar o ETP", "ELABORACAO"))).toMatchObject({ status: "PARCIAL", reason: { code: "SEM_RESPONSAVEL", vars: { code: "T1" } }, blocking: false });
    const wrong = etp(task("t1", "Elaborar o ETP", "EXECUCAO", { responsibleId: "u1" }));
    expect(wrong).toMatchObject({ status: "PARCIAL", reason: { code: "FASE_ERRADA", vars: { phase: "EXECUCAO", phases: "PLANEJAMENTO,ELABORACAO" } }, moveTaskId: "t1" });
    expect(moveCommand(wrong)).toEqual({ type: "TASK_MOVE_PHASE", id: "t1", phase: "ELABORACAO" });
  });

  it("marcar como não se aplica exige justificativa e tira o item do bloqueio", () => {
    const p = { ...minimal(), governance: { ...minimal().governance, need: "CONTRATACAO" as const } };
    const waiver = { itemId: "L14133_ETP", reason: "Adesão a ata de registro de preços já instruída", by: "u-pessoa", at: ctx.now.toISOString() };
    const r = evaluateMirror(p, { waivers: { L14133_ETP: waiver } });
    expect(byCode(r.items, "14133-ETP")).toMatchObject({ status: "NAO_SE_APLICA", blocking: false, reason: { code: "NA_MARCADO", vars: { reason: waiver.reason } }, waiver });
    expect(r.blocking.map((x) => x.item.code)).not.toContain("14133-ETP");
  });
});

describe("sugerir tarefa: o comando existente, na fase certa, com a referência ao item", () => {
  it("gera TASK_CREATE com o código entre colchetes e a duração do catálogo", () => {
    const etp = byCode(evaluateMirror(buildDemoProject()).items, "14133-ETP");
    const plan = planSuggestion(etp, "Elaborar o estudo técnico preliminar (ETP)", "u-pessoa")!;
    expect(plan).toEqual({ itemId: "L14133_ETP", code: "14133-ETP", title: "Elaborar o estudo técnico preliminar (ETP) [14133-ETP]", phase: "ELABORACAO", durationDays: 3, milestone: false, responsibleId: "u-pessoa" });
    expect(suggestionCommand(plan)).toEqual({ type: "TASK_CREATE", title: "Elaborar o estudo técnico preliminar (ETP) [14133-ETP]", phase: "ELABORACAO", durationDays: 3 });
    expect(taskTitle("  Fazer  algo ", "X-1")).toBe("Fazer algo [X-1]");
    // atendido ou sem sugestão: nada a criar
    expect(planSuggestion(byCode(evaluateMirror(buildDemoProject()).items, "LGPD-BASE"), "x")).toBeNull();
    expect(planSuggestion(byCode(evaluateMirror(buildDemoProject()).items, "DEP-2"), "x")).toBeNull();
  });

  it("em lote pela Mesa: cria, põe o responsável, liga ao item e o item passa a atendido", () => {
    let model = buildDemoProject();
    const dispatched: ProjectCommand[] = [];
    const dispatch = (cmd: ProjectCommand): CommandResult => {
      dispatched.push(cmd);
      const r = applyCommand(model, cmd, ctx);
      if (r.ok) model = r.model;
      return r;
    };
    const before = evaluateMirror(model);
    const plans = ["14133-ETP", "LBI-SISTEMAS", "DEP-1"].map((code) => planSuggestion(byCode(before.items, code), `Tarefa ${code}`, "u-carla")!);
    const out = createSuggestedTasks(dispatch, plans);
    expect(out.failed).toEqual([]);
    expect(out.created.map((c) => c.code)).toEqual(["T09", "T10", "T11"]);
    expect(dispatched.map((c) => c.type)).toEqual(["TASK_CREATE", "TASK_UPDATE", "TASK_CREATE", "TASK_UPDATE", "TASK_CREATE", "TASK_UPDATE"]);
    const created = model.tasks.filter((t) => out.created.some((c) => c.taskId === t.id));
    expect(created.map((t) => [t.title, t.phase, t.responsibleId])).toEqual([
      ["Tarefa 14133-ETP [14133-ETP]", "ELABORACAO", "u-carla"],
      ["Tarefa LBI-SISTEMAS [LBI-SISTEMAS]", "ELABORACAO", "u-carla"],
      ["Tarefa DEP-1 [DEP-1]", "ELABORACAO", "u-carla"],
    ]);
    const links = out.created.map((c) => ({ taskId: c.taskId, itemId: c.itemId, by: ctx.actorId, at: ctx.now.toISOString() }));
    const after = evaluateMirror(model, { links });
    for (const code of ["14133-ETP", "LBI-SISTEMAS", "DEP-1"]) expect(byCode(after.items, code).status).toBe("ATENDIDO");
    expect(byCode(after.items, "14133-ETP").evidence.find((e) => e.linked)).toMatchObject({ code: "T09" });
    expect(after.score.met).toBe(before.score.met + 3);
  });

  it("item de marco cria o marco (duração 0 + marca de marco)", () => {
    const dept: ComplianceChecklist = { ...departmentSeed(), items: [{ id: "dep-m", code: "DEP-9", checklistId: "DEP_EXEMPLO", title: "Marco de homologação", basis: "Norma interna", phase: "APROVACAO", requirement: "OBRIGATORIO", appliesTo: { kind: "SEMPRE" }, rule: { kind: "MARCO", keywords: ["homologac*"], phases: ["APROVACAO"] }, suggestion: { title: "Homologação", durationDays: 0 } }] };
    let model = minimal();
    const r0 = byCode(evaluateMirror(model, { checklists: [dept] }).items, "DEP-9");
    expect(r0.status).toBe("FALTANDO");
    const out = createSuggestedTasks((cmd) => {
      const r = applyCommand(model, cmd, ctx);
      if (r.ok) model = r.model;
      return r;
    }, [planSuggestion(r0, "Homologação pelo comitê")!]);
    expect(model.tasks.find((t) => t.id === out.created[0]!.taskId)).toMatchObject({ milestone: true, durationDays: 0, phase: "APROVACAO" });
    expect(byCode(evaluateMirror(model, { checklists: [dept] }).items, "DEP-9").status).toBe("ATENDIDO");
  });
});

describe("portão da Aprovação e checklist do departamento", () => {
  it("bloqueado com obrigatórios faltando; liberado com a justificativa do chefe que cobre esses itens", () => {
    const r = evaluateMirror(buildDemoProject());
    expect(approvalGate(r)).toMatchObject({ status: "BLOQUEADO", uncovered: r.blocking.map((x) => x.item.code) });
    const override = { by: "u-chefe", reason: "Contratação por adesão a ata; ETP e TR do órgão gerenciador", at: ctx.now.toISOString(), blockingCodes: r.blocking.map((x) => x.item.code) };
    expect(approvalGate(r, override).status).toBe("LIBERADO_COM_JUSTIFICATIVA");
    // um obrigatório novo faltando não fica coberto pela justificativa antiga
    expect(approvalGate(r, { ...override, blockingCodes: override.blockingCodes.slice(1) })).toMatchObject({ status: "BLOQUEADO", uncovered: ["14133-ETP"] });
    expect(approvalGate({ blocking: [] }).status).toBe("LIBERADO");
  });

  it("o chefe cria e edita itens: a versão sobe e a verificação usa o checklist atual", () => {
    const repo = createMemoryComplianceRepository();
    const dept = repo.department();
    expect(dept.version).toBe("1");
    const code = nextDepartmentCode(dept.items);
    expect(code).toBe("DEP-5");
    repo.saveDepartmentItem({ id: "dep-x", code, checklistId: dept.id, title: "Plano de comunicação com a imprensa", basis: "Norma interna", phase: "PLANEJAMENTO", requirement: "RECOMENDADO", appliesTo: { kind: "SEMPRE" }, rule: { kind: "ARTEFATO", keywords: ["imprensa"], phases: ["PLANEJAMENTO"] }, suggestion: { title: "Planejar a comunicação com a imprensa", durationDays: 1 } });
    expect(repo.department().version).toBe("2");
    const r = evaluateMirror(buildDemoProject(), complianceContext(repo, "decia-v1"));
    expect(byCode(r.items, "DEP-5")).toMatchObject({ status: "FALTANDO", source: "DEPARTAMENTO", canSuggest: true });
    repo.removeDepartmentItem("dep-x");
    expect(repo.department().items.map((i) => i.code)).toEqual(["DEP-1", "DEP-2", "DEP-3", "DEP-4"]);
    expect(repo.department().version).toBe("3");
  });

  it("marcações e vínculos ficam por projeto", () => {
    const repo = createMemoryComplianceRepository();
    repo.waive("decia-v1", { itemId: "LGPD_ENCARREGADO", reason: "O órgão já tem encarregado nomeado em portaria", by: "u-pessoa", at: "2026-11-12" });
    repo.link("decia-v1", [{ taskId: "tC", itemId: "LGPD_BASE", by: "u-pessoa", at: "2026-11-12" }]);
    expect(repo.project("decia-v1").waivers.LGPD_ENCARREGADO?.reason).toMatch(/portaria/);
    expect(repo.project("outro")).toEqual({ waivers: {}, links: [], override: null });
    repo.unwaive("decia-v1", "LGPD_ENCARREGADO");
    expect(repo.project("decia-v1").waivers).toEqual({});
    expect(repo.project("decia-v1").links).toHaveLength(1);
  });
});
