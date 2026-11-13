/**
 * Esquema de Projeto proposto pelo Autopiloto (RF30.CA02/CA03) — editável ANTES de salvar e sem nada persistido até a pessoa
 * confirmar. Funções puras:
 *  • `proposeScheme`: fatos da demanda → fases (as 7 canônicas), atividades (entregas da demanda + modelos da área + ciclo de
 *    vida), EAP, riscos, partes interessadas, linhas de orçamento e créditos aos modelos;
 *  • rede série-paralela: dentro de cada fase as atividades andam em PASSOS (`after` = começa depois das anteriores); cada fase
 *    começa depois do último passo da fase anterior, na ordem de execução escolhida — reordenar muda as dependências;
 *  • `scheduleProposal`: CPM do motor (`engine/schedule.ts`) para a ida; a volta parte do PRAZO DA DEMANDA (e dos prazos fixados
 *    em atividades) e dá o prazo de cada atividade; se o caminho crítico não cabe, diz quantos dias estoura;
 *  • `editProposal`: renomear, mudar duração/prazo/responsável, incluir/excluir/reordenar atividades e fases;
 *  • `proposalToProject`: o `ProjectModel` da Mesa, versão 1 "Gerado pelo Autopiloto a partir de …".
 */
import { buildDemoProject } from "../fixtures";
import { pert, type ThreePoint } from "../engine/pert";
import { offsetToDate, schedule } from "../engine/schedule";
import { mendelow } from "../engine/methods";
import {
  PROJECT_PHASES, type Approach, type CommItem, type Dependency, type ProjectArea, type ProjectModel, type ProjectOrigin, type ProjectPhase,
  type RaciEntry, type Requirement, type Risk, type Stakeholder, type Task, type WbsNode,
} from "../types";
import { diffDays, todayIso, type IsoDate } from "./dates";
import { DEMAND_KINDS, type DeliverableType, type DemandFacts, type DemandKind, type StakeholderRole } from "./extract";
import { DELIVERABLE_PROFILE, KIND_APPROACH, KIND_AREA, KIND_RECIPES, LIFECYCLE, templateFor, templateTitle, toNoun, type RecipeTask } from "./recipes";
import type { SourceKind } from "./sources";
import { clip, type Span } from "./text";

export type TaskOrigin = "DEMANDA" | "MODELO" | "CICLO" | "PESSOA";

export interface ProposalTask {
  key: string;
  title: string;
  phase: ProjectPhase;
  pert: ThreePoint;
  milestone?: boolean;
  /** começa só depois das atividades anteriores da mesma fase (passo novo); `false` = em paralelo com a anterior */
  after: boolean;
  /** prazo fixado (veio da demanda ou a pessoa pôs) */
  dueAt?: IsoDate;
  responsibleId?: string;
  /** papel sugerido (conteúdo) */
  role?: string;
  type: DeliverableType | "CICLO";
  origin: TaskOrigin;
  /** trecho da demanda de onde a atividade veio */
  excerpt?: string;
  span?: Span;
  templateId?: string;
  /** entrega da EAP (substantivo) */
  wbsTitle?: string;
  /** a pessoa mexeu: deixa de ser só proposta da IA (✦) */
  edited?: boolean;
}
export interface ProposalPhase { phase: ProjectPhase; included: boolean }
export interface ProposalStakeholder { name: string; role: StakeholderRole; power: number; interest: number; excerpt?: string }
export interface ProposalRisk { title: string; probability: number; impactLevel: number; excerpt?: string }
export interface ProposalBudget { title: string; amount: number; excerpt?: string }

export interface ProjectProposal {
  format: 1;
  title: string;
  objective: string;
  kind: DemandKind;
  area: ProjectArea;
  approach: Approach;
  startDate: IsoDate;
  deadline?: IsoDate;
  deadlineExcerpt?: string;
  /** ordem de EXECUÇÃO das fases (as colunas da Mesa seguem o ciclo de vida) */
  phases: ProposalPhase[];
  tasks: ProposalTask[];
  stakeholders: ProposalStakeholder[];
  risks: ProposalRisk[];
  budget: ProposalBudget[];
  constraints: string[];
  credits: { id: string; title: string }[];
  source: { label: string; kind: SourceKind | "MODELO"; reference?: string; sender?: string };
  /** contador das chaves novas */
  seq: number;
  /** título/objetivo/prazo mexidos pela pessoa */
  edited?: boolean;
}

const POWER_INTEREST: Record<StakeholderRole, [number, number]> = { DEMANDANTE: [4, 5], DESTINATARIO: [3, 5], CONTROLE: [5, 2], PUBLICO: [2, 4], OUTRO: [3, 3] };

export interface ProposeOptions { now: Date; sourceLabel: string; sourceKind: SourceKind | "MODELO" }

/** Fatos da demanda → esquema proposto (✦). */
export function proposeScheme(facts: DemandFacts, opts: ProposeOptions): ProjectProposal {
  const kind = facts.kind.value;
  const start = todayIso(opts.now);
  const snippet = (span?: Span) => (span ? clip(facts.text.slice(span.start, span.end), 180) : undefined);
  let seq = 0;
  const key = () => `p${++seq}`;
  type Draft = ProposalTask & { rank: number };

  const fromDemand: Draft[] = facts.deliverables.map((d) => {
    const prof = DELIVERABLE_PROFILE[d.type];
    return {
      key: key(), title: d.text, phase: prof.phase, pert: { ...prof.pert }, after: false, dueAt: d.due, role: prof.role, type: d.type, origin: "DEMANDA",
      excerpt: snippet(d.span), span: d.span, templateId: templateFor(d.text, kind), wbsTitle: toNoun(d.text), rank: prof.rank,
    };
  });
  const fromRecipe = (r: RecipeTask, origin: TaskOrigin): Draft => ({
    key: key(), title: r.title, phase: r.phase, pert: { ...r.pert }, after: false, milestone: r.milestone, role: r.role, type: r.type, origin,
    templateId: r.templateId, wbsTitle: r.milestone ? undefined : (r.wbs ?? r.title), rank: r.rank,
  });
  const fromModel = KIND_RECIPES[kind]
    .filter((r) => {
      const covered = fromDemand.some((t) => (r.templateId && t.templateId === r.templateId) || (t.type === r.type && t.phase === r.phase));
      return !covered && (r.essential || !fromDemand.some((t) => t.phase === r.phase));
    })
    .map((r) => fromRecipe(r, "MODELO"));
  const fromCycle = LIFECYCLE.map((r) => fromRecipe(r, "CICLO"));

  const tasks: ProposalTask[] = [];
  for (const phase of PROJECT_PHASES) {
    const list = [...fromCycle, ...fromDemand, ...fromModel].filter((t) => t.phase === phase).map((t, i) => ({ t, i })).sort((a, b) => a.t.rank - b.t.rank || a.i - b.i).map((x) => x.t);
    list.forEach((t, i) => {
      const { rank, ...rest } = t;
      tasks.push({ ...rest, after: i > 0 && rank > list[i - 1]!.rank });
    });
  }

  const credits = [...new Set(tasks.map((t) => t.templateId).filter((x): x is string => Boolean(x)))].map((id) => ({ id, title: templateTitle(id) ?? id }));
  const title = facts.subject?.value || facts.objective?.value || facts.deliverables[0]?.text || clip(facts.text.split("\n").find((l) => l.trim()) ?? "", 90) || opts.sourceLabel;
  return {
    format: 1,
    title: clip(title, 120),
    objective: facts.objective?.value ?? title,
    kind,
    area: KIND_AREA[kind],
    approach: KIND_APPROACH[kind],
    startDate: start,
    deadline: facts.deadline?.date,
    deadlineExcerpt: snippet(facts.deadline?.span),
    phases: PROJECT_PHASES.map((phase) => ({ phase, included: true })),
    tasks,
    stakeholders: facts.stakeholders.map((s) => ({ name: s.name, role: s.role, power: POWER_INTEREST[s.role][0], interest: POWER_INTEREST[s.role][1], excerpt: snippet(s.span) })),
    risks: facts.risks.map((r) => ({ title: r.title, probability: r.probability, impactLevel: r.impactLevel, excerpt: snippet(r.span) })),
    budget: facts.amounts.map((a) => ({ title: clip(a.label, 80), amount: a.value, excerpt: snippet(a.span) })),
    constraints: facts.constraints.map((c) => c.text),
    credits,
    source: { label: opts.sourceLabel, kind: opts.sourceKind, reference: facts.reference?.value, sender: facts.sender?.value },
    seq,
  };
}

// ------------------------------------------------------------------ rede e cronograma

export const durationOf = (t: Pick<ProposalTask, "pert" | "milestone">): number => {
  if (t.milestone) return 0;
  const e = pert(t.pert);
  return e.valid ? e.te : Math.max(0, t.pert.m);
};

/** Atividades das fases incluídas, na ordem de execução, e as dependências término→início derivadas dos passos. */
export function proposalNetwork(p: Pick<ProjectProposal, "phases" | "tasks">): { tasks: ProposalTask[]; deps: [string, string][] } {
  const ordered: ProposalTask[] = [];
  const deps: [string, string][] = [];
  let prevExit: string[] = [];
  for (const ph of p.phases) {
    if (!ph.included) continue;
    const list = p.tasks.filter((t) => t.phase === ph.phase);
    if (!list.length) continue;
    const steps: ProposalTask[][] = [];
    list.forEach((t, i) => {
      if (i === 0 || t.after) steps.push([t]);
      else steps[steps.length - 1]!.push(t);
    });
    steps.forEach((step, si) => {
      const preds = si === 0 ? prevExit : steps[si - 1]!.map((t) => t.key);
      for (const t of step) for (const from of preds) deps.push([from, t.key]);
    });
    ordered.push(...list);
    prevExit = steps[steps.length - 1]!.map((t) => t.key);
  }
  return { tasks: ordered, deps };
}

export interface ProposalRow {
  key: string;
  duration: number;
  es: number;
  ef: number;
  /** término mais tarde contado de trás para frente a partir do prazo da demanda (ou do prazo fixado) */
  lf: number;
  critical: boolean;
  start: IsoDate;
  end: IsoDate;
  /** prazo da atividade (calculado ou fixado); ausente quando não há prazo nenhum */
  due?: IsoDate;
  pinned: boolean;
  /** quanto o término mais cedo passa do prazo (dias) */
  lateDays: number;
}
export interface ProposalSchedule {
  ok: boolean;
  rows: Record<string, ProposalRow>;
  order: string[];
  /** duração do caminho crítico (dias corridos) */
  finish: number;
  finishDate: IsoDate;
  criticalPath: string[];
  deadline?: IsoDate;
  /** dias entre o término previsto e o prazo da demanda (negativo = estoura) */
  slackDays?: number;
  /** quantos dias o cronograma estoura o prazo (0 = cabe) */
  overrunDays: number;
  lateTasks: string[];
}

export function scheduleProposal(p: ProjectProposal): ProposalSchedule {
  const net = proposalNetwork(p);
  const dur = new Map(net.tasks.map((t) => [t.key, durationOf(t)]));
  const s = schedule(net.tasks.map((t) => ({ id: t.key, duration: dur.get(t.key)! })), net.deps.map(([from, to]) => ({ from, to, type: "FS" as const, lag: 0 })));
  if (!s.ok) return { ok: false, rows: {}, order: [], finish: 0, finishDate: p.startDate, criticalPath: [], deadline: p.deadline, overrunDays: 0, lateTasks: [] };
  const byKey = new Map(net.tasks.map((t) => [t.key, t]));
  const succs = new Map<string, string[]>(net.tasks.map((t) => [t.key, []]));
  for (const [from, to] of net.deps) succs.get(from)!.push(to);
  // o prazo é inclusivo: terminar no fim do dia D = deslocamento (D − início) + 1
  const dOff = p.deadline ? diffDays(p.startDate, p.deadline) + 1 : undefined;
  const pinOff = (t: ProposalTask) => (t.dueAt ? diffDays(p.startDate, t.dueAt) + 1 : undefined);
  const anchored = dOff !== undefined || net.tasks.some((t) => t.dueAt);
  const lf = new Map<string, number>();
  for (const id of [...s.order].reverse()) {
    let late = dOff ?? Infinity;
    const pin = pinOff(byKey.get(id)!);
    if (pin !== undefined) late = Math.min(late, pin);
    for (const next of succs.get(id)!) late = Math.min(late, lf.get(next)! - dur.get(next)!);
    lf.set(id, Number.isFinite(late) ? late : s.rows[id]!.lf);
  }
  const rows: Record<string, ProposalRow> = {};
  const lateTasks: string[] = [];
  let worst = 0;
  for (const id of s.order) {
    const r = s.rows[id]!;
    const t = byKey.get(id)!;
    const late = Math.max(0, Math.round((r.ef - lf.get(id)!) * 1e4) / 1e4);
    if (late > 0) lateTasks.push(id);
    worst = Math.max(worst, late);
    rows[id] = {
      key: id, duration: r.duration, es: r.es, ef: r.ef, lf: lf.get(id)!, critical: r.critical,
      start: offsetToDate(p.startDate, r.es), end: offsetToDate(p.startDate, Math.max(r.es, r.ef - 1e-6)),
      due: anchored ? (t.dueAt ?? offsetToDate(p.startDate, Math.max(0, lf.get(id)! - 1e-6))) : undefined,
      pinned: Boolean(t.dueAt), lateDays: late,
    };
  }
  return {
    ok: true, rows, order: s.order, finish: s.finish, finishDate: offsetToDate(p.startDate, Math.max(0, s.finish - 1e-6)), criticalPath: s.criticalPath,
    deadline: p.deadline, slackDays: dOff === undefined ? undefined : Math.floor(dOff - s.finish + 1e-9), overrunDays: Math.max(0, Math.ceil(worst - 1e-9)), lateTasks,
  };
}

// ------------------------------------------------------------------ edição antes de salvar

export type ProposalOp =
  | { op: "SET_TITLE"; title: string }
  | { op: "SET_OBJECTIVE"; text: string }
  | { op: "SET_START"; date: IsoDate }
  | { op: "SET_DEADLINE"; date: IsoDate | null }
  | { op: "TASK_RENAME"; key: string; title: string }
  | { op: "TASK_PERT"; key: string; pert: ThreePoint }
  | { op: "TASK_DUE"; key: string; date: IsoDate | null }
  | { op: "TASK_RESPONSIBLE"; key: string; userId: string | null }
  | { op: "TASK_AFTER"; key: string; after: boolean }
  | { op: "TASK_MOVE"; key: string; dir: -1 | 1 }
  | { op: "TASK_PHASE"; key: string; phase: ProjectPhase }
  | { op: "TASK_REMOVE"; key: string }
  | { op: "TASK_ADD"; phase: ProjectPhase; title: string }
  | { op: "PHASE_TOGGLE"; phase: ProjectPhase; included: boolean }
  | { op: "PHASE_MOVE"; phase: ProjectPhase; dir: -1 | 1 };

export type ProposalError = "TEXTO_VAZIO" | "VALOR_INVALIDO" | "NAO_ENCONTRADO";
export type ProposalEditResult = { ok: true; proposal: ProjectProposal } | { ok: false; error: ProposalError };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Tira a atividade da sua fase sem desfazer o passo: se ela abria um passo, a próxima (que corria junto) herda a abertura. */
function detach(tasks: ProposalTask[], key: string): ProposalTask[] {
  const t = tasks.find((x) => x.key === key)!;
  const same = tasks.filter((x) => x.phase === t.phase);
  const idx = same.findIndex((x) => x.key === key);
  const next = same[idx + 1];
  const opensStep = idx === 0 || t.after;
  return tasks.filter((x) => x.key !== key).map((x) => (next && x.key === next.key && opensStep && !next.after && idx > 0 ? { ...x, after: true } : x));
}

export function editProposal(p: ProjectProposal, op: ProposalOp): ProposalEditResult {
  const ok = (proposal: ProjectProposal): ProposalEditResult => ({ ok: true, proposal });
  const fail = (error: ProposalError): ProposalEditResult => ({ ok: false, error });
  const task = "key" in op ? p.tasks.find((t) => t.key === op.key) : undefined;
  if ("key" in op && !task) return fail("NAO_ENCONTRADO");
  const patch = (changes: Partial<ProposalTask>) => p.tasks.map((t) => (t.key === task!.key ? { ...t, ...changes, edited: true } : t));
  switch (op.op) {
    case "SET_TITLE":
      return clean(op.title) ? ok({ ...p, title: clean(op.title), edited: true }) : fail("TEXTO_VAZIO");
    case "SET_OBJECTIVE":
      return clean(op.text) ? ok({ ...p, objective: clean(op.text), edited: true }) : fail("TEXTO_VAZIO");
    case "SET_START":
      return ISO.test(op.date) ? ok({ ...p, startDate: op.date, edited: true }) : fail("VALOR_INVALIDO");
    case "SET_DEADLINE":
      if (op.date !== null && !ISO.test(op.date)) return fail("VALOR_INVALIDO");
      return ok({ ...p, deadline: op.date ?? undefined, deadlineExcerpt: op.date === p.deadline ? p.deadlineExcerpt : undefined, edited: true });
    case "TASK_RENAME":
      return clean(op.title) ? ok({ ...p, tasks: patch({ title: clean(op.title), wbsTitle: task!.milestone ? undefined : toNoun(clean(op.title)) }) }) : fail("TEXTO_VAZIO");
    case "TASK_PERT": {
      const { o, m, p: pe } = op.pert;
      if (task!.milestone) return fail("VALOR_INVALIDO");
      if (![o, m, pe].every((x) => Number.isFinite(x) && x >= 0 && x <= 3650) || !(o <= m && m <= pe)) return fail("VALOR_INVALIDO");
      return ok({ ...p, tasks: patch({ pert: { o, m, p: pe } }) });
    }
    case "TASK_DUE":
      if (op.date !== null && !ISO.test(op.date)) return fail("VALOR_INVALIDO");
      return ok({ ...p, tasks: patch({ dueAt: op.date ?? undefined }) });
    case "TASK_RESPONSIBLE":
      return ok({ ...p, tasks: patch({ responsibleId: op.userId ?? undefined }) });
    case "TASK_AFTER":
      return ok({ ...p, tasks: patch({ after: op.after }) });
    case "TASK_MOVE": {
      const same = p.tasks.filter((t) => t.phase === task!.phase);
      const i = same.findIndex((t) => t.key === task!.key);
      const j = i + op.dir;
      if (j < 0 || j >= same.length) return ok(p);
      // a ordem muda e o "começa depois" fica com a POSIÇÃO: trocar dois passos inverte a sequência
      const a = same[i]!;
      const b = same[j]!;
      const swapped = p.tasks.map((t) => (t.key === a.key ? { ...b, after: a.after } : t.key === b.key ? { ...a, after: b.after, edited: true } : t));
      return ok({ ...p, tasks: swapped });
    }
    case "TASK_PHASE": {
      if (op.phase === task!.phase) return ok(p);
      const rest = detach(p.tasks, task!.key);
      const hasTasks = rest.some((t) => t.phase === op.phase);
      const lastIdx = rest.map((t) => t.phase).lastIndexOf(op.phase);
      const moved: ProposalTask = { ...task!, phase: op.phase, after: hasTasks, edited: true };
      const tasks = lastIdx >= 0 ? [...rest.slice(0, lastIdx + 1), moved, ...rest.slice(lastIdx + 1)] : insertByPhase(rest, moved);
      return ok({ ...p, tasks });
    }
    case "TASK_REMOVE":
      return ok({ ...p, tasks: detach(p.tasks, task!.key) });
    case "TASK_ADD": {
      const title = clean(op.title);
      if (!title) return fail("TEXTO_VAZIO");
      const seq = p.seq + 1;
      const hasTasks = p.tasks.some((t) => t.phase === op.phase);
      const created: ProposalTask = {
        key: `p${seq}`, title, phase: op.phase, pert: { o: 2, m: 3, p: 5 }, after: hasTasks, type: "OUTRO", origin: "PESSOA", wbsTitle: toNoun(title), edited: true,
      };
      const lastIdx = p.tasks.map((t) => t.phase).lastIndexOf(op.phase);
      const tasks = lastIdx >= 0 ? [...p.tasks.slice(0, lastIdx + 1), created, ...p.tasks.slice(lastIdx + 1)] : insertByPhase(p.tasks, created);
      return ok({ ...p, tasks, seq });
    }
    case "PHASE_TOGGLE":
      return ok({ ...p, phases: p.phases.map((ph) => (ph.phase === op.phase ? { ...ph, included: op.included } : ph)), edited: true });
    case "PHASE_MOVE": {
      const i = p.phases.findIndex((ph) => ph.phase === op.phase);
      const j = i + op.dir;
      if (i < 0) return fail("NAO_ENCONTRADO");
      if (j < 0 || j >= p.phases.length) return ok(p);
      const phases = [...p.phases];
      [phases[i], phases[j]] = [phases[j]!, phases[i]!];
      return ok({ ...p, phases, edited: true });
    }
  }
}

/** Fase vazia: a atividade entra na posição da fase na ordem do ciclo de vida. */
function insertByPhase(tasks: ProposalTask[], t: ProposalTask): ProposalTask[] {
  const rank = PROJECT_PHASES.indexOf(t.phase);
  const idx = tasks.findIndex((x) => PROJECT_PHASES.indexOf(x.phase) > rank);
  return idx < 0 ? [...tasks, t] : [...tasks.slice(0, idx), t, ...tasks.slice(idx)];
}

// ------------------------------------------------------------------ salvar: proposta → projeto da Mesa

/** Nome das fases como conteúdo da EAP (pt-BR, como o resto do projeto). */
const PHASE_WBS: Record<ProjectPhase, string> = {
  DEMANDA: "Iniciação", PLANEJAMENTO: "Planejamento", ELABORACAO: "Elaboração", ANALISE: "Análise", APROVACAO: "Aprovação", EXECUCAO: "Execução", ENCERRAMENTO: "Encerramento",
};
const NEED: Partial<Record<DemandKind, NonNullable<ProjectModel["governance"]["need"]>>> = { TI: "SERVICO", AQUISICAO: "CONTRATACAO", OBRA: "INFRAESTRUTURA", CAPACITACAO: "PESSOAL", SERVICO: "SERVICO" };

export interface ToProjectContext {
  id: string;
  actorId: string;
  now: Date;
  /** como a versão 1 se anota: gerado pelo Autopiloto ou criado a partir de modelo */
  versionKey?: "autopilotCreated" | "projectFromTemplate";
}

/** Id curto e legível para a URL (`/projects/<id>/edit`). */
export function newProjectId(prefix: string, now: Date, rnd: () => number = Math.random): string {
  return `${prefix}-${now.getTime().toString(36)}${Math.floor(rnd() * 36 ** 3).toString(36).padStart(3, "0")}`;
}

export function proposalToProject(p: ProjectProposal, ctx: ToProjectContext): ProjectModel {
  const nowIso = ctx.now.toISOString();
  const sched = scheduleProposal(p);
  const net = proposalNetwork(p);
  const idOf = new Map(net.tasks.map((t, i) => [t.key, `t${i + 1}`]));

  // EAP: raiz = projeto; 1º nível = gerenciamento e as fases com entregas; folhas = uma por atividade (substantivo)
  const wbs: WbsNode[] = [{ id: "w0", title: p.title }];
  const groupOf = new Map<string, string>();
  const group = (key: string, title: string) => {
    if (!groupOf.has(key)) {
      const id = `w${wbs.length}`;
      wbs.push({ id, parentId: "w0", title });
      groupOf.set(key, id);
    }
    return groupOf.get(key)!;
  };
  const leafOf = new Map<string, string>();
  for (const t of net.tasks) {
    if (t.milestone) continue;
    const parentId = t.origin === "CICLO" ? group("GER", "Gerenciamento do projeto") : group(t.phase, PHASE_WBS[t.phase]);
    const id = `w${wbs.length}`;
    wbs.push({ id, parentId, title: t.wbsTitle ?? toNoun(t.title), ownerId: t.responsibleId });
    leafOf.set(t.key, id);
  }

  const tasks: Task[] = net.tasks.map((t, i) => {
    const row = sched.rows[t.key];
    const d = durationOf(t);
    return {
      id: idOf.get(t.key)!, code: `T${String(i + 1).padStart(2, "0")}`, title: t.title, phase: t.phase, status: "A_FAZER", wbsId: leafOf.get(t.key), responsibleId: t.responsibleId,
      durationDays: Math.round(d * 10) / 10, pert: t.milestone || (t.pert.o === t.pert.m && t.pert.m === t.pert.p) ? undefined : { ...t.pert }, milestone: t.milestone || undefined,
      percentComplete: 0, budget: 0, actualCost: 0, moscow: t.origin === "DEMANDA" ? "MUST" : undefined, createdBy: ctx.actorId, createdAt: nowIso, dueAt: row?.due,
    };
  });
  const dependencies: Dependency[] = net.deps.map(([from, to], i) => ({ id: `d${i + 1}`, from: idOf.get(from)!, to: idOf.get(to)!, type: "FS", lagDays: 0 }));
  const raci: RaciEntry[] = [];
  for (const t of tasks) {
    if (t.milestone) continue;
    if (t.responsibleId && t.responsibleId !== ctx.actorId) raci.push({ taskId: t.id, userId: t.responsibleId, letters: ["R"] });
    raci.push({ taskId: t.id, userId: ctx.actorId, letters: t.responsibleId === ctx.actorId ? ["R", "A"] : ["A"] });
  }
  const stakeholders: Stakeholder[] = p.stakeholders.map((s, i) => ({ id: `s${i + 1}`, name: s.name, role: s.role === "DEMANDANTE" ? "Demandante" : s.role === "DESTINATARIO" ? "Unidade responsável" : undefined, power: s.power, interest: s.interest }));
  const requirements: Requirement[] = net.tasks
    .filter((t) => t.origin === "DEMANDA")
    .map((t, i) => ({ id: `r${i + 1}`, code: `RF-${String(i + 1).padStart(2, "0")}`, text: t.title, origin: p.source.reference ?? p.source.label, deliverableIds: leafOf.has(t.key) ? [leafOf.get(t.key)!] : [] }));
  const demandante = stakeholders.find((s) => s.role === "Demandante");
  if (demandante) for (const r of requirements) r.originStakeholderId = demandante.id;
  // plano de comunicação ligado ao mapa poder × interesse (quem se gerencia de perto recebe status quinzenal)
  const close = stakeholders.filter((s) => mendelow(s.power, s.interest) === "GERENCIAR_DE_PERTO").map((s) => s.id);
  const satisfied = stakeholders.filter((s) => mendelow(s.power, s.interest) === "MANTER_SATISFEITO").map((s) => s.id);
  const communications: CommItem[] = [
    ...(close.length ? [{ id: "cm1", info: "Andamento da demanda: entregas, prazos e riscos", audienceIds: close, channel: "RELATORIO" as const, frequency: "QUINZENAL" as const, ownerId: ctx.actorId }] : []),
    ...(satisfied.length ? [{ id: "cm2", info: "Prestação de contas nos marcos do projeto", audienceIds: satisfied, channel: "RELATORIO" as const, frequency: "POR_MARCO" as const, ownerId: ctx.actorId }] : []),
  ];
  const risks: Risk[] = p.risks.map((r, i) => ({ id: `k${i + 1}`, title: r.title, kind: "AMEACA", probability: r.probability, impact: 0, impactLevel: r.impactLevel, taskIds: [], status: "ABERTO" }));
  if (sched.overrunDays > 0) {
    risks.push({ id: `k${risks.length + 1}`, title: `Prazo da demanda menor que o caminho crítico (${sched.overrunDays} dias a mais)`, kind: "AMEACA", probability: 0.9, impact: 0, impactLevel: 5, taskIds: sched.criticalPath.map((k) => idOf.get(k)!).filter(Boolean), status: "ABERTO" });
  }
  const team = [{ userId: ctx.actorId, role: "GERENTE" as const }, ...[...new Set(tasks.map((t) => t.responsibleId).filter((x): x is string => Boolean(x) && x !== ctx.actorId))].map((userId) => ({ userId, role: "EQUIPE" as const }))];
  const ref = p.source.reference;
  const origin: ProjectOrigin = { kind: ctx.versionKey === "projectFromTemplate" ? "MODELO" : "AUTOPILOTO", label: p.source.label, ref, credits: p.credits };
  const roles = [...new Set(net.tasks.map((t) => t.role).filter((x): x is string => Boolean(x)))];

  return {
    id: ctx.id,
    title: p.title,
    startDate: p.startDate,
    statusDate: p.startDate,
    approach: p.approach,
    area: p.area,
    boardModel: "INSTITUCIONAL",
    currentPhase: "DEMANDA",
    team,
    charter: {
      justification: p.objective ? [p.objective] : [],
      objectives: p.objective ? [{ id: "o1", text: p.objective, smart: false }] : [],
      product: p.title,
      highLevelRequirements: requirements.map((r) => r.text).slice(0, 8),
      premises: [],
      constraints: [...p.constraints, ...(p.deadline ? [`Prazo da demanda: ${p.deadline.split("-").reverse().join("/")}${ref ? ` (${ref})` : ""}`] : [])],
      highLevelRisks: risks.map((r) => r.title),
      teamRoles: roles,
      milestones: p.deadline ? [{ id: "m1", title: `Prazo da demanda${ref ? ` (${ref})` : ""}`, date: p.deadline }] : [],
      summaryBudget: p.budget.reduce((m, b) => Math.max(m, b.amount), 0),
      managerId: ctx.actorId,
    },
    businessCase: { rate: 0.1, cashflows: [], benefits: [] },
    stakeholders,
    communications,
    requirements,
    wbs,
    tasks,
    dependencies,
    raci,
    risks,
    changes: [],
    lessons: [],
    gates: [],
    budgetLines: p.budget.map((b, i) => ({ id: `b${i + 1}`, title: b.title, amount: b.amount, spend: "GROW" })),
    reserves: { contingency: 0, management: 0 },
    governance: { goals: [], need: NEED[p.kind], spend: "GROW", orgStructure: "MATRICIAL_BALANCEADA", iso38500: {} },
    closure: { acceptance: false, contractsClosed: false, resourcesReleased: false, finalReport: false, archived: false },
    canvas: { positions: {}, notes: [] },
    decisionIds: [],
    origin,
    versions: [{
      number: 1, at: nowIso, actorId: ctx.actorId, key: ctx.versionKey ?? "autopilotCreated",
      vars: ctx.versionKey === "projectFromTemplate" ? { template: p.source.label } : { source: p.source.label },
    }],
    version: 1,
  };
}

// ------------------------------------------------------------------ criar em branco ou a partir de modelo (RF5 / RF30)

export interface NewProjectInput { id: string; title: string; area: ProjectArea; approach: Approach; startDate: IsoDate; actorId: string; now: Date }

/** Projeto em branco: só a raiz da EAP e o gerente; versão 1 "Projeto criado". */
export function blankProject(input: NewProjectInput): ProjectModel {
  const title = clean(input.title);
  return {
    id: input.id, title, startDate: input.startDate, statusDate: input.startDate, approach: input.approach, area: input.area, boardModel: "INSTITUCIONAL",
    currentPhase: "DEMANDA", team: [{ userId: input.actorId, role: "GERENTE" }],
    charter: { justification: [], objectives: [], product: "", highLevelRequirements: [], premises: [], constraints: [], highLevelRisks: [], teamRoles: [], milestones: [], summaryBudget: 0, managerId: input.actorId },
    businessCase: { rate: 0.1, cashflows: [], benefits: [] }, stakeholders: [], communications: [], requirements: [], wbs: [{ id: "w0", title }], tasks: [], dependencies: [],
    raci: [], risks: [], changes: [], lessons: [], gates: [], budgetLines: [], reserves: { contingency: 0, management: 0 },
    governance: { goals: [], spend: "GROW", orgStructure: "MATRICIAL_BALANCEADA", iso38500: {} },
    closure: { acceptance: false, contractsClosed: false, resourcesReleased: false, finalReport: false, archived: false },
    canvas: { positions: {}, notes: [] }, decisionIds: [], origin: { kind: "CRIAR_PROJETO" },
    versions: [{ number: 1, at: input.now.toISOString(), actorId: input.actorId, key: "projectCreated", vars: { title } }], version: 1,
  };
}

/** Modelos de projeto: o da aula (Plataforma DECIA v1.0, com os números conferíveis) e um por tipo de demanda (receitas acima). */
export const PROJECT_TEMPLATE_IDS = ["aula-decia", ...DEMAND_KINDS.map((k) => `tipo-${k.toLowerCase()}`)] as const;
export type ProjectTemplateId = (typeof PROJECT_TEMPLATE_IDS)[number];
export const templateKind = (id: ProjectTemplateId): DemandKind | null => (id === "aula-decia" ? null : (id.slice(5).toUpperCase() as DemandKind));

/** Fatos vazios de uma demanda do tipo pedido (sem entregas: entram todas as atividades da receita). */
function emptyFacts(kind: DemandKind, title: string, start: IsoDate): DemandFacts {
  const scores = Object.fromEntries(DEMAND_KINDS.map((k) => [k, k === kind ? 1 : 0])) as Record<DemandKind, number>;
  return {
    text: "", referenceDate: { value: start }, subject: { value: title }, objective: { value: title }, kind: { value: kind, scores, evidence: [] },
    amounts: [], deliverables: [], stakeholders: [], constraints: [], risks: [],
  };
}

/** Projeto a partir de modelo; `templateLabel` é o nome do modelo como a pessoa o viu (vai para a versão 1). */
export function projectFromTemplate(templateId: ProjectTemplateId, input: Omit<NewProjectInput, "area" | "approach"> & { templateLabel: string }): ProjectModel {
  const kind = templateKind(templateId);
  const title = clean(input.title) || input.templateLabel;
  if (!kind) {
    // projeto da aula: mesmo conteúdo do exemplo (datas incluídas, para os números conferirem com a aula), histórico novo
    const demo = buildDemoProject();
    return {
      ...demo, id: input.id, title, origin: { kind: "MODELO", label: input.templateLabel },
      versions: [{ number: 1, at: input.now.toISOString(), actorId: input.actorId, key: "projectFromTemplate", vars: { template: input.templateLabel } }], version: 1,
    };
  }
  const facts = emptyFacts(kind, title, input.startDate);
  const proposal = { ...proposeScheme(facts, { now: input.now, sourceLabel: input.templateLabel, sourceKind: "MODELO" }), startDate: input.startDate };
  return proposalToProject(proposal, { id: input.id, actorId: input.actorId, now: input.now, versionKey: "projectFromTemplate" });
}
