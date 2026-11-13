import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/core";
import { looksLikeActivity } from "@/lib/projects/engine/methods";
import { assessTask } from "@/lib/tasks/quality";
import type { TaskDraft } from "@/lib/tasks/templates";
import { aiNotes } from "./assistant";
import { buildBudget, examplePriceTable } from "./budget";
import { buildTaskDraft, mdCell, mdTable, type DraftTarget } from "./draft";
import { parseDxf } from "./dxf";
import { buildSchedule } from "./schedule";
import { applyEdits, builtAreaM2, crossChecks, takeoffOf, DEFAULT_TAKEOFF_OPTIONS } from "./takeoff";
import type { CadAlert } from "./types";

type V = string | number;
const g = (...pairs: [number, V][]) => pairs.map(([c, v]) => `${String(c).padStart(3, " ")}\n${v}`).join("\n");
/** Sem $INSUNITS (unidade suposta), camada com "|" no nome, sala 6 × 5 m em mm e 2 janelas. */
const DXF = [
  g([0, "SECTION"], [2, "ENTITIES"]),
  g([0, "LWPOLYLINE"], [8, "ARQ-AMBIENTE"], [90, 4], [70, 1], [10, 0], [20, 0], [10, 6000], [20, 0], [10, 6000], [20, 5000], [10, 0], [20, 5000]),
  g([0, "TEXT"], [8, "ARQ-AMBIENTE"], [10, 3000], [20, 2500], [40, 200], [1, "SALA"]),
  g([0, "LINE"], [8, "ARQ|PAREDE"], [10, 0], [20, 0], [11, 6000], [21, 0]),
  g([0, "LINE"], [8, "ARQ|PAREDE"], [10, 0], [20, 150], [11, 6000], [21, 150]),
  g([0, "INSERT"], [8, "ESQUADRIAS"], [2, "JANELA 120"], [10, 0], [20, 0]),
  g([0, "INSERT"], [8, "ESQUADRIAS"], [2, "JANELA 120"], [10, 900], [20, 0]),
  g([0, "ENDSEC"], [0, "EOF"]),
].join("\n");

const t = (key: string, vars?: Record<string, string | number>) => translate("pt-BR", key, vars);

function scenario() {
  const parsed = { format: "DXF" as const, fileName: "sede.dxf", sizeBytes: DXF.length, dxf: parseDxf(DXF) };
  const takeoff = takeoffOf(parsed, DEFAULT_TAKEOFF_OPTIONS);
  const rows = applyEdits(takeoff.rows, {});
  const checks = crossChecks(rows);
  const budget = buildBudget(rows, examplePriceTable(), 25, builtAreaM2(rows));
  const schedule = buildSchedule(rows, { start: "2026-11-16", builtAreaM2: builtAreaM2(rows) });
  return { parsed, takeoff, rows, checks, budget, schedule };
}

const fullDraft = (d: Partial<TaskDraft>): TaskDraft => ({
  title: "", type: "", area: "", objective: "", descriptionMd: "", priority: "MEDIA", dueAt: "", accessClass: "INTERNO", visibility: "DEPARTAMENTO",
  deliverables: [], criteria: [], references: [], extensions: {}, ...d,
});

describe("Markdown das tabelas", () => {
  it("escapa | e quebra de linha dos dados do arquivo; alinha números à direita", () => {
    expect(mdCell("ARQ|PAREDE\nnova")).toBe("ARQ\\|PAREDE nova");
    expect(mdTable(["Item", "Qtd"], [["a|b", "1"]], [1])).toBe("| Item | Qtd |\n| --- | ---: |\n| a\\|b | 1 |");
  });
});

describe("rascunho da tarefa (Criar tarefa com isto)", () => {
  it.each<[DraftTarget, string]>([["PLANILHA", "PLANILHA"], ["CRONOGRAMA", "CRONOGRAMA"], ["QUANTITATIVOS", "PLANILHA"]])("alvo %s vira tarefa do tipo %s", (target, type) => {
    const s = scenario();
    const draft = buildTaskDraft({
      fileName: "sede.dxf", format: "DXF", target, unit: s.takeoff.unit, rows: s.rows, budget: s.budget, schedule: s.schedule,
      alerts: [...s.takeoff.alerts, ...s.checks], alertText: (a: CadAlert) => t(`cad.alert.${a.code}`, a.vars), extractedAt: "2026-11-13",
    }, t, "pt-BR");
    expect(draft.type).toBe(type);
    expect(draft.area).toBe("ENGENHARIA");
    expect(draft.extensions).toEqual({ discipline: "Orçamento e planejamento de obras" });
  });

  it("planilha: título, objetivo com o total, tabelas escapadas, entregas como substantivos, critérios verificáveis — passa na checagem de qualidade", () => {
    const s = scenario();
    const draft = buildTaskDraft({
      fileName: "sede.dxf", format: "DXF", target: "PLANILHA", unit: s.takeoff.unit, rows: s.rows, budget: s.budget, schedule: s.schedule,
      alerts: [...s.takeoff.alerts, ...s.checks], alertText: (a: CadAlert) => t(`cad.alert.${a.code}`, a.vars), extractedAt: "2026-11-13",
      sourceTask: { id: "t-chefe-planta", title: "Planta baixa" },
    }, t, "pt-BR");
    expect(draft.title).toBe("Planilha orçamentária de sede.dxf");
    expect(draft.objective).toMatch(/^Fechar a planilha orçamentária das \d+ linhas extraídas de sede\.dxf, .* \(total de exemplo: R\$\s[\d.,]+\)\.$/);
    const md = draft.descriptionMd!;
    expect(md).toContain("- Arquivo: sede.dxf (DXF) · unidade: milímetros (suposta pela extensão do desenho — confirme)");
    expect(md).toContain("- Tarefa de origem: [Planta baixa](/tasks/t-chefe-planta)");
    expect(md).toContain("| Paredes (alvenaria) — ARQ\\|PAREDE |");
    expect(md).toContain("| EX-15 | Janela — JANELA 120 | un | 2 | R$ 1.300,00 | R$ 2.600,00 |");
    expect(md).toContain("| — | **Total com BDI** |");
    expect(md).toContain("O arquivo não declara a unidade ($INSUNITS)");
    expect(md).toContain("✦ O texto foi montado pelo sistema");
    expect(draft.deliverables!.some(looksLikeActivity)).toBe(false);
    expect(draft.criteria).toContain("Nenhum preço de exemplo (código EX-) permanece na planilha final");
    const report = assessTask(fullDraft(draft));
    expect(report.readiness).not.toBe("INCOMPLETA");
    const status = Object.fromEntries(report.checks.map((c) => [c.id, c.status]));
    expect(status).toMatchObject({ titulo: "OK", tipo: "OK", objetivo: "OK", entregas: "OK", criterios: "OK", engArt: "OK" });
  });

  it("IFC leva a norma do formato nos campos da área", () => {
    const s = scenario();
    const draft = buildTaskDraft({
      fileName: "obra.ifc", format: "IFC", target: "QUANTITATIVOS", unit: null, rows: s.rows, budget: s.budget, schedule: s.schedule,
      alerts: [], alertText: () => "", extractedAt: "2026-11-13",
    }, t, "pt-BR");
    expect(draft.extensions).toEqual({ discipline: "Orçamento e planejamento de obras", standard: "ISO 16739-1 (IFC)" });
    expect(draft.descriptionMd).toContain("- Nenhum aviso.");
  });
});

describe("✦ IA simulada (D-12): só resume e alerta com os números calculados", () => {
  it("cita contagens, total e cronograma vindos do cálculo e pede para confirmar a unidade suposta", () => {
    const s = scenario();
    const notes = aiNotes({ fileName: "sede.dxf", takeoff: s.takeoff, rows: s.rows, budget: s.budget, schedule: s.schedule, checks: s.checks });
    const byCode = Object.fromEntries(notes.map((n) => [n.code, n]));
    expect(byCode.LEU_DXF!.vars).toEqual({ file: "sede.dxf", entities: 6, layers: 3, rows: s.rows.length, included: s.rows.filter((r) => r.included).length });
    expect(byCode.TOTAL!.vars).toEqual({ totalCents: s.budget.totalCents, directCents: s.budget.directCents, bdi: 25 });
    expect(byCode.CRONOGRAMA!.vars).toMatchObject({ days: s.schedule.totalDays, startDate: "2026-11-16", endDate: s.schedule.end });
    expect(byCode.CONFIRME_UNIDADE!.refs).toEqual({ unit: { ns: "unit", id: "mm" } });
    expect(byCode.PREMISSA_PAREDE!.vars).toEqual({ n: 1, height: 2.8 });
    expect(notes.at(-1)!.code).toBe("PROXIMO_PASSO");
    // nada que não veio do cálculo: todo número citado está nas entradas
    const known = new Set<number>([
      ...s.takeoff.facts.map((f) => f.n), s.rows.length, s.rows.filter((r) => r.included).length, s.budget.totalCents, s.budget.directCents, s.budget.bdiPercent,
      s.schedule.totalDays, ...s.schedule.items.map((i) => i.days), ...s.budget.lines.map((l) => l.totalCents), 0, 1, 2, 3, 2.8,
    ]);
    for (const n of notes) for (const [k, v] of Object.entries(n.vars ?? {})) if (typeof v === "number" && k !== "share") expect(known.has(v), `${n.code}.${k}=${v}`).toBe(true);
  });

  it("sem linhas: só diz que não há o que medir", () => {
    const s = scenario();
    const empty = { ...s.takeoff, rows: [] };
    const notes = aiNotes({ fileName: "x.dxf", takeoff: empty, rows: [], budget: s.budget, schedule: s.schedule, checks: [] });
    expect(notes.map((n) => n.code)).toEqual(["LEU_DXF", "NADA_A_MEDIR"]);
  });
});
