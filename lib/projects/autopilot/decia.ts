/**
 * Autopiloto ↔ DECIA (RF30.CA06: "abrir sessão DECIA sobre a proposta"). Funções puras:
 *  • `proposalPlan` / `projectPlan`: a proposta em rascunho (ou o esquema de um projeto já salvo) reduzida ao que o grupo discute —
 *    fases, atividades com código, duração, prazo e responsável, término pelo caminho crítico e o aviso de estouro (D-12: só números
 *    do motor);
 *  • `renderPlan`: o texto anexado à sessão, que é também a minuta inicial. As linhas das atividades têm formato estável
 *    (`- [T01] título | 5 d | 2026-11-30 | responsável`, datas ISO, fase marcada como `[EXECUCAO]`) para que o que a sessão decidir
 *    na minuta possa voltar ao rascunho;
 *  • `proposalSessionInput` / `projectSessionInput`: título, objetivo, membros sugeridos (os responsáveis da proposta) e o
 *    artefato para `SessionRepository.create`;
 *  • `diffPlan`: o que mudou entre a base anexada e a minuta atual (renomear, duração, prazo, responsável, fase, incluir, remover,
 *    prazo e objetivo da demanda) — linhas ilegíveis viram avisos, nunca mudanças adivinhadas; sem as linhas da proposta (a minuta
 *    foi reescrita) não há mudança nenhuma;
 *  • `applyPlanChanges`: aplica as mudanças ao rascunho pelas mesmas edições do passo 3 (`editProposal`);
 *  • `planChangeCommands`: no projeto já salvo, cada mudança vira um pedido de mudança (`CHANGE_REQUEST`, controle integrado).
 */
import type { NewSessionInput } from "@/lib/decia/session/repository";
import type { SessionArtifactKind } from "@/lib/decia/session/types";
import type { ProjectCommand } from "../commands";
import { effectiveDuration } from "../derive";
import { PROJECT_PHASES, type ProjectModel, type ProjectPhase } from "../types";
import { diffDays, isoOf, type IsoDate } from "./dates";
import { summarizeProject } from "./overview";
import { durationOf, editProposal, proposalNetwork, scheduleProposal, type ProjectProposal, type ProposalError, type ProposalOp } from "./proposal";
import { proposalDraftHref } from "./drafts";
import { fold } from "./text";

export type People = Readonly<Record<string, { name: string }>>;

export interface PlanTask {
  code: string;
  /** chave da atividade no rascunho ou id no projeto */
  ref: string;
  title: string;
  phase: ProjectPhase;
  /** duração em dias (TE do PERT); `null` = marco */
  days: number | null;
  due: IsoDate | null;
  responsibleId: string | null;
  critical: boolean;
}
export interface Plan {
  kind: SessionArtifactKind;
  title: string;
  objective: string;
  deadline: IsoDate | null;
  finish: IsoDate | null;
  finishDays: number;
  overrunDays: number;
  /** folga até o prazo (só na proposta, com prazo) */
  slackDays: number | null;
  criticalPath: string[];
  phases: { phase: ProjectPhase; tasks: PlanTask[] }[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function proposalPlan(p: ProjectProposal): Plan {
  const sched = scheduleProposal(p);
  const net = proposalNetwork(p);
  const codeOf = new Map(net.tasks.map((t, i) => [t.key, `T${String(i + 1).padStart(2, "0")}`]));
  const phases = p.phases.filter((ph) => ph.included).map((ph) => ({
    phase: ph.phase,
    tasks: net.tasks.filter((t) => t.phase === ph.phase).map((t): PlanTask => ({
      code: codeOf.get(t.key)!, ref: t.key, title: t.title, phase: t.phase, days: t.milestone ? null : r1(durationOf(t)),
      due: sched.rows[t.key]?.due ?? t.dueAt ?? null, responsibleId: t.responsibleId ?? null, critical: Boolean(sched.rows[t.key]?.critical),
    })),
  })).filter((ph) => ph.tasks.length);
  return {
    kind: "PROPOSTA_AUTOPILOTO", title: p.title, objective: p.objective, deadline: p.deadline ?? null,
    finish: sched.ok ? sched.finishDate : null, finishDays: sched.ok ? r1(sched.finish) : 0, overrunDays: sched.overrunDays, slackDays: sched.slackDays ?? null,
    criticalPath: sched.criticalPath.map((k) => codeOf.get(k) ?? k), phases,
  };
}

export function projectPlan(model: ProjectModel, today: IsoDate): Plan {
  const s = summarizeProject(model, today);
  const critical = new Set(s.finish?.criticalCodes ?? []);
  const phases = PROJECT_PHASES.map((phase) => ({
    phase,
    tasks: model.tasks.filter((t) => t.phase === phase).map((t): PlanTask => ({
      code: t.code, ref: t.id, title: t.title, phase, days: t.milestone ? null : r1(effectiveDuration(t)), due: t.dueAt ?? null,
      responsibleId: t.responsibleId ?? null, critical: critical.has(t.code),
    })),
  })).filter((ph) => ph.tasks.length);
  return {
    kind: "PROJETO", title: model.title, objective: model.charter.objectives[0]?.text || model.charter.product || model.title, deadline: s.deadline ?? null,
    finish: s.finish?.date ?? null, finishDays: s.finish ? r1(s.finish.days) : 0, overrunDays: s.overrunDays, slackDays: null, criticalPath: s.finish?.criticalCodes ?? [], phases,
  };
}

// ------------------------------------------------------------------ texto anexado (e minuta inicial)

/** Rótulos traduzidos (a lógica não depende do idioma); as datas dos avisos vêm formatadas pela tela. */
export interface PlanLabels {
  heading: (kind: SessionArtifactKind, title: string) => string;
  objective: string;
  deadline: string;
  finish: (days: number, date: IsoDate) => string;
  overrun: (n: number, deadline: IsoDate | null) => string;
  fits: (slack: number | null, deadline: IsoDate) => string;
  noDeadline: string;
  criticalPath: (path: string) => string;
  phase: (n: number, phase: ProjectPhase) => string;
  milestone: string;
  unassigned: string;
  howTo: string;
}
export interface SessionLabels extends PlanLabels {
  sessionTitle: (kind: SessionArtifactKind, title: string) => string;
  sessionObjective: (kind: SessionArtifactKind, title: string) => string;
}

const NONE = "—";
const cell = (s: string) => s.replace(/\s+/g, " ").replace(/\|/g, "/").trim();
const daysText = (d: number) => `${d} d`;

export function renderPlan(plan: Plan, people: People, labels: PlanLabels): { text: string; refs: Record<string, string> } {
  const refs: Record<string, string> = {};
  const lines = [
    labels.heading(plan.kind, cell(plan.title)),
    `◎ ${labels.objective}: ${cell(plan.objective)}`,
    `⏱ ${labels.deadline}: ${plan.deadline ?? NONE}`,
  ];
  if (plan.finish) lines.push(`✦ ${labels.finish(plan.finishDays, plan.finish)}`);
  if (plan.overrunDays > 0) lines.push(`✦ ${labels.overrun(plan.overrunDays, plan.deadline)}`);
  else if (plan.deadline && plan.finish) lines.push(`✦ ${labels.fits(plan.slackDays, plan.deadline)}`);
  else if (!plan.deadline) lines.push(`✦ ${labels.noDeadline}`);
  if (plan.criticalPath.length) lines.push(`✦ ${labels.criticalPath(plan.criticalPath.join(" → "))}`);
  lines.push("", labels.howTo);
  plan.phases.forEach((ph, i) => {
    lines.push("", `## ${labels.phase(i + 1, ph.phase)} [${ph.phase}]`);
    for (const t of ph.tasks) {
      refs[t.code] = t.ref;
      const who = t.responsibleId ? cell(people[t.responsibleId]?.name ?? t.responsibleId) : labels.unassigned;
      lines.push(`- [${t.code}] ${cell(t.title)} | ${t.days === null ? labels.milestone : daysText(t.days)} | ${t.due ?? NONE} | ${who}`);
    }
  });
  return { text: lines.join("\n"), refs };
}

// ------------------------------------------------------------------ sessão nova

/** Membros sugeridos: os responsáveis da proposta (e, no projeto, gerente e patrocinador), sem quem abre e só gente conhecida. */
export function suggestedMembers(ids: readonly (string | null | undefined)[], actorId: string, people: People): { userId: string; role: "EDITOR" }[] {
  const seen = new Set<string>();
  const out: { userId: string; role: "EDITOR" }[] = [];
  for (const id of ids) {
    if (!id || id === actorId || seen.has(id) || !people[id]) continue;
    seen.add(id);
    out.push({ userId: id, role: "EDITOR" });
  }
  return out;
}

function sessionInput(plan: Plan, extraMembers: readonly (string | undefined)[], link: { href: string; draftId: string | null; projectId: string | null }, ctx: { actorId: string; people: People; labels: SessionLabels }): NewSessionInput {
  const { text, refs } = renderPlan(plan, ctx.people, ctx.labels);
  const tasks = plan.phases.flatMap((ph) => ph.tasks);
  return {
    title: ctx.labels.sessionTitle(plan.kind, plan.title),
    objective: ctx.labels.sessionObjective(plan.kind, plan.title),
    projectId: link.projectId,
    participants: suggestedMembers([...extraMembers, ...tasks.map((t) => t.responsibleId)], ctx.actorId, ctx.people),
    artifact: {
      kind: plan.kind, title: plan.title, href: link.href, draftId: link.draftId, projectId: link.projectId, text, refs,
      summary: { phases: plan.phases.length, tasks: tasks.length, deadline: plan.deadline, finish: plan.finish, finishDays: plan.finishDays, overrunDays: plan.overrunDays },
    },
  };
}

/** Sessão do DECIA sobre a proposta ainda em rascunho (antes de salvar). */
export function proposalSessionInput(p: ProjectProposal, ctx: { draftId: string; actorId: string; people: People; labels: SessionLabels }): NewSessionInput {
  return sessionInput(proposalPlan(p), [], { href: proposalDraftHref(ctx.draftId), draftId: ctx.draftId, projectId: null }, ctx);
}

/** Sessão do DECIA sobre um projeto já salvo (visão geral `/projects/[id]`). */
export function projectSessionInput(model: ProjectModel, ctx: { actorId: string; people: People; labels: SessionLabels; today: IsoDate }): NewSessionInput {
  return sessionInput(projectPlan(model, ctx.today), [model.charter.managerId, model.charter.sponsorId], { href: `/projects/${encodeURIComponent(model.id)}`, draftId: null, projectId: model.id }, ctx);
}

// ------------------------------------------------------------------ leitura da minuta e diferenças

export type PlanIssueReason = "RESPONSAVEL_DESCONHECIDO" | "SEM_FASE" | "DATA_INVALIDA" | "DURACAO_INVALIDA" | "CODIGO_REPETIDO";
export interface PlanIssue { line: number; text: string; reason: PlanIssueReason }

export interface ParsedTask {
  code: string | null;
  phase: ProjectPhase | null;
  title: string;
  /** `null` = marco; `undefined` = campo ausente ou ilegível */
  days?: number | null;
  due?: IsoDate | null;
  responsible?: string;
  line: number;
  raw: string;
}
export interface ParsedPlan { found: boolean; objective?: string; deadline?: IsoDate | null; tasks: ParsedTask[]; issues: PlanIssue[] }

const PHASE_LINE = /^\s*#{1,4}\s.*\[([A-Z_]+)\]\s*$/;
const TASK_LINE = /^\s*[-*•]?\s*\[(\+|[A-Za-z0-9][A-Za-z0-9._-]{0,15})\]\s*(.*)$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMPTY = new Set(["", "—", "-", "–"]);

function parseDate(s: string): IsoDate | null | undefined {
  const v = s.trim();
  if (EMPTY.has(v)) return null;
  const m = ISO.exec(v);
  return m ? (isoOf(Number(m[1]), Number(m[2]), Number(m[3])) ?? undefined) : undefined;
}

export function parsePlan(text: string, labels: Pick<PlanLabels, "milestone">): ParsedPlan {
  const out: ParsedPlan = { found: false, tasks: [], issues: [] };
  let phase: ProjectPhase | null = null;
  const milestone = fold(labels.milestone);
  text.split("\n").forEach((raw, idx) => {
    const line = idx + 1;
    const ph = PHASE_LINE.exec(raw);
    if (ph && (PROJECT_PHASES as readonly string[]).includes(ph[1]!)) {
      phase = ph[1] as ProjectPhase;
      return;
    }
    const obj = /^\s*◎[^:]*:\s*(.*)$/.exec(raw);
    if (obj) {
      out.objective = obj[1]!.trim();
      return;
    }
    const dl = /^\s*⏱[^:]*:\s*(.*)$/.exec(raw);
    if (dl) {
      const d = parseDate(dl[1]!);
      if (d === undefined) out.issues.push({ line, text: raw.trim(), reason: "DATA_INVALIDA" });
      else out.deadline = d;
      return;
    }
    const tl = TASK_LINE.exec(raw);
    if (!tl) return;
    const fields = tl[2]!.split("|").map((f) => f.trim());
    const title = fields[0] ?? "";
    if (!title) return;
    out.found = true;
    const task: ParsedTask = { code: tl[1] === "+" ? null : tl[1]!, phase, title, line, raw: raw.trim() };
    if (fields[1] !== undefined) {
      const n = /^(\d+(?:[.,]\d+)?)\s*d?\.?$/i.exec(fields[1]);
      if (n) task.days = Number(n[1]!.replace(",", "."));
      else if (fold(fields[1]) === milestone) task.days = null;
      else out.issues.push({ line, text: raw.trim(), reason: "DURACAO_INVALIDA" });
    }
    if (fields[2] !== undefined) {
      const d = parseDate(fields[2]);
      if (d === undefined) out.issues.push({ line, text: raw.trim(), reason: "DATA_INVALIDA" });
      else task.due = d;
    }
    if (fields[3] !== undefined) task.responsible = fields[3];
    out.tasks.push(task);
  });
  return out;
}

export type PlanChange =
  | { type: "OBJETIVO"; from: string; to: string }
  | { type: "PRAZO"; from: IsoDate | null; to: IsoDate | null }
  | { type: "RENOMEAR"; code: string; from: string; to: string }
  | { type: "DURACAO"; code: string; title: string; from: number; to: number }
  | { type: "PRAZO_TAREFA"; code: string; title: string; from: IsoDate | null; to: IsoDate | null }
  | { type: "RESPONSAVEL"; code: string; title: string; from: string | null; to: string | null }
  | { type: "FASE"; code: string; title: string; from: ProjectPhase; to: ProjectPhase }
  | { type: "REMOVER"; code: string; title: string }
  | { type: "INCLUIR"; title: string; phase: ProjectPhase; days: number | null };

export type PlanDiff = { ok: true; changes: PlanChange[]; issues: PlanIssue[] } | { ok: false; reason: "SEM_BLOCO"; issues: PlanIssue[] };

function resolvePerson(raw: string, people: People, unassigned: string): string | null | undefined {
  const v = fold(raw.trim());
  if (EMPTY.has(raw.trim()) || v === fold(unassigned)) return null;
  const hit = Object.entries(people).find(([id, p]) => fold(p.name) === v || id === raw.trim());
  return hit ? hit[0] : undefined;
}

/** O que a minuta atual decide em relação à base anexada (ou à última base aplicada). */
export function diffPlan(baseText: string, nextText: string, people: People, labels: Pick<PlanLabels, "milestone" | "unassigned">): PlanDiff {
  const base = parsePlan(baseText, labels);
  const next = parsePlan(nextText, labels);
  if (!next.found) return { ok: false, reason: "SEM_BLOCO", issues: next.issues };
  const issues = [...next.issues];
  const changes: PlanChange[] = [];
  if (base.objective !== undefined && next.objective !== undefined && next.objective && next.objective !== base.objective) changes.push({ type: "OBJETIVO", from: base.objective, to: next.objective });
  if (base.deadline !== undefined && next.deadline !== undefined && next.deadline !== base.deadline) changes.push({ type: "PRAZO", from: base.deadline, to: next.deadline });

  const byCode = new Map<string, ParsedTask>();
  for (const t of next.tasks) {
    if (!t.code) continue;
    if (byCode.has(t.code)) issues.push({ line: t.line, text: t.raw, reason: "CODIGO_REPETIDO" });
    else byCode.set(t.code, t);
  }
  const baseCodes = new Set(base.tasks.map((t) => t.code).filter((c): c is string => Boolean(c)));
  for (const b of base.tasks) {
    if (!b.code) continue;
    const n = byCode.get(b.code);
    if (!n) {
      changes.push({ type: "REMOVER", code: b.code, title: b.title });
      continue;
    }
    if (n.title !== b.title) changes.push({ type: "RENOMEAR", code: b.code, from: b.title, to: n.title });
    if (n.phase && b.phase && n.phase !== b.phase) changes.push({ type: "FASE", code: b.code, title: n.title, from: b.phase, to: n.phase });
    if (typeof b.days === "number" && typeof n.days === "number" && Math.abs(n.days - b.days) >= 0.05) changes.push({ type: "DURACAO", code: b.code, title: n.title, from: b.days, to: n.days });
    if (b.due !== undefined && n.due !== undefined && n.due !== b.due) changes.push({ type: "PRAZO_TAREFA", code: b.code, title: n.title, from: b.due, to: n.due });
    if (b.responsible !== undefined && n.responsible !== undefined && fold(n.responsible) !== fold(b.responsible)) {
      const to = resolvePerson(n.responsible, people, labels.unassigned);
      if (to === undefined) issues.push({ line: n.line, text: n.raw, reason: "RESPONSAVEL_DESCONHECIDO" });
      else changes.push({ type: "RESPONSAVEL", code: b.code, title: n.title, from: resolvePerson(b.responsible, people, labels.unassigned) ?? null, to });
    }
  }
  // linhas "[+]" que já estavam na base (já aplicadas) não são novas de novo
  const basePlus = new Map<string, number>();
  for (const b of base.tasks) if (!b.code) basePlus.set(`${b.phase}|${b.title}`, (basePlus.get(`${b.phase}|${b.title}`) ?? 0) + 1);
  for (const n of next.tasks) {
    if (n.code && baseCodes.has(n.code)) continue;
    const plusKey = `${n.phase}|${n.title}`;
    if (!n.code && (basePlus.get(plusKey) ?? 0) > 0) {
      basePlus.set(plusKey, basePlus.get(plusKey)! - 1);
      continue;
    }
    if (n.code && byCode.get(n.code) !== n) continue;
    if (!n.phase) {
      issues.push({ line: n.line, text: n.raw, reason: "SEM_FASE" });
      continue;
    }
    changes.push({ type: "INCLUIR", title: n.title, phase: n.phase, days: typeof n.days === "number" ? n.days : null });
  }
  return { ok: true, changes, issues };
}

// ------------------------------------------------------------------ de volta ao rascunho / ao projeto

export interface ApplyResult { proposal: ProjectProposal; applied: PlanChange[]; failed: { change: PlanChange; error: ProposalError }[] }

/** Duração nova pelo PERT: escala os três pontos para o TE ficar no valor decidido (as proporções da incerteza ficam). */
function scaledPert(p: ProjectProposal, key: string, days: number): ProposalOp | null {
  const t = p.tasks.find((x) => x.key === key);
  if (!t) return null;
  const te = durationOf(t);
  if (te <= 0) return { op: "TASK_PERT", key, pert: { o: days, m: days, p: days } };
  const k = days / te;
  return { op: "TASK_PERT", key, pert: { o: r1(t.pert.o * k), m: r1(t.pert.m * k), p: r1(t.pert.p * k) } };
}

function opsFor(p: ProjectProposal, c: PlanChange, refs: Record<string, string>): ProposalOp[] | null {
  const key = "code" in c ? refs[c.code] : undefined;
  if ("code" in c && !key) return null;
  switch (c.type) {
    case "OBJETIVO": return [{ op: "SET_OBJECTIVE", text: c.to }];
    case "PRAZO": return [{ op: "SET_DEADLINE", date: c.to }];
    case "RENOMEAR": return [{ op: "TASK_RENAME", key: key!, title: c.to }];
    case "FASE": return [{ op: "TASK_PHASE", key: key!, phase: c.to }];
    case "DURACAO": {
      const op = scaledPert(p, key!, c.to);
      return op ? [op] : null;
    }
    case "PRAZO_TAREFA": return [{ op: "TASK_DUE", key: key!, date: c.to }];
    case "RESPONSAVEL": return [{ op: "TASK_RESPONSIBLE", key: key!, userId: c.to }];
    case "REMOVER": return [{ op: "TASK_REMOVE", key: key! }];
    case "INCLUIR": return [{ op: "TASK_ADD", phase: c.phase, title: c.title }];
  }
}

/** Aplica ao rascunho, na ordem, as mudanças decididas na sessão (cada uma pela edição do passo 3; a que falha não trava as outras). */
export function applyPlanChanges(proposal: ProjectProposal, changes: readonly PlanChange[], refs: Record<string, string>): ApplyResult {
  let p = proposal;
  const applied: PlanChange[] = [];
  const failed: ApplyResult["failed"] = [];
  for (const c of changes) {
    const ops = opsFor(p, c, refs);
    if (!ops) {
      failed.push({ change: c, error: "NAO_ENCONTRADO" });
      continue;
    }
    let next = p;
    let error: ProposalError | null = null;
    for (const op of ops) {
      const r = editProposal(next, op);
      if (!r.ok) {
        error = r.error;
        break;
      }
      next = r.proposal;
    }
    if (!error && c.type === "INCLUIR" && c.days !== null && c.days > 0) {
      const r = editProposal(next, { op: "TASK_PERT", key: `p${next.seq}`, pert: { o: c.days, m: c.days, p: c.days } });
      if (r.ok) next = r.proposal;
    }
    if (error) failed.push({ change: c, error });
    else {
      p = next;
      applied.push(c);
    }
  }
  return { proposal: p, applied, failed };
}

/** Impacto no prazo (dias) que acompanha o pedido de mudança: só o que o próprio pedido diz. */
export function scheduleImpact(c: PlanChange): number {
  if (c.type === "DURACAO") return Math.round(c.to - c.from);
  if (c.type === "INCLUIR") return c.days ? Math.round(c.days) : 0;
  if ((c.type === "PRAZO" || c.type === "PRAZO_TAREFA") && c.from && c.to) return diffDays(c.from, c.to);
  return 0;
}

/**
 * No projeto já salvo a sessão não muda o plano direto: cada decisão vira um pedido de mudança (`CHANGE_REQUEST`, status
 * SOLICITADA) para o controle integrado avaliar — o mesmo comando da aba de mudanças. Pedido com o mesmo título não se repete.
 */
export function planChangeCommands(model: Pick<ProjectModel, "changes">, items: readonly { title: string; scheduleDays?: number }[], raisedBy: string): ProjectCommand[] {
  const seen = new Set(model.changes.map((c) => c.title.trim()));
  const cmds: ProjectCommand[] = [];
  for (const it of items) {
    const title = it.title.replace(/\s+/g, " ").trim().slice(0, 200);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    cmds.push({ type: "CHANGE_REQUEST", title, changeType: "NORMAL", impact: it.scheduleDays ? { scheduleDays: it.scheduleDays } : undefined, sevenRs: { raised: raisedBy } });
  }
  return cmds;
}
