/**
 * Resumo de um projeto para a "Minha mesa" (RF21, cartões) e para a visão geral (`/projects/[id]`): fase, % concluído, próximo
 * marco, término pelo caminho crítico (CPM do motor), prazo e estouro, valor agregado (IDC/IDP) e achados do feedback. Só
 * números do sistema (D-12); funções puras sobre o mesmo modelo que a Mesa projeta.
 */
import { effectiveDuration } from "../derive";
import type { CostVerdict, ScheduleVerdict } from "../engine/evm";
import { offsetToDate } from "../engine/schedule";
import { computeMetrics } from "../metrics";
import type { ProjectModel } from "../types";
import { evmView, timelineView } from "../views";
import { diffDays, type IsoDate } from "./dates";

export interface ProjectSummary {
  /** % concluído ponderado pela duração das atividades (marcos fora); sem duração, média simples */
  progress: number;
  tasks: { total: number; done: number };
  nextMilestone?: { title: string; date: IsoDate; source: "MARCO" | "TAP" };
  /** término pelo caminho crítico */
  finish?: { days: number; date: IsoDate; criticalCodes: string[] };
  /** prazo final do projeto: o maior prazo de atividade ou o marco "prazo" do TAP */
  deadline?: IsoDate;
  /** dias além do prazo (0 = cabe) */
  overrunDays: number;
  cpi: number | null;
  spi: number | null;
  costVerdict: CostVerdict | null;
  scheduleVerdict: ScheduleVerdict | null;
  /** probabilidade (PERT) de cumprir a linha de base — ou o término — quando há incerteza nas estimativas */
  probability?: { value: number; target: number };
  findings: { critical: number; attention: number };
  openRisks: number;
}

export function summarizeProject(model: ProjectModel, today: IsoDate): ProjectSummary {
  const work = model.tasks.filter((t) => !t.milestone);
  const weight = work.reduce((s, t) => s + effectiveDuration(t), 0);
  const progress = work.length === 0 ? 0 : weight > 0
    ? work.reduce((s, t) => s + effectiveDuration(t) * Math.max(0, Math.min(100, t.percentComplete)), 0) / weight
    : work.reduce((s, t) => s + t.percentComplete, 0) / work.length;
  const tl = timelineView(model);
  const rowOf = new Map(tl.rows.map((r) => [r.task.id, r]));

  const candidates: NonNullable<ProjectSummary["nextMilestone"]>[] = [];
  for (const t of model.tasks) {
    if (!t.milestone || t.status === "CONCLUIDA") continue;
    // a data prevista no cronograma; o prazo (dueAt) só quando não há cronograma
    const date = rowOf.get(t.id)?.startDate ?? t.dueAt;
    if (date) candidates.push({ title: t.title, date, source: "MARCO" });
  }
  for (const m of model.charter.milestones) if (m.date) candidates.push({ title: m.title, date: m.date.slice(0, 10), source: "TAP" });
  const nextMilestone = candidates.filter((c) => c.date >= today).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))[0];

  const dues = [...model.tasks.map((t) => t.dueAt).filter((d): d is string => Boolean(d)), ...model.charter.milestones.filter((m) => /prazo/i.test(m.title) && m.date).map((m) => m.date!.slice(0, 10))];
  const deadline = dues.sort().at(-1);
  const finish = tl.ok ? { days: tl.finish, date: tl.finishDate, criticalCodes: tl.criticalPath.map((id) => model.tasks.find((t) => t.id === id)?.code ?? id) } : undefined;
  // a Mesa mostra o término como início + duração; o estouro compara o ÚLTIMO dia de trabalho com o prazo (inclusivo)
  const lastWorkDay = tl.ok ? offsetToDate(model.startDate, Math.max(0, tl.finish - 1e-6)) : undefined;
  const overrunDays = lastWorkDay && deadline ? Math.max(0, diffDays(deadline, lastWorkDay)) : 0;
  const e = evmView(model);
  const metrics = computeMetrics(model);
  return {
    progress: Math.round(progress),
    tasks: { total: work.length, done: work.filter((t) => t.status === "CONCLUIDA").length },
    nextMilestone,
    finish,
    deadline,
    overrunDays,
    cpi: e.cpi,
    spi: e.spi,
    costVerdict: e.cost,
    scheduleVerdict: e.schedule,
    probability: tl.pert && tl.pert.sd > 0 ? { value: tl.pert.probability, target: tl.pert.target } : undefined,
    findings: { critical: metrics.findings.filter((f) => f.severity === "CRITICO").length, attention: metrics.findings.filter((f) => f.severity === "ATENCAO").length },
    openRisks: model.risks.filter((r) => r.status === "ABERTO").length,
  };
}
