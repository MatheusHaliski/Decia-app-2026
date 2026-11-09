/**
 * Métricas ágeis da Mesa (aula de projetos, Tema 4 — Scrum e Kanban): velocidade por sprint, gráfico de burndown da sprint,
 * diagrama de fluxo cumulativo (CFD) e tempos de fluxo (lead time = da entrada à entrega; cycle time = do início à entrega).
 * Sem "story points" no modelo, o esforço é medido em dias de trabalho estimados (a mesma unidade do cronograma); a interface diz
 * isso. Funções puras sobre datas ISO (AAAA-MM-DD…), dia a dia em UTC.
 */
import type { FlowStatus } from "../types";

export interface AgileTask { id: string; status: FlowStatus; effort: number; sprint?: number; createdAt?: string; startedAt?: string; doneAt?: string }
export interface SprintWindow { number: number; start: string; end: string; goal?: string }

const day = (iso: string) => iso.slice(0, 10);
const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${day(d)}T00:00:00Z`);
const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Dias de calendário de `from` a `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = day(from); d <= day(to); d = addDays(d, 1)) out.push(d);
  return out;
}

export interface VelocityRow { number: number; goal?: string; planned: number; done: number; completion: number | null }

/** Velocidade: esforço planejado na sprint × esforço entregue (atividades concluídas da sprint). */
export function velocity(tasks: readonly AgileTask[], sprints: readonly SprintWindow[]): VelocityRow[] {
  return [...sprints].sort((a, b) => a.number - b.number).map((s) => {
    const of = tasks.filter((t) => t.sprint === s.number);
    const planned = r2(of.reduce((n, t) => n + t.effort, 0));
    const done = r2(of.filter((t) => t.status === "CONCLUIDA").reduce((n, t) => n + t.effort, 0));
    return { number: s.number, goal: s.goal, planned, done, completion: planned > 0 ? r2(done / planned) : null };
  });
}

/** Média de velocidade das sprints já encerradas até `today` (base para planejar a próxima). */
export function averageVelocity(rows: readonly VelocityRow[], sprints: readonly SprintWindow[], today: string): number | null {
  const closed = rows.filter((r) => {
    const s = sprints.find((x) => x.number === r.number);
    return s ? day(s.end) < day(today) : false;
  });
  return closed.length ? r2(closed.reduce((n, r) => n + r.done, 0) / closed.length) : null;
}

export interface BurnPoint { day: string; ideal: number; remaining: number | null }

/** Burndown da sprint: linha ideal do total ao zero no último dia; restante real até `today` (dias futuros = null). */
export function burndown(tasks: readonly AgileTask[], sprint: SprintWindow, today: string): BurnPoint[] {
  const of = tasks.filter((t) => t.sprint === sprint.number);
  const total = of.reduce((n, t) => n + t.effort, 0);
  const days = daysBetween(sprint.start, sprint.end);
  const span = Math.max(1, days.length - 1);
  return days.map((d, i) => {
    const doneBy = of.filter((t) => t.doneAt && day(t.doneAt) <= d).reduce((n, t) => n + t.effort, 0);
    return { day: d, ideal: r2(total * (1 - i / span)), remaining: d <= day(today) ? r2(total - doneBy) : null };
  });
}

export interface CfdPoint { day: string; todo: number; doing: number; done: number }

/** Fluxo cumulativo: por dia, quantas atividades estavam a fazer, em andamento e concluídas (pelas datas registradas). */
export function cfd(tasks: readonly AgileTask[], from: string, to: string): CfdPoint[] {
  return daysBetween(from, to).map((d) => {
    let todo = 0;
    let doing = 0;
    let done = 0;
    for (const t of tasks) {
      if (!t.createdAt || day(t.createdAt) > d) continue;
      if (t.doneAt && day(t.doneAt) <= d) done += 1;
      else if (t.startedAt && day(t.startedAt) <= d) doing += 1;
      else todo += 1;
    }
    return { day: d, todo, doing, done };
  });
}

export interface FlowTimes { lead: number | null; cycle: number | null; items: { id: string; lead: number | null; cycle: number | null }[]; wip: number }

/** Lead e cycle time (em dias, médias das concluídas) e o trabalho em andamento (WIP) de hoje. */
export function flowTimes(tasks: readonly AgileTask[]): FlowTimes {
  const span = (a?: string, b?: string) => (a && b ? r2((Date.parse(b) - Date.parse(a)) / DAY_MS) : null);
  const items = tasks.filter((t) => t.status === "CONCLUIDA").map((t) => ({ id: t.id, lead: span(t.createdAt, t.doneAt), cycle: span(t.startedAt, t.doneAt) }));
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  return { lead: avg(items.map((i) => i.lead)), cycle: avg(items.map((i) => i.cycle)), items, wip: tasks.filter((t) => t.status === "EM_ANDAMENTO" || t.status === "EM_REVISAO").length };
}
