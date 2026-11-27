/**
 * O que o visualizador de card mostra, num formato único para as duas fontes de tarefa — a API real (`TaskView`, `/api/tasks/{id}`)
 * e a rede social DEMO (`SocialTask`) — e os fatos do resumo, cada um com "de onde vem" (D-12: só números calculados pelo sistema;
 * nada é estimado aqui). Projeto: o modelo da Mesa (`ProjectModel`, motores CPM/EVM/métricas) ou o esquema leve do Mural
 * (`SocialProject`), que não tem cronograma — então os números do motor ficam ausentes, nunca zerados.
 */
import { evmView } from "@/lib/projects/views";
import { summarizeProject } from "@/lib/projects/autopilot/overview";
import type { ProjectModel } from "@/lib/projects/types";
import type { SocialProject, SocialState, SocialTask } from "@/lib/social/types";
import { effectiveDueOf, isOpenState } from "@/lib/tasks/acervo";
import { criteriaProgress, type Criterion, type TaskView } from "@/lib/tasks/client";
import { daysBetween, deadlineStatus, isIsoDate, type DeadlineKind } from "@/lib/tasks/legalDeadline";
import { workStatusOf } from "@/lib/tasks/status";

export type DataSource = "API" | "DEMO";

export interface TaskSubject {
  kind: "tarefa";
  source: DataSource;
  id: string;
  title: string;
  type: string;
  state: string;
  priority: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  dueAt: string | null;
  legalDueAt: string | null;
  legalRuleId: string | null;
  legalBaseDate: string | null;
  version: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  sourceKind: string | null;
  sourceRef: string | null;
  linkMode: string | null;
  accessClass: string;
  visibility: string;
  category: string | null;
  area: string | null;
  objective: string;
  descriptionMd: string;
  deliverables: string[];
  criteria: Criterion[];
  references: { label: string; url: string }[];
  extensions: Record<string, string>;
  blockReason: string | null;
  blockedByTaskId: string | null;
  originalTaskId: string | null;
  aiGenerated: boolean;
  seals: { issuer: string; label: string }[];
  editable: boolean;
}

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);

export function subjectFromView(v: TaskView): TaskSubject {
  return {
    kind: "tarefa", source: "API", id: v.id ?? "", title: v.title ?? "", type: v.type ?? "DOCUMENTO", state: v.state ?? "RASCUNHO", priority: v.priority ?? null,
    responsibleId: v.responsibleId ?? null, responsibleName: null, ownerId: v.ownerId ?? null, ownerName: null,
    dueAt: day(v.dueAt), legalDueAt: day(v.legalDueAt), legalRuleId: v.legalDeadlineRuleId ?? null, legalBaseDate: day(v.legalDeadlineBaseDate),
    version: v.version ?? null, createdAt: v.createdAt ?? null, updatedAt: v.updatedAt ?? null,
    sourceKind: v.sourceKind ?? null, sourceRef: v.sourceRef ?? null, linkMode: v.linkMode ?? null,
    accessClass: v.accessClass ?? "INTERNO", visibility: v.visibility ?? "PRIVADA", category: v.category ?? null, area: v.area ?? null,
    objective: v.objective ?? "", descriptionMd: v.descriptionMd ?? "",
    deliverables: (v.deliverables ?? []).map((d) => d.text ?? "").filter(Boolean),
    criteria: (v.acceptanceCriteria ?? []).map((c) => ({ text: c.text ?? "", done: !!c.done })),
    references: (v.references ?? []).map((r) => ({ label: r.label ?? "", url: r.url ?? "" })),
    extensions: { ...(v.extensions ?? {}) },
    blockReason: v.blockReason?.trim() || null, blockedByTaskId: v.blockedByTaskId ?? null, originalTaskId: null, aiGenerated: v.sourceKind === "TEXTO_IA",
    seals: [], editable: v.editable !== false,
  };
}

export function subjectFromSocial(state: SocialState, t: SocialTask, viewerId: string | null): TaskSubject {
  const name = (id: string | null) => (id ? state.people.find((p) => p.id === id)?.fullName ?? null : null);
  return {
    kind: "tarefa", source: "DEMO", id: t.id, title: t.title, type: t.type, state: t.state, priority: null,
    responsibleId: t.responsibleId, responsibleName: name(t.responsibleId), ownerId: t.ownerId, ownerName: name(t.ownerId),
    dueAt: day(t.dueAt), legalDueAt: day(t.legalDueAt), legalRuleId: null, legalBaseDate: null, version: null, createdAt: t.createdAt, updatedAt: null,
    sourceKind: t.originalTaskId ? "REMIX" : t.aiGenerated ? "TEXTO_IA" : null, sourceRef: t.originalTaskId, linkMode: null,
    accessClass: t.accessClass, visibility: t.visibility, category: t.category, area: null,
    objective: t.summary ?? "", descriptionMd: "", deliverables: [], criteria: [], references: [], extensions: t.format ? { format: t.format } : {},
    blockReason: t.blockReason, blockedByTaskId: null, originalTaskId: t.originalTaskId, aiGenerated: t.aiGenerated,
    seals: t.seals.map((s) => ({ issuer: s.issuer, label: s.label })), editable: t.ownerId === viewerId,
  };
}

/* ── fatos do resumo ─────────────────────────────────────────────────────────────────────────────────────── */

export type Fact =
  | { id: string; from: string; type: "label"; key: string; vars?: Record<string, string | number> }
  | { id: string; from: string; type: "text"; text: string }
  | { id: string; from: string; type: "deadline"; date: string; days: number; status: DeadlineKind | "FECHADA"; legal?: boolean }
  | { id: string; from: string; type: "number"; value: number | null; digits: number; money?: boolean }
  | { id: string; from: string; type: "progress"; done: number; total: number; percent: number | null }
  | { id: string; from: string; type: "date"; date: string | null }
  | { id: string; from: string; type: "list"; items: string[] };

/** Prazo com dias restantes (negativo = vencido); fechada (concluída, arquivada, publicada) não cobra prazo. */
function deadlineFact(id: string, from: string, date: string | null, today: string, open: boolean, legal = false): Fact | null {
  if (!date || !isIsoDate(date)) return null;
  const st = deadlineStatus(date, today);
  return { id, from, type: "deadline", date, days: st.days, status: open ? st.kind : "FECHADA", legal };
}

export function taskFacts(s: TaskSubject, today: string): Fact[] {
  const out: (Fact | null)[] = [];
  const ws = workStatusOf(s.state as never);
  const open = isOpenState(s.state as never);
  out.push({ id: "state", from: "cardviewer.from.state", type: "label", key: ws ? `social.workStatus.${ws}` : `social.taskState.${s.state}` });
  out.push(s.priority ? { id: "priority", from: "cardviewer.from.priority", type: "label", key: `tasks.priority.${s.priority}` } : null);
  out.push({ id: "responsible", from: "cardviewer.from.responsible", type: "text", text: s.responsibleName ?? (s.responsibleId ? `#${s.responsibleId.slice(0, 8)}` : "—") });
  out.push(deadlineFact("due", "cardviewer.from.due", s.dueAt, today, open));
  out.push(deadlineFact("legalDue", s.legalRuleId ? "cardviewer.from.legalDueRule" : "cardviewer.from.legalDue", s.legalDueAt, today, open, true));
  const eff = effectiveDueOf(s.dueAt, s.legalDueAt);
  if (eff && s.dueAt && s.legalDueAt) out.push(deadlineFact("effectiveDue", "cardviewer.from.effectiveDue", eff, today, open, eff === s.legalDueAt));
  out.push(s.version !== null ? { id: "version", from: "cardviewer.from.version", type: "number", value: s.version, digits: 0 } : null);
  out.push({ id: "origin", from: "cardviewer.from.origin", type: "label", key: s.sourceKind ? `cardviewer.origin.${originGroup(s.sourceKind)}` : "cardviewer.origin.MANUAL", vars: { ref: s.sourceRef ?? "" } });
  out.push({ id: "access", from: "cardviewer.from.access", type: "label", key: `social.access.${s.accessClass}` });
  out.push({ id: "visibility", from: "cardviewer.from.visibility", type: "label", key: `social.visibility.${s.visibility}` });
  const p = criteriaProgress(s.criteria);
  out.push({ id: "criteria", from: "cardviewer.from.criteria", type: "progress", done: p.done, total: p.total, percent: p.percent });
  out.push(s.updatedAt ? { id: "updatedAt", from: "cardviewer.from.updatedAt", type: "date", date: s.updatedAt } : null);
  return out.filter((f): f is Fact => !!f);
}

/** Agrupa os ~80 `sourceKind` da API em origens legíveis. */
export function originGroup(k: string): string {
  const u = k.toUpperCase();
  if (u.startsWith("GOOGLE")) return "GOOGLE";
  if (u.startsWith("MS_") || u === "MICROSOFT") return "MICROSOFT";
  if (u.startsWith("APPLE")) return "APPLE";
  if (["MANUAL", "ARQUIVO", "COLAR", "LINK", "EMAIL", "PROTOCOLO", "FOTO", "TEXTO_IA", "REMIX", "DECIA", "AUTOPILOT", "ATA_VIVA", "DOSSIE", "EXTRACAO", "EXTRAIDA_DE_PROJETO"].includes(u)) return u;
  return "OUTRA";
}

/* ── projeto ─────────────────────────────────────────────────────────────────────────────────────────────── */

export type ProjectSubject =
  | { kind: "projeto"; source: "DEMO"; variant: "MESA"; model: ProjectModel }
  | { kind: "projeto"; source: "DEMO"; variant: "MURAL"; project: SocialProject; state: SocialState };

export const pendingChanges = (m: ProjectModel) => m.changes.filter((c) => c.status === "SOLICITADA" || c.status === "EM_ANALISE");

export function projectFacts(p: ProjectSubject, today: string): Fact[] {
  if (p.variant === "MURAL") {
    const pr = p.project;
    const out: (Fact | null)[] = [
      { id: "status", from: "cardviewer.from.projectStatus", type: "label", key: `social.projectStatus.${pr.status}` },
      { id: "phase", from: "cardviewer.from.phase", type: "label", key: `pm.phase.${pr.currentPhase}` },
      pr.nextMilestoneAt ? deadlineFact("nextMilestone", "cardviewer.from.socialMilestone", day(pr.nextMilestoneAt), today, true) : null,
      { id: "tasks", from: "cardviewer.from.socialTasks", type: "number", value: pr.taskIds.length, digits: 0 },
      { id: "people", from: "cardviewer.from.socialPeople", type: "number", value: pr.peopleCount, digits: 0 },
      { id: "engine", from: "cardviewer.from.noEngine", type: "label", key: "cardviewer.fact.noEngine" },
    ];
    return out.filter((f): f is Fact => !!f);
  }
  const m = p.model;
  const s = summarizeProject(m, today);
  const e = evmView(m);
  const out: (Fact | null)[] = [
    { id: "phase", from: "cardviewer.from.phase", type: "label", key: `pm.phase.${m.currentPhase}` },
    { id: "progress", from: "cardviewer.from.progress", type: "progress", done: s.tasks.done, total: s.tasks.total, percent: s.progress },
    s.nextMilestone
      ? { id: "nextMilestone", from: s.nextMilestone.source === "TAP" ? "cardviewer.from.milestoneTap" : "cardviewer.from.milestone", type: "deadline", date: s.nextMilestone.date, days: daysBetween(today, s.nextMilestone.date), status: deadlineStatus(s.nextMilestone.date, today).kind }
      : { id: "nextMilestone", from: "cardviewer.from.milestone", type: "label", key: "cardviewer.fact.none" },
    s.nextMilestone ? { id: "nextMilestoneTitle", from: "cardviewer.from.milestone", type: "text", text: s.nextMilestone.title } : null,
    s.finish ? { id: "criticalPath", from: "cardviewer.from.cpm", type: "list", items: s.finish.criticalCodes } : { id: "criticalPath", from: "cardviewer.from.cpm", type: "label", key: "cardviewer.fact.noSchedule" },
    s.finish ? { id: "finish", from: "cardviewer.from.cpm", type: "date", date: s.finish.date } : null,
    s.deadline ? { id: "overrun", from: "cardviewer.from.overrun", type: "number", value: s.overrunDays, digits: 0 } : null,
    { id: "cpi", from: "cardviewer.from.cpi", type: "number", value: e.cpi, digits: 2 },
    { id: "spi", from: "cardviewer.from.spi", type: "number", value: e.spi, digits: 2 },
    { id: "eac", from: "cardviewer.from.eac", type: "number", value: e.eac, digits: 0, money: true },
    { id: "openRisks", from: "cardviewer.from.risks", type: "number", value: s.openRisks, digits: 0 },
    { id: "pendingChanges", from: "cardviewer.from.changes", type: "number", value: pendingChanges(m).length, digits: 0 },
    { id: "version", from: "cardviewer.from.projectVersion", type: "number", value: m.version, digits: 0 },
  ];
  return out.filter((f): f is Fact => !!f);
}

export const projectTitle = (p: ProjectSubject) => (p.variant === "MESA" ? p.model.title : p.project.title);
export const projectId = (p: ProjectSubject) => (p.variant === "MESA" ? p.model.id : p.project.id);
