import { describe, expect, it } from "vitest";
import { applyCommand, type ProjectCommand } from "./commands";
import { allMetrics, digest, metricChanges, narrative, participation, workload } from "./feedback";
import { buildDemoProject } from "./fixtures";
import { computeMetrics } from "./metrics";
import type { ProjectModel } from "./types";

const ctx = { actorId: "u-carla", now: new Date("2026-11-10T12:00:00Z") };
const run = (m: ProjectModel, ...cmds: ProjectCommand[]) =>
  cmds.reduce((acc, c) => {
    const r = applyCommand(acc, c, ctx);
    if (!r.ok) throw new Error(`${c.type}: ${r.error}`);
    return r.model;
  }, m);

describe("feedback da janela segmentada", () => {
  it("o que mudou: aumentar a reserva até cobrir o VME melhora Q_RESERVA; nada mais muda de status", () => {
    const demo = buildDemoProject();
    const before = computeMetrics(demo);
    const after = computeMetrics(run(demo, { type: "RESERVES_SET", contingency: 30_000, management: 5_000 }));
    const changes = metricChanges(before, after);
    expect(changes.map((c) => c.id)).toEqual(["Q_RESERVA"]);
    expect(changes[0]).toMatchObject({ direction: "MELHOROU", to: "OK", tab: "riscos" });
  });

  it("o que mudou: criar um ciclo na rede piora o cronograma (e piora vem antes de melhora)", () => {
    const demo = buildDemoProject();
    const before = computeMetrics(demo);
    // T07 → T01 fecharia um ciclo: o comando recusa, então forçamos pelo modelo para ver a métrica reagir
    const cyclic: ProjectModel = { ...demo, dependencies: [...demo.dependencies, { id: "dx", from: "tE", to: "tA", type: "FS", lagDays: 0 }] };
    const changes = metricChanges(before, computeMetrics(cyclic));
    expect(changes[0]).toMatchObject({ id: "Q_CRONOGRAMA", direction: "PIOROU", to: "CRITICO" });
  });

  it("prioridades: críticos primeiro, depois atenção; contagens somam todos os indicadores", () => {
    const m = computeMetrics(buildDemoProject());
    const d = digest(m);
    expect(d.priorities.length).toBeLessThanOrEqual(5);
    const sev = d.priorities.map((f) => f.severity);
    expect(sev.indexOf("ATENCAO") === -1 || sev.lastIndexOf("CRITICO") < sev.indexOf("ATENCAO")).toBe(true);
    expect(d.priorities[0]!.severity).toBe("CRITICO");
    const total = Object.values(d.counts).reduce((n, c) => n + c.OK + c.ATENCAO + c.CRITICO + c.SEM_DADOS, 0);
    expect(total).toBe(allMetrics(m).length);
    expect(d.strengths.every((id) => !id.startsWith("W_"))).toBe(true);
  });

  it("carga por pessoa inclui quem está sem atividade; marcos não contam", () => {
    const w = workload(buildDemoProject());
    const carla = w.people.find((p) => p.userId === "u-carla")!;
    // T03 (4 d) + T06 (5 d) + T08 (1 d)
    expect(carla).toMatchObject({ days: 10, tasks: 3 });
    expect(w.people[0]!.userId).toBe("u-carla");
    expect(w.people.find((p) => p.userId === "u-bruno")).toMatchObject({ days: 0, tasks: 0 });
    expect(w.unassigned).toBe(0);
    expect(w.assignedDays).toBe(w.people.reduce((n, p) => n + p.days, 0));
  });

  it("participação é agregada: autores distintos da equipe, sem ranking", () => {
    const p = participation(buildDemoProject());
    expect(p).toMatchObject({ authors: 3, team: 6, edits: 4 });
  });

  it("leitura: começa pela fase e o portão, termina no próximo passo com a aba para corrigir", () => {
    const model = buildDemoProject();
    const m = computeMetrics(model);
    const parts = narrative(model, m);
    expect(parts[0]).toMatchObject({ kind: "phase", vars: { phase: "ELABORACAO", dominant: "PLANEJAMENTO" } });
    expect(parts.some((p) => p.kind === "critical")).toBe(true);
    const last = parts.at(-1)!;
    expect(last.kind).toBe("next");
    if (last.kind === "next") expect(last.tab).toBe(digest(m).priorities[0]!.tab);
    const group = parts.find((p) => p.kind === "group");
    expect(group).toMatchObject({ vars: { authors: 3, team: 6 } });
  });
});
