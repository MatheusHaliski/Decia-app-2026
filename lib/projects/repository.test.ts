/**
 * Repositório DEMO (RF21/RF22/RF30): criar e listar projetos; cada versão guarda o retrato do projeto; mover no canvas não gera
 * versão mas fica no retrato da versão vigente e na contagem dela; "voltar a esta versão" devolve estrutura, prazos e posições.
 */
import { describe, expect, it } from "vitest";
import { makeRef } from "./canvas";
import { applyCommand } from "./commands";
import { buildDemoProject, DEMO_PROJECT_ID } from "./fixtures";
import { createMemoryProjectRepository } from "./repository";
import { blankProject } from "./autopilot/proposal";

const at = (iso: string) => ({ actorId: "u-pessoa", now: new Date(iso) });

describe("catálogo de projetos", () => {
  it("cria (versão 1 com retrato), recusa id repetido ou inválido e lista do alterado mais recente ao mais antigo", () => {
    const repo = createMemoryProjectRepository([buildDemoProject()]);
    const novo = blankProject({ id: "p-novo", title: "Projeto novo", area: "SOFTWARE", approach: "AGIL", startDate: "2026-11-16", actorId: "u-pessoa", now: new Date("2026-11-12T12:00:00Z") });
    expect(repo.create!(novo)).toEqual({ ok: true, model: novo });
    expect(repo.create!(novo)).toEqual({ ok: false, error: "JA_EXISTE", detail: "p-novo" });
    expect(repo.create!({ ...novo, id: "../x" })).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
    expect(repo.list!().map((p) => p.id)).toEqual(["p-novo", DEMO_PROJECT_ID]);
    repo.dispatch(DEMO_PROJECT_ID, { type: "TASK_UPDATE", id: "tB", patch: { percentComplete: 60 } }, at("2026-11-12T13:00:00Z"));
    expect(repo.list!().map((p) => p.id)).toEqual([DEMO_PROJECT_ID, "p-novo"]);
    expect(repo.versionSnapshot!("p-novo", 1)).toMatchObject({ id: "p-novo", title: "Projeto novo" });
  });
});

describe("histórico e posições sincronizados (RF22.CA02/CA03)", () => {
  it("mover no canvas não gera versão: a posição entra no modelo, no retrato da versão vigente e na contagem de ajustes", () => {
    const repo = createMemoryProjectRepository([buildDemoProject()]);
    const ref = makeRef("TASK", "tC");
    // x 950 deixa o centro do cartão (950 + 98) dentro da faixa da Análise: só posição, sem mudar de fase
    const r = repo.dispatch(DEMO_PROJECT_ID, { type: "CANVAS_MOVE", ref, x: 950, y: 1300 }, at("2026-11-12T10:00:00Z"));
    expect(r.ok && r.structural).toBe(false);
    const p = repo.get(DEMO_PROJECT_ID)!;
    expect(p.version).toBe(4);
    expect(p.canvas.positions[ref]).toEqual({ x: 950, y: 1300 });
    expect(p.versions.at(-1)).toMatchObject({ number: 4, layoutMoves: 1, layoutAt: "2026-11-12T10:00:00.000Z" });
    expect(repo.versionSnapshot!(DEMO_PROJECT_ID, 4)!.canvas.positions[ref]).toEqual({ x: 950, y: 1300 });
    // soltar no mesmo lugar não conta
    repo.dispatch(DEMO_PROJECT_ID, { type: "CANVAS_MOVE", ref, x: 950, y: 1300 }, at("2026-11-12T10:01:00Z"));
    expect(repo.get(DEMO_PROJECT_ID)!.versions.at(-1)!.layoutMoves).toBe(1);
  });

  it("voltar a uma versão devolve a estrutura E o arranjo daquele momento, como uma versão nova (nada se perde)", () => {
    const repo = createMemoryProjectRepository([buildDemoProject()]);
    const ref = makeRef("TASK", "tC");
    repo.dispatch(DEMO_PROJECT_ID, { type: "CANVAS_MOVE", ref, x: 1000, y: 1200 }, at("2026-11-12T10:00:00Z"));
    repo.dispatch(DEMO_PROJECT_ID, { type: "TASK_CREATE", title: "Migrar atas antigas", phase: "EXECUCAO" }, at("2026-11-12T10:05:00Z")); // v5
    repo.dispatch(DEMO_PROJECT_ID, { type: "CANVAS_MOVE", ref, x: 920, y: 1250 }, at("2026-11-12T10:06:00Z"));
    repo.dispatch(DEMO_PROJECT_ID, { type: "TASK_MOVE_PHASE", id: "tC", phase: "EXECUCAO" }, at("2026-11-12T10:07:00Z")); // v6
    expect(repo.get(DEMO_PROJECT_ID)!.version).toBe(6);
    const r = repo.restoreVersion!(DEMO_PROJECT_ID, 4, at("2026-11-12T10:10:00Z"));
    expect(r.ok && r.versionKey).toBe("versionRestored");
    const p = repo.get(DEMO_PROJECT_ID)!;
    expect(p.version).toBe(7);
    expect(p.versions.at(-1)).toMatchObject({ number: 7, key: "versionRestored", vars: { n: 4 } });
    expect(p.tasks.some((t) => t.title === "Migrar atas antigas")).toBe(false);
    expect(p.tasks.find((t) => t.id === "tC")!.phase).toBe("ANALISE");
    expect(p.canvas.positions[ref]).toEqual({ x: 1000, y: 1200 }); // o arranjo de quando a v4 foi substituída
    expect(p.versions.map((v) => v.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // e dá para voltar para a versão restaurada antes (v6)
    expect(repo.restoreVersion!(DEMO_PROJECT_ID, 6, at("2026-11-12T10:11:00Z")).ok).toBe(true);
    expect(repo.get(DEMO_PROJECT_ID)!.tasks.find((t) => t.id === "tC")!.phase).toBe("EXECUCAO");
  });

  it("versão sem retrato (anterior a esta aba), versão atual/futura e projeto arquivado são recusados", () => {
    const repo = createMemoryProjectRepository([buildDemoProject()]);
    expect(repo.restoreVersion!(DEMO_PROJECT_ID, 2, at("2026-11-12T10:00:00Z"))).toEqual({ ok: false, error: "NAO_ENCONTRADO", detail: "v2" });
    const demo = buildDemoProject();
    const { versions: _v, version: _n, ...snap } = demo;
    void _v;
    void _n;
    expect(applyCommand(demo, { type: "VERSION_RESTORE", number: 4, snapshot: snap }, at("2026-11-12T10:00:00Z"))).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
    const archived = { ...demo, closure: { ...demo.closure, archived: true }, version: 5, versions: [...demo.versions, { number: 5, at: "x", actorId: "u", key: "closureUpdated" }] };
    expect(applyCommand(archived, { type: "VERSION_RESTORE", number: 4, snapshot: snap }, at("2026-11-12T10:00:00Z"))).toMatchObject({ ok: false, error: "PROJETO_BLOQUEADO" });
  });

  it("prazo da atividade (dueAt) é editável e validado", () => {
    const demo = buildDemoProject();
    const ok = applyCommand(demo, { type: "TASK_UPDATE", id: "tD", patch: { dueAt: "2026-11-20" } }, at("2026-11-12T10:00:00Z"));
    expect(ok.ok && ok.model.tasks.find((t) => t.id === "tD")!.dueAt).toBe("2026-11-20");
    expect(applyCommand(demo, { type: "TASK_UPDATE", id: "tD", patch: { dueAt: "20/11/2026" } }, at("2026-11-12T10:00:00Z"))).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
  });
});
