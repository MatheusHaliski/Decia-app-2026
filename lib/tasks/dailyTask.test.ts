import { describe, expect, it } from "vitest";
import type { TaskView } from "./client";
import { compareDaily, dailyReasonKey, suggestDailyTask } from "./dailyTask";

const TODAY = "2026-11-24";
const task = (id: string, over: Partial<TaskView> = {}): TaskView => ({
  id, title: `Tarefa ${id}`, type: "DOCUMENTO", priority: "MEDIA", state: "DISPONIVEL", accessClass: "INTERNO", visibility: "PRIVADA", ...over,
} as TaskView);

describe("Tarefa do Dia pelo prazo mais próximo (RF44.CA01 · RF41.CA04)", () => {
  it("sugere primeiro a de prazo efetivo mais próximo e diz o motivo", () => {
    const s = suggestDailyTask([
      task("a", { dueAt: "2026-12-10", priority: "CRITICA" }),
      task("b", { dueAt: "2026-11-30", legalDueAt: "2026-11-26" }),
      task("c", { dueAt: "2026-11-28", state: "EM_USO" }),
    ], TODAY);
    expect(s?.task.id).toBe("b");
    expect(s).toMatchObject({ reason: "PROXIMA", due: "2026-11-26", days: 2, legal: true });
    expect(s?.next.map((x) => x.id)).toEqual(["c", "a"]);
    expect(dailyReasonKey(s!)).toBe("prazosdiarios.daily.reason.soon");
  });

  it("vencida vem antes; bloqueada, concluída e arquivada ficam de fora", () => {
    const s = suggestDailyTask([
      task("blk", { dueAt: "2026-11-01", state: "BLOQUEADA" }),
      task("done", { dueAt: "2026-11-02", state: "CONCLUIDA" }),
      task("late", { dueAt: "2026-11-23" }),
      task("today", { dueAt: TODAY }),
    ], TODAY);
    expect(s).toMatchObject({ reason: "VENCIDA", days: -1, legal: false });
    expect(s?.task.id).toBe("late");
    expect(dailyReasonKey(s!)).toBe("prazosdiarios.daily.reason.overdueOne");
    expect(suggestDailyTask([task("t", { dueAt: TODAY })], TODAY)?.reason).toBe("HOJE");
    expect(suggestDailyTask([task("f", { dueAt: "2027-01-10" })], TODAY)?.reason).toBe("COM_PRAZO");
  });

  it("sem prazo nenhum: maior prioridade, em andamento antes, depois o título", () => {
    const s = suggestDailyTask([task("m"), task("h", { priority: "ALTA" }), task("h2", { priority: "ALTA", state: "EM_USO" })], TODAY);
    expect(s).toMatchObject({ reason: "PRIORIDADE", due: null, days: null });
    expect(s?.task.id).toBe("h2");
    expect(dailyReasonKey(s!)).toBe("prazosdiarios.daily.reason.priority");
  });

  it("com prazo sempre antes de sem prazo; empate de data → legal; nada aberto → null", () => {
    expect(compareDaily(task("x", { dueAt: "2027-06-01" }), task("y", { priority: "CRITICA" }))).toBeLessThan(0);
    expect(compareDaily(task("x", { dueAt: TODAY }), task("y", { legalDueAt: TODAY }))).toBeGreaterThan(0);
    expect(suggestDailyTask([task("z", { state: "ARQUIVADA" })], TODAY)).toBeNull();
    expect(suggestDailyTask([], TODAY)).toBeNull();
  });
});
