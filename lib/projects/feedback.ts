/**
 * Feedback da janela segmentada (RF22 + RF43): organiza os indicadores de `metrics.ts` para leitura — o que mudou desde a versão
 * anterior, o que atacar primeiro, o que está bom e como o trabalho está distribuído no grupo. Tudo determinístico (D-12): a IA,
 * quando conectada, redige A PARTIR destas partes; sem ela, a interface monta o texto com as mesmas partes e diz que foi o sistema.
 * Nada aqui avalia pessoas: a distribuição fala de carga atribuída e participação agregada (GUIA_DE_CARREIRA §3.7).
 */
import { scheduleOf } from "./derive";
import { PHASE_META } from "./lifecycle";
import type { Finding, Metric, MetricGroup, MetricId, MetricStatus, ProjectMetrics, WorkspaceTab } from "./metrics";
import type { ProjectModel } from "./types";

export const METRIC_GROUPS: readonly MetricGroup[] = ["QUALIDADE", "GOVERNANCA", "GRUPO"];
export const allMetrics = (m: ProjectMetrics): Metric[] => [...m.quality, ...m.governance, ...m.group];

// "sem dados" fica entre atenção e adequado: dado que surge adequado melhora; que surge com problema piora
const RANK: Record<MetricStatus, number> = { CRITICO: 0, ATENCAO: 1, SEM_DADOS: 1.5, OK: 2 };

export interface MetricChange { id: MetricId; group: MetricGroup; from: MetricStatus; to: MetricStatus; direction: "MELHOROU" | "PIOROU"; tab: WorkspaceTab }

/** Indicadores cujo status mudou entre dois momentos (versão anterior → atual, ou início da sessão → agora). */
export function metricChanges(prev: ProjectMetrics, next: ProjectMetrics): MetricChange[] {
  const before = new Map(allMetrics(prev).map((m) => [m.id, m.status]));
  const out: MetricChange[] = [];
  for (const m of allMetrics(next)) {
    const from = before.get(m.id);
    if (!from || from === m.status) continue;
    out.push({ id: m.id, group: m.group, from, to: m.status, direction: RANK[m.status] > RANK[from] ? "MELHOROU" : "PIOROU", tab: m.tab });
  }
  return out.sort((a, b) => (a.direction === b.direction ? 0 : a.direction === "PIOROU" ? -1 : 1));
}

export type StatusCounts = Record<MetricStatus, number>;
export interface FeedbackDigest {
  counts: Record<MetricGroup, StatusCounts>;
  /** o que atacar primeiro: críticos, depois atenção; dentro da mesma gravidade, qualidade → governança → grupo */
  priorities: Finding[];
  /** indicadores adequados com dado (pontos fortes a manter) */
  strengths: MetricId[];
}

export function digest(metrics: ProjectMetrics, max = 5): FeedbackDigest {
  const empty = (): StatusCounts => ({ OK: 0, ATENCAO: 0, CRITICO: 0, SEM_DADOS: 0 });
  const counts: Record<MetricGroup, StatusCounts> = { QUALIDADE: empty(), GOVERNANCA: empty(), GRUPO: empty() };
  for (const m of allMetrics(metrics)) counts[m.group][m.status] += 1;
  const groupOf = new Map(allMetrics(metrics).map((m) => [m.id, m.group]));
  const order = (f: Finding) => (f.severity === "CRITICO" ? 0 : 10) + METRIC_GROUPS.indexOf(groupOf.get(f.metricId) ?? "GRUPO");
  const priorities = [...metrics.findings].sort((a, b) => order(a) - order(b)).slice(0, max);
  const strengths = allMetrics(metrics).filter((m) => m.status === "OK" && m.group !== "GRUPO").map((m) => m.id).slice(0, 4);
  return { counts, priorities, strengths };
}

export interface PersonLoad { userId: string; days: number; tasks: number; critical: number; done: number }

/** Carga atribuída por pessoa da equipe (dias de trabalho das atividades em que é responsável), inclusive quem está sem nada. */
export function workload(model: ProjectModel): { people: PersonLoad[]; unassigned: number; totalDays: number; assignedDays: number } {
  const s = scheduleOf(model);
  const byUser = new Map<string, PersonLoad>(model.team.map((m) => [m.userId, { userId: m.userId, days: 0, tasks: 0, critical: 0, done: 0 }]));
  let unassigned = 0;
  let totalDays = 0;
  for (const t of model.tasks) {
    if (t.milestone) continue;
    const days = Math.max(1, t.durationDays);
    totalDays += days;
    if (!t.responsibleId) {
      unassigned += 1;
      continue;
    }
    const p = byUser.get(t.responsibleId) ?? { userId: t.responsibleId, days: 0, tasks: 0, critical: 0, done: 0 };
    p.days += days;
    p.tasks += 1;
    if (s.ok && s.rows[t.id]?.critical) p.critical += 1;
    if (t.status === "CONCLUIDA") p.done += 1;
    byUser.set(t.responsibleId, p);
  }
  const people = [...byUser.values()].sort((a, b) => b.days - a.days || a.userId.localeCompare(b.userId));
  return { people, unassigned, totalDays, assignedDays: people.reduce((n, p) => n + p.days, 0) };
}

/** Participação agregada (sem ranking individual): quantas pessoas da equipe já editaram e quantas edições houve. */
export function participation(model: ProjectModel): { authors: number; team: number; edits: number; lastAt?: string } {
  const teamIds = new Set(model.team.map((m) => m.userId));
  const authors = new Set(model.versions.map((v) => v.actorId).filter((id) => teamIds.has(id)));
  return { authors: authors.size, team: model.team.length, edits: model.versions.length, lastAt: model.versions.at(-1)?.at };
}

/** Partes da leitura do feedback; a interface traduz cada uma (`pm.fb.n.<kind>`). */
export type NarrativePart =
  | { kind: "phase"; vars: { phase: string; dominant: string; passed: number; total: number } }
  | { kind: "critical"; metricIds: MetricId[] }
  | { kind: "attention"; metricIds: MetricId[] }
  | { kind: "strengths"; metricIds: MetricId[] }
  | { kind: "group"; vars: { authors: number; team: number; share: number; reviewed: number; done: number } }
  | { kind: "next"; metricId: MetricId; tab: WorkspaceTab }
  | { kind: "allGood" };

export function narrative(model: ProjectModel, metrics: ProjectMetrics): NarrativePart[] {
  const parts: NarrativePart[] = [];
  const passed = metrics.gate.checks.filter((c) => c.ok).length;
  parts.push({ kind: "phase", vars: { phase: model.currentPhase, dominant: PHASE_META[model.currentPhase].dominant, passed, total: metrics.gate.checks.length } });
  const d = digest(metrics, 99);
  const critical = d.priorities.filter((f) => f.severity === "CRITICO").map((f) => f.metricId);
  const attention = d.priorities.filter((f) => f.severity === "ATENCAO").map((f) => f.metricId);
  if (critical.length) parts.push({ kind: "critical", metricIds: critical });
  if (attention.length) parts.push({ kind: "attention", metricIds: attention });
  if (d.strengths.length) parts.push({ kind: "strengths", metricIds: d.strengths });
  const p = participation(model);
  const w = workload(model);
  const top = w.people[0];
  const done = model.tasks.filter((t) => t.status === "CONCLUIDA" && !t.milestone);
  const reviewed = done.filter((t) => t.reviewerId && t.reviewerId !== t.responsibleId).length;
  parts.push({ kind: "group", vars: { authors: p.authors, team: p.team, share: top && w.assignedDays ? Math.round((top.days / w.assignedDays) * 100) : 0, reviewed, done: done.length } });
  const first = d.priorities[0];
  parts.push(first ? { kind: "next", metricId: first.metricId, tab: first.tab } : { kind: "allGood" });
  return parts;
}
