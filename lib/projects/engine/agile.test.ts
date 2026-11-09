import { describe, expect, it } from "vitest";
import { applyCommand } from "../commands";
import { buildDemoProject } from "../fixtures";
import { averageVelocity, burndown, cfd, daysBetween, flowTimes, velocity, type AgileTask } from "./agile";

const T = (id: string, over: Partial<AgileTask>): AgileTask => ({ id, status: "A_FAZER", effort: 1, ...over });
const SPRINTS = [
  { number: 1, start: "2026-11-02", end: "2026-11-06", goal: "Login" },
  { number: 2, start: "2026-11-09", end: "2026-11-13" },
];
const TASKS: AgileTask[] = [
  T("a", { sprint: 1, effort: 3, status: "CONCLUIDA", createdAt: "2026-11-01T10:00:00Z", startedAt: "2026-11-02T10:00:00Z", doneAt: "2026-11-04T10:00:00Z" }),
  T("b", { sprint: 1, effort: 2, status: "CONCLUIDA", createdAt: "2026-11-01T10:00:00Z", startedAt: "2026-11-03T10:00:00Z", doneAt: "2026-11-06T10:00:00Z" }),
  T("c", { sprint: 1, effort: 5, status: "EM_ANDAMENTO", createdAt: "2026-11-02T10:00:00Z", startedAt: "2026-11-05T10:00:00Z" }),
  T("d", { sprint: 2, effort: 4, createdAt: "2026-11-05T10:00:00Z" }),
];

describe("métricas ágeis", () => {
  it("velocidade: planejado × entregue por sprint e média das sprints encerradas", () => {
    const v = velocity(TASKS, SPRINTS);
    expect(v).toEqual([
      { number: 1, goal: "Login", planned: 10, done: 5, completion: 0.5 },
      { number: 2, goal: undefined, planned: 4, done: 0, completion: 0 },
    ]);
    expect(averageVelocity(v, SPRINTS, "2026-11-10")).toBe(5);
    expect(averageVelocity(v, SPRINTS, "2026-11-05")).toBeNull();
  });

  it("burndown: linha ideal do total a zero e o restante real até hoje", () => {
    const b = burndown(TASKS, SPRINTS[0]!, "2026-11-05");
    expect(b.map((p) => p.day)).toEqual(daysBetween("2026-11-02", "2026-11-06"));
    expect(b[0]).toEqual({ day: "2026-11-02", ideal: 10, remaining: 10 });
    expect(b[2]).toMatchObject({ ideal: 5, remaining: 7 }); // "a" (3) entregue em 04/11
    expect(b[4]).toEqual({ day: "2026-11-06", ideal: 0, remaining: null }); // futuro
  });

  it("fluxo cumulativo e tempos de fluxo (lead e cycle) com o WIP", () => {
    const c = cfd(TASKS, "2026-11-01", "2026-11-06");
    expect(c[0]).toEqual({ day: "2026-11-01", todo: 2, doing: 0, done: 0 });
    expect(c.at(-1)).toEqual({ day: "2026-11-06", todo: 1, doing: 1, done: 2 });
    const f = flowTimes(TASKS);
    expect(f.lead).toBe(4); // (3 + 5) / 2
    expect(f.cycle).toBe(2.5); // (2 + 3) / 2
    expect(f.wip).toBe(1);
  });

  it("o núcleo registra criação e início; a sprint ganha datas e meta por comando", () => {
    const ctx = { actorId: "u-carla", now: new Date("2026-11-10T12:00:00Z") };
    let m = buildDemoProject();
    const created = applyCommand(m, { type: "TASK_CREATE", title: "Tela de login", phase: "EXECUCAO", sprint: 2 }, ctx);
    if (!created.ok) throw new Error(created.error);
    m = created.model;
    const t = m.tasks.at(-1)!;
    expect(t.createdAt).toBe("2026-11-10T12:00:00.000Z");
    expect(t.startedAt).toBeUndefined();
    const started = applyCommand(m, { type: "TASK_UPDATE", id: t.id, patch: { status: "EM_ANDAMENTO" } }, ctx);
    if (!started.ok) throw new Error(started.error);
    expect(started.model.tasks.at(-1)!.startedAt).toBe("2026-11-10T12:00:00.000Z");
    const s = applyCommand(started.model, { type: "SPRINT_SET", number: 3, start: "2026-12-03", end: "2026-12-16", goal: "  Exportar   atas  " }, ctx);
    if (!s.ok) throw new Error(s.error);
    expect(s.model.sprints!.at(-1)).toEqual({ number: 3, start: "2026-12-03", end: "2026-12-16", goal: "Exportar atas" });
    expect(applyCommand(m, { type: "SPRINT_SET", number: 1, start: "2026-12-10", end: "2026-12-01" }, ctx)).toMatchObject({ ok: false, error: "VALOR_INVALIDO" });
  });
});
