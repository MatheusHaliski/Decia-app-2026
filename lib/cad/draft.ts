/**
 * "Criar tarefa com isto" (RF34.CA03): monta o rascunho do criador de tarefas (`TaskDraft` parcial) a partir da extração —
 * título, tipo (PLANILHA para quantitativos/planilha, CRONOGRAMA para o cronograma), objetivo com número, descrição em Markdown
 * com as tabelas (quantitativos, planilha de exemplo com BDI e total, cronograma), entregas como substantivos, critérios de
 * aceite verificáveis e os campos da área ENGENHARIA. O texto sai no idioma da pessoa (recebe `t`); os dados do arquivo
 * (camadas, blocos, materiais) entram como estão, com `|` escapado para não quebrar a tabela.
 */
import type { TaskDraft } from "@/lib/tasks/templates";
import type { Budget, BudgetLine } from "./budget";
import type { Schedule } from "./schedule";
import type { CadAlert, CadFormat, QtyUnit, TakeoffRow, UnitInfo } from "./types";

export const DRAFT_TARGETS = ["QUANTITATIVOS", "PLANILHA", "CRONOGRAMA"] as const;
export type DraftTarget = (typeof DRAFT_TARGETS)[number];

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface DraftInput {
  fileName: string;
  format: Exclude<CadFormat, "DWG">;
  target: DraftTarget;
  unit: UnitInfo | null;
  rows: readonly TakeoffRow[];
  budget: Budget;
  schedule: Schedule;
  /** alertas gerais da leitura + conferências */
  alerts: readonly CadAlert[];
  /** tarefa de origem (rota /tasks/[id]/extrair) */
  sourceTask?: { id: string; title: string } | null;
  /** texto de cada alerta já traduzido */
  alertText: (a: CadAlert) => string;
  /** data da extração (ISO) */
  extractedAt: string;
}

/** Célula de tabela Markdown: uma linha só, `|` escapado. */
export function mdCell(s: string): string {
  return s.replace(/\r?\n/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim() || "—";
}

export function mdTable(header: readonly string[], rows: readonly (readonly string[])[], right: readonly number[] = []): string {
  const sep = header.map((_, i) => (right.includes(i) ? "---:" : "---"));
  const line = (cells: readonly string[]) => `| ${cells.map(mdCell).join(" | ")} |`;
  return [line(header), `| ${sep.join(" | ")} |`, ...rows.map(line)].join("\n");
}

export function buildTaskDraft(input: DraftInput, t: Translate, intl: string): Partial<TaskDraft> {
  const n2 = new Intl.NumberFormat(intl, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const n0 = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat(intl, { style: "currency", currency: "BRL" });
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(intl, { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "—");
  const unitLabel = (u: QtyUnit) => t(`cad.qty.${u}`);
  const qty = (r: { unit: QtyUnit; quantity: number }) => (r.unit === "un" ? n0.format(r.quantity) : n2.format(r.quantity));
  const brl = (cents: number) => money.format(cents / 100);
  const { rows, budget, schedule, target } = input;
  const included = rows.filter((r) => r.included);
  const file = input.fileName;

  const kindName = (r: TakeoffRow) => t(`cad.kind.${r.kind}`);
  const itemName = (r: TakeoffRow) => (r.label ? `${kindName(r)} — ${r.label}` : kindName(r));
  const serviceName = (l: BudgetLine) => (l.service ? t(`cad.service.${l.service}`) : t("cad.budget.noService", { kind: l.kind ? t(`cad.kind.${l.kind}`) : "" }));

  // origem
  const unitText = input.unit ? `${t(`cad.unit.${input.unit.id}`)} (${t(`cad.unitOrigin.${input.unit.origin}`)})` : "—";
  const origin = [
    `- ${t("cad.draft.md.file", { file, format: input.format, unit: unitText })}`,
    input.sourceTask ? `- ${t("cad.draft.md.sourceTask", { title: input.sourceTask.title, href: `/tasks/${input.sourceTask.id}` })}` : null,
    `- ${t("cad.draft.md.local", { date: date(input.extractedAt) })}`,
  ].filter(Boolean).join("\n");

  // quantitativos
  const qRows = rows.map((r) => [
    itemName(r),
    t(`cad.source.${r.source.what}`, { ref: r.source.ref }),
    unitLabel(r.unit),
    qty(r) + (r.corrected ? ` ${t("cad.draft.md.corrected")}` : ""),
    t(`cad.conf.${r.confidence}`),
    r.included ? t("common.yes") : t("common.no"),
  ]);
  const quantities = mdTable(
    [t("cad.q.col.item"), t("cad.q.col.origin"), t("cad.q.col.unit"), t("cad.q.col.quantity"), t("cad.q.col.confidence"), t("cad.q.col.inBudget")],
    qRows,
    [3],
  );

  // planilha
  const bRows: string[][] = [];
  for (const g of budget.groups) {
    for (const l of g.lines) bRows.push([l.code ?? "—", l.label ? `${serviceName(l)} — ${l.label}` : serviceName(l), unitLabel(l.unit), qty(l), brl(l.unitPriceCents), brl(l.totalCents)]);
    bRows.push(["", `**${t("cad.budget.subtotal", { group: t(`cad.group.${g.group}`) })}**`, "", "", "", `**${brl(g.subtotalCents)}**`]);
  }
  bRows.push(["", `**${t("cad.budget.direct")}**`, "", "", "", `**${brl(budget.directCents)}**`]);
  bRows.push(["", `**${t("cad.budget.bdiLine", { bdi: n2.format(budget.bdiPercent) })}**`, "", "", "", `**${brl(budget.bdiCents)}**`]);
  bRows.push(["", `**${t("cad.budget.total")}**`, "", "", "", `**${brl(budget.totalCents)}**`]);
  const budgetMd = mdTable(
    [t("cad.budget.col.code"), t("cad.budget.col.service"), t("cad.budget.col.unit"), t("cad.budget.col.quantity"), t("cad.budget.col.unitPrice"), t("cad.budget.col.total")],
    bRows,
    [3, 4, 5],
  );

  // cronograma
  const sRows = schedule.items.map((i) => [
    t(`cad.stage.${i.stage}`),
    i.days ? n0.format(i.days) : t("cad.schedule.toDefine"),
    date(i.start),
    date(i.end),
    i.dependsOn.map((d) => t(`cad.stage.${d}`)).join(", ") || "—",
    t(`cad.schedule.status.${i.status}`),
  ]);
  const scheduleMd = mdTable(
    [t("cad.schedule.col.stage"), t("cad.schedule.col.days"), t("cad.schedule.col.start"), t("cad.schedule.col.end"), t("cad.schedule.col.dependsOn"), t("cad.schedule.col.basis")],
    sRows,
    [1],
  );

  const alertsMd = input.alerts.length ? input.alerts.map((a) => `- ${input.alertText(a)}`).join("\n") : `- ${t("cad.draft.md.noAlerts")}`;

  const sections = [
    `## ${t("cad.draft.md.origin")}\n${origin}`,
    `## ${t("cad.draft.md.quantities")}\n${quantities}`,
    `## ${t("cad.draft.md.budget")}\n> ${t("cad.budget.exampleNote")}\n\n${budgetMd}`,
    `## ${t("cad.draft.md.schedule")}\n> ${t("cad.schedule.exampleNote")}\n\n${scheduleMd}\n\n${t("cad.draft.md.scheduleTotal", { days: schedule.totalDays, start: date(schedule.start), end: date(schedule.end) })}`,
    `## ${t("cad.draft.md.alerts")}\n${alertsMd}`,
    `## ${t("cad.draft.md.how")}\n- ${t("cad.draft.md.howCalc")}\n- ${t("cad.draft.md.howAi")}`,
  ];

  const total = brl(budget.totalCents);
  const objective =
    target === "CRONOGRAMA" ? t("cad.draft.objective.CRONOGRAMA", { file, stages: schedule.items.length, days: schedule.totalDays })
      : target === "PLANILHA" ? t("cad.draft.objective.PLANILHA", { file, n: budget.lines.length, total })
        : t("cad.draft.objective.QUANTITATIVOS", { file, n: included.length, alerts: input.alerts.length });

  const deliverables = [1, 2, 3].map((i) => t(`cad.draft.deliverable.${target}.${i}`));
  const criteria = [
    t("cad.draft.criterion.check5"),
    input.alerts.length ? t("cad.draft.criterion.alerts", { n: input.alerts.length }) : null,
    target !== "CRONOGRAMA" ? t("cad.draft.criterion.reference") : null,
    target !== "CRONOGRAMA" ? t("cad.draft.criterion.noExample") : null,
    target !== "CRONOGRAMA" ? t("cad.draft.criterion.bdi", { bdi: n2.format(budget.bdiPercent) }) : null,
    target === "CRONOGRAMA" ? t("cad.draft.criterion.stages", { n: schedule.items.length }) : null,
    target === "CRONOGRAMA" ? t("cad.draft.criterion.productivity") : null,
    t("cad.draft.criterion.art"),
  ].filter((c): c is string => !!c);

  const extensions: Record<string, string> = { discipline: t("cad.draft.discipline") };
  if (input.format === "IFC") extensions.standard = "ISO 16739-1 (IFC)";

  return {
    title: t(`cad.draft.title.${target}`, { file }),
    type: target === "CRONOGRAMA" ? "CRONOGRAMA" : "PLANILHA",
    area: "ENGENHARIA",
    objective,
    descriptionMd: sections.join("\n\n"),
    deliverables,
    criteria,
    extensions,
  };
}
