import { describe, expect, it } from "vitest";
import { TASK_STATE_TONE, TASK_TYPE_META } from "@/lib/social/view-model";
import { TASK_STATES } from "@/lib/social/types";
import { toTaskCardViewModelFromApi } from "./card";
import type { TaskView } from "./client";

const NOW = new Date("2026-10-17T12:00:00Z");
const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "44444444-4444-4444-8444-444444444444";
const ID = "22222222-2222-4222-8222-222222222222";
const view = (over: Partial<TaskView> = {}): TaskView => ({
  id: ID, version: 3, ownerId: ME, departmentId: "55555555-5555-4555-8555-555555555555", title: "Relatório de vistoria", type: "DESENHO_TECNICO",
  category: "VISTORIA_RELATORIO_FOTOGRAFICO", priority: "ALTA", state: "DISPONIVEL", dueAt: "2026-11-01", accessClass: "INTERNO", visibility: "EMPRESA",
  objective: "Registrar as condições da obra", acceptanceCriteria: [{ text: "Fotos", done: true }], editable: true, ...over,
});

describe("toTaskCardViewModelFromApi (TaskView → card de tarefa)", () => {
  it("mapeia identidade, tipo e classificação com as mesmas regras do DEMO", () => {
    const vm = toTaskCardViewModelFromApi(view(), { now: NOW });
    expect(vm).toMatchObject({
      kind: "TASK", social: false, id: ID, ref: { type: "TASK", id: ID }, href: `/tasks/${ID}`, title: "Relatório de vistoria",
      summary: "Registrar as condições da obra", type: "DESENHO_TECNICO", category: "VISTORIA_RELATORIO_FOTOGRAFICO",
      visibility: "EMPRESA", accessClass: "INTERNO", dueAt: "2026-11-01", dueKind: "ok", legal: false,
    });
    const meta = TASK_TYPE_META.DESENHO_TECNICO;
    expect([vm.typeSymbol, vm.typeTone, vm.family]).toEqual([meta.symbol, meta.tone, meta.family]);
  });

  it("estado → tom e eixo de execução padronizado", () => {
    for (const state of TASK_STATES) expect(toTaskCardViewModelFromApi(view({ state }), { now: NOW }).stateTone).toBe(TASK_STATE_TONE[state]);
    const tone = (state: TaskView["state"]) => toTaskCardViewModelFromApi(view({ state }), { now: NOW });
    expect(tone("DISPONIVEL")).toMatchObject({ stateTone: "accent", workStatus: "A_REALIZAR" });
    expect(tone("EM_USO")).toMatchObject({ stateTone: "info", workStatus: "EM_ANDAMENTO" });
    expect(tone("BLOQUEADA")).toMatchObject({ stateTone: "danger", workStatus: "BLOQUEADO" });
    expect(tone("CONCLUIDA")).toMatchObject({ stateTone: "success", workStatus: "CONCLUIDO" });
    expect(tone("MODELO_PUBLICO")).toMatchObject({ stateTone: "warning", workStatus: null });
  });

  it("BLOQUEADA leva o motivo; motivo antigo de outro estado não aparece", () => {
    expect(toTaskCardViewModelFromApi(view({ state: "BLOQUEADA", blockReason: "  Aguardando laudo da Defesa Civil " }), { now: NOW }).blockReason).toBe("Aguardando laudo da Defesa Civil");
    expect(toTaskCardViewModelFromApi(view({ state: "EM_USO", blockReason: "resolvido" }), { now: NOW }).blockReason).toBeNull();
    expect(toTaskCardViewModelFromApi(view({ state: "BLOQUEADA", blockReason: "  " }), { now: NOW }).blockReason).toBeNull();
  });

  it("rascunho: variação RASCUNHO (borda tracejada no card); ausentes seguem os padrões do servidor", () => {
    const vm = toTaskCardViewModelFromApi(view({ state: "RASCUNHO" }), { now: NOW });
    expect(vm.state).toBe("RASCUNHO");
    expect([...vm.variants]).toEqual(["RASCUNHO"]);
    expect(vm.workStatus).toBe("A_REALIZAR");
    const bare = toTaskCardViewModelFromApi({ id: ID, title: "Sem campos" }, { now: NOW });
    expect(bare).toMatchObject({ state: "RASCUNHO", visibility: "PRIVADA", accessClass: "INTERNO", summary: null, category: null, dueAt: null, dueKind: null });
  });

  it("sem contadores sociais nem dados que a API não tem (nada zerado, nada inventado)", () => {
    const vm = toTaskCardViewModelFromApi(view({ responsibleId: OTHER }), { now: NOW });
    expect(vm.social).toBe(false);
    for (const k of ["counters", "viewer", "perms", "remixedBy"]) expect(vm).not.toHaveProperty(k);
    expect(vm).toMatchObject({ author: null, responsible: null, department: null, seals: [], credit: null, delegation: null, aiGenerated: false, authorship: null });
  });

  it("tipo de prazo pelo relógio da tela", () => {
    expect(toTaskCardViewModelFromApi(view({ dueAt: "2026-10-10" }), { now: NOW }).dueKind).toBe("over");
    expect(toTaskCardViewModelFromApi(view({ dueAt: "2026-10-19" }), { now: NOW }).dueKind).toBe("soon");
    expect(toTaskCardViewModelFromApi(view({ dueAt: "2026-12-01" }), { now: NOW }).dueKind).toBe("ok");
  });

  it("ATRIBUIDA só quando a tarefa de outra pessoa está sob a responsabilidade de quem olha", () => {
    expect(toTaskCardViewModelFromApi(view({ ownerId: OTHER, responsibleId: ME }), { viewerId: ME, now: NOW }).variants.has("ATRIBUIDA")).toBe(true);
    expect(toTaskCardViewModelFromApi(view({ ownerId: ME, responsibleId: ME }), { viewerId: ME, now: NOW }).variants.has("ATRIBUIDA")).toBe(false);
    expect(toTaskCardViewModelFromApi(view({ ownerId: OTHER, responsibleId: ME }), { now: NOW }).variants.has("ATRIBUIDA")).toBe(false);
  });
});
