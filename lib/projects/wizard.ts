/**
 * Criador completo de projetos (RF5/RF21; 12/11/2026): o que a pessoa preenche no assistente em passos, a validação por passo (chaves
 * de i18n `projectForm.err.*`) e a montagem do `ProjectModel` a partir de `blankProject` — o mesmo modelo único da Mesa, criado pelo
 * repositório (`ProjectRepository.create`), com a versão 1 "Projeto criado". Funções puras (D-12): a tela só traduz e mostra.
 *
 * Teoria aplicada (aulas de Gestão de Projetos de TI): objetivo SMART (específico, mensurável, alcançável, relevante, temporal),
 * Mendelow (poder × interesse), RACI (um só A, ao menos um R por entrega), P × I dos riscos, reserva de contingência dentro da linha
 * de base e gerencial fora dela, GUT da demanda e ISO/IEC 38500 só em projetos de TI.
 */
import { addDays, diffDays } from "./autopilot/dates";
import { blankProject } from "./autopilot/proposal";
import { emv, raciProblems, type RaciLetter } from "./engine/methods";
import { normalizeFormat, type FormatChoice } from "../tasks/formats";
import type {
  Approach, BoardModel, BudgetLine, DeliverableFormat, Governance, IsoDate, ProjectAccessClass, ProjectArea, ProjectModel, ProjectRole,
  ProjectVisibility, RiskKind,
} from "./types";
import type { OpportunityResponse, OrgStructure, ThreatResponse } from "./engine/methods";

export const WIZARD_STEPS = ["ident", "charter", "stakeholders", "team", "approach", "schedule", "budget", "risks", "governance", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export interface WizardObjective { id: string; text: string; indicator: string; target: string; deadline: string; goalCode: string }
export interface WizardDeliverable { id: string; title: string; acceptance: string; ownerId: string; durationDays: string; dueAt: string; format: FormatChoice }
export interface WizardStakeholder { id: string; name: string; role: string; power: number; interest: number }
export interface WizardMember { id: string; userId: string; role: ProjectRole }
export interface WizardMilestone { id: string; title: string; date: string }
export interface WizardBudgetLine { id: string; title: string; amount: string; spend: BudgetLine["spend"] }
export interface WizardRisk {
  id: string; title: string; kind: RiskKind; probability: string; impact: string; impactLevel: number; response: ThreatResponse | OpportunityResponse | ""; ownerId: string;
}
export interface WizardGoal { id: string; code: string; text: string; source: "PEI" | "PDTIC" | "BSC" }
export type Iso38500 = Governance["iso38500"];

export interface ProjectWizardInput {
  // identificação
  title: string;
  description: string;
  area: ProjectArea;
  /** nº do ofício/processo de origem */
  originRef: string;
  // TAP
  objectives: WizardObjective[];
  justification: string[];
  product: string;
  scopeIn: string[];
  scopeOut: string[];
  premises: string[];
  constraints: string[];
  requirements: string[];
  successCriteria: string[];
  deliverables: WizardDeliverable[];
  // partes interessadas e equipe
  stakeholders: WizardStakeholder[];
  sponsorId: string;
  managerId: string;
  team: WizardMember[];
  teamRoles: string[];
  /** RACI básico: entrega → pessoa → letras */
  raci: Record<string, Record<string, RaciLetter[]>>;
  // abordagem e ciclo
  approach: Approach;
  boardModel: BoardModel;
  sprintWeeks: string;
  sprintCount: string;
  // cronograma
  startDate: string;
  endDate: string;
  milestones: WizardMilestone[];
  // orçamento
  budgetLines: WizardBudgetLine[];
  contingency: string;
  management: string;
  // riscos
  risks: WizardRisk[];
  // governança e acesso
  gut: { g: number; u: number; t: number };
  need: NonNullable<Governance["need"]> | "";
  spend: Governance["spend"];
  orgStructure: OrgStructure;
  goals: WizardGoal[];
  iso38500: Iso38500;
  accessClass: ProjectAccessClass;
  visibility: ProjectVisibility;
  accessReason: string;
}

let seq = 0;
/** id local de linha do formulário (não vai para o modelo: o modelo ganha ids próprios na montagem) */
export const rowId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function emptyWizard(opts: { today: IsoDate; actorId: string }): ProjectWizardInput {
  return {
    title: "", description: "", area: "SOFTWARE", originRef: "",
    objectives: [{ id: rowId("o"), text: "", indicator: "", target: "", deadline: "", goalCode: "" }],
    justification: [""], product: "", scopeIn: [""], scopeOut: [], premises: [], constraints: [], requirements: [], successCriteria: [""],
    deliverables: [], stakeholders: [], sponsorId: "", managerId: opts.actorId, team: [], teamRoles: [], raci: {},
    approach: "HIBRIDO", boardModel: "INSTITUCIONAL", sprintWeeks: "2", sprintCount: "",
    startDate: opts.today, endDate: "", milestones: [],
    budgetLines: [], contingency: "", management: "",
    risks: [],
    gut: { g: 3, u: 3, t: 3 }, need: "", spend: "GROW", orgStructure: "MATRICIAL_BALANCEADA", goals: [], iso38500: {},
    accessClass: "INTERNO", visibility: "DEPARTAMENTO", accessReason: "",
  };
}

/** Entrega nova já com o RACI básico: o gerente responde (A) e executa (R) até a pessoa distribuir. */
export function newDeliverable(input: ProjectWizardInput, title = ""): { deliverable: WizardDeliverable; raci: ProjectWizardInput["raci"] } {
  const d: WizardDeliverable = { id: rowId("d"), title, acceptance: "", ownerId: "", durationDays: "5", dueAt: "", format: { family: "", variant: "", details: {} } };
  const raci = { ...input.raci, [d.id]: input.managerId ? { [input.managerId]: ["R", "A"] as RaciLetter[] } : {} };
  return { deliverable: d, raci };
}

/** Pessoas do projeto (patrocinador, gerente e equipe), sem repetir. */
export function projectPeople(input: Pick<ProjectWizardInput, "sponsorId" | "managerId" | "team">): string[] {
  return [...new Set([input.managerId, input.sponsorId, ...input.team.map((m) => m.userId)].filter(Boolean))];
}

/** SMART: texto específico, indicador e meta (mensurável), prazo (temporal) e ligação a objetivo estratégico (relevante). */
export function smartParts(o: WizardObjective): { S: boolean; M: boolean; A: boolean; R: boolean; T: boolean } {
  const S = o.text.trim().length >= 10;
  const M = !!o.indicator.trim() && !!o.target.trim();
  const T = /^\d{4}-\d{2}-\d{2}$/.test(o.deadline);
  return { S, M, A: S && M, R: !!o.goalCode.trim(), T };
}
export const isSmart = (o: WizardObjective) => Object.values(smartParts(o)).every(Boolean);

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
/** número como digitado ("1.500,50", "1500.5"); vazio → 0; inválido → NaN */
export function parseNumber(text: string): number {
  const s = text.trim().replace(/\s|R\$|%/g, "");
  if (!s) return 0;
  const n = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return /^-?\d+(\.\d+)?$/.test(n) ? Number(n) : Number.NaN;
}
const intIn = (s: string, min: number, max: number) => /^\d+$/.test(s.trim()) && Number(s) >= min && Number(s) <= max;

export type WizardErrors = Record<string, string>;

/** Erros de um passo (campo → chave de i18n). Chaves de linha: `<lista>.<índice>.<campo>`. */
export function validateStep(step: WizardStep, w: ProjectWizardInput): WizardErrors {
  const e: WizardErrors = {};
  switch (step) {
    case "ident":
      if (!w.title.trim()) e.title = "projectForm.err.title";
      else if (w.title.length > 200) e.title = "projectForm.err.tooLong";
      if (w.description.length > 2000) e.description = "projectForm.err.tooLong";
      if (w.originRef.length > 80) e.originRef = "projectForm.err.tooLong";
      break;
    case "charter":
      if (!w.objectives.some((o) => o.text.trim())) e["objectives.0.text"] = "projectForm.err.objective";
      w.objectives.forEach((o, i) => {
        if (i > 0 && !o.text.trim() && (o.indicator || o.target || o.deadline)) e[`objectives.${i}.text`] = "projectForm.err.objective";
        if (o.deadline && !isDate(o.deadline)) e[`objectives.${i}.deadline`] = "projectForm.err.date";
      });
      if (!w.justification.some((j) => j.trim())) e.justification = "projectForm.err.justification";
      if (!w.scopeIn.some((j) => j.trim())) e.scopeIn = "projectForm.err.scopeIn";
      if (!w.deliverables.some((d) => d.title.trim())) e.deliverables = "projectForm.err.deliverables";
      w.deliverables.forEach((d, i) => { if (!d.title.trim()) e[`deliverables.${i}.title`] = "projectForm.err.deliverableTitle"; });
      if (!w.successCriteria.some((j) => j.trim())) e.successCriteria = "projectForm.err.successCriteria";
      {
        const inScope = new Set(w.scopeIn.map((s) => s.trim().toLocaleLowerCase("pt-BR")).filter(Boolean));
        if (w.scopeOut.some((s) => inScope.has(s.trim().toLocaleLowerCase("pt-BR")))) e.scopeOut = "projectForm.err.scopeConflict";
      }
      break;
    case "stakeholders":
      if (!w.stakeholders.length) e.stakeholders = "projectForm.err.stakeholders";
      w.stakeholders.forEach((s, i) => {
        if (!s.name.trim()) e[`stakeholders.${i}.name`] = "projectForm.err.name";
        if (!(s.power >= 1 && s.power <= 5)) e[`stakeholders.${i}.power`] = "projectForm.err.scale";
        if (!(s.interest >= 1 && s.interest <= 5)) e[`stakeholders.${i}.interest`] = "projectForm.err.scale";
      });
      break;
    case "team":
      if (!w.sponsorId) e.sponsorId = "projectForm.err.sponsor";
      if (!w.managerId) e.managerId = "projectForm.err.manager";
      w.deliverables.forEach((d, i) => {
        const row = w.raci[d.id] ?? {};
        const people = new Set(projectPeople(w));
        const effective = Object.fromEntries(Object.entries(row).filter(([u]) => people.has(u)));
        const problems = raciProblems(effective);
        if (problems.includes("MAIS_DE_UM_A")) e[`raci.${i}`] = "projectForm.err.raciManyA";
        else if (problems.includes("SEM_A")) e[`raci.${i}`] = "projectForm.err.raciNoA";
        else if (problems.includes("SEM_R")) e[`raci.${i}`] = "projectForm.err.raciNoR";
      });
      break;
    case "approach":
      if (w.approach !== "PREDITIVO") {
        if (!intIn(w.sprintWeeks, 1, 4)) e.sprintWeeks = "projectForm.err.sprintWeeks";
        if (w.sprintCount.trim() && !intIn(w.sprintCount, 1, 52)) e.sprintCount = "projectForm.err.sprintCount";
      }
      break;
    case "schedule": {
      if (!isDate(w.startDate)) e.startDate = "projectForm.err.date";
      const startOk = isDate(w.startDate);
      if (w.endDate) {
        if (!isDate(w.endDate)) e.endDate = "projectForm.err.date";
        else if (startOk && w.endDate < w.startDate) e.endDate = "projectForm.err.endBeforeStart";
      }
      const inRange = (d: string) => (!startOk || d >= w.startDate) && (!w.endDate || !isDate(w.endDate) || d <= w.endDate);
      w.milestones.forEach((m, i) => {
        if (!m.title.trim()) e[`milestones.${i}.title`] = "projectForm.err.milestoneTitle";
        if (!m.date) e[`milestones.${i}.date`] = "projectForm.err.milestoneDate";
        else if (!isDate(m.date)) e[`milestones.${i}.date`] = "projectForm.err.date";
        else if (!inRange(m.date)) e[`milestones.${i}.date`] = "projectForm.err.outOfRange";
      });
      w.deliverables.forEach((d, i) => {
        if (!intIn(d.durationDays, 0, 365)) e[`deliverables.${i}.durationDays`] = "projectForm.err.duration";
        if (d.dueAt && !isDate(d.dueAt)) e[`deliverables.${i}.dueAt`] = "projectForm.err.date";
        else if (d.dueAt && !inRange(d.dueAt)) e[`deliverables.${i}.dueAt`] = "projectForm.err.outOfRange";
      });
      break;
    }
    case "budget":
      w.budgetLines.forEach((b, i) => {
        if (!b.title.trim()) e[`budgetLines.${i}.title`] = "projectForm.err.lineTitle";
        const a = parseNumber(b.amount);
        if (!b.amount.trim() || !Number.isFinite(a) || a < 0) e[`budgetLines.${i}.amount`] = "projectForm.err.amount";
      });
      for (const k of ["contingency", "management"] as const) {
        const a = parseNumber(w[k]);
        if (!Number.isFinite(a) || a < 0) e[k] = "projectForm.err.amount";
      }
      break;
    case "risks":
      w.risks.forEach((r, i) => {
        if (!r.title.trim()) e[`risks.${i}.title`] = "projectForm.err.riskTitle";
        const p = parseNumber(r.probability);
        if (!r.probability.trim() || !Number.isFinite(p) || p < 0 || p > 100) e[`risks.${i}.probability`] = "projectForm.err.probability";
        const im = parseNumber(r.impact);
        if (!Number.isFinite(im) || im < 0) e[`risks.${i}.impact`] = "projectForm.err.amount";
      });
      break;
    case "governance":
      for (const k of ["g", "u", "t"] as const) if (!(w.gut[k] >= 1 && w.gut[k] <= 5)) e[`gut.${k}`] = "projectForm.err.scale";
      w.goals.forEach((g, i) => {
        if (!g.code.trim()) e[`goals.${i}.code`] = "projectForm.err.goalCode";
        if (!g.text.trim()) e[`goals.${i}.text`] = "projectForm.err.goalText";
      });
      if (w.accessClass === "SIGILOSO" && !w.accessReason.trim()) e.accessReason = "projectForm.err.accessReason";
      if ((w.accessClass === "SIGILOSO" || w.accessClass === "RESTRITO") && w.visibility === "PUBLICA") e.visibility = "projectForm.err.visibilityPublic";
      break;
    case "review":
      break;
  }
  return e;
}

/** Todos os passos com erro (para a revisão final): passo → erros. */
export function validateWizard(w: ProjectWizardInput): Partial<Record<WizardStep, WizardErrors>> {
  const out: Partial<Record<WizardStep, WizardErrors>> = {};
  for (const s of WIZARD_STEPS) {
    const e = validateStep(s, w);
    if (Object.keys(e).length) out[s] = e;
  }
  return out;
}

/** Totais do orçamento: linhas, + contingência = linha de base de custos; + gerencial = orçamento total. VME das ameaças para comparar. */
export function budgetTotals(w: Pick<ProjectWizardInput, "budgetLines" | "contingency" | "management" | "risks">) {
  const n = (s: string) => {
    const x = parseNumber(s);
    return Number.isFinite(x) && x > 0 ? x : 0;
  };
  const lines = w.budgetLines.reduce((s, b) => s + n(b.amount), 0);
  const contingency = n(w.contingency);
  const management = n(w.management);
  const threatsEmv = w.risks.filter((r) => r.kind === "AMEACA").reduce((s, r) => s + emv(n(r.probability) / 100, n(r.impact)), 0);
  return { lines, contingency, management, baseline: lines + contingency, total: lines + contingency + management, threatsEmv: Math.round(threatsEmv * 100) / 100 };
}

/** Calendário das sprints a partir do início (timebox fixo); vazio na abordagem preditiva ou sem quantidade. */
export function sprintCalendar(w: Pick<ProjectWizardInput, "approach" | "sprintWeeks" | "sprintCount" | "startDate">): { number: number; start: IsoDate; end: IsoDate }[] {
  if (w.approach === "PREDITIVO" || !intIn(w.sprintWeeks, 1, 4) || !intIn(w.sprintCount, 1, 52) || !isDate(w.startDate)) return [];
  const len = Number(w.sprintWeeks) * 7;
  return Array.from({ length: Number(w.sprintCount) }, (_, i) => ({ number: i + 1, start: addDays(w.startDate, i * len), end: addDays(w.startDate, (i + 1) * len - 1) }));
}

const lines = (xs: readonly string[]) => xs.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
const toFormat = (f: FormatChoice): DeliverableFormat | undefined => {
  const n = normalizeFormat(f);
  if (!n.family) return undefined;
  return { family: n.family, ...(n.variant ? { variant: n.variant } : {}), ...(Object.keys(n.details).length ? { details: n.details } : {}) };
};

export interface WizardContext { id: string; actorId: string; now: Date }

/**
 * Monta o projeto: parte de `blankProject` (mesma forma do "em branco") e preenche TAP, EAP (uma entrega por pacote sob a raiz), uma
 * atividade por entrega (com prazo, duração, formato e RACI) e um marco por marco, partes interessadas, equipe, riscos, orçamento,
 * reservas, sprints, governança e acesso. A versão 1 continua "Projeto criado".
 */
export function wizardToProject(w: ProjectWizardInput, ctx: WizardContext): ProjectModel {
  const base = blankProject({ id: ctx.id, title: w.title, area: w.area, approach: w.approach, startDate: w.startDate, actorId: ctx.actorId, now: ctx.now });
  const nowIso = ctx.now.toISOString();
  const goals = w.goals.filter((g) => g.code.trim() && g.text.trim()).map((g, i) => ({ id: `g${i + 1}`, code: g.code.trim(), text: g.text.trim(), source: g.source }));
  const goalByCode = new Map(goals.map((g) => [g.code.toLocaleLowerCase("pt-BR"), g.id]));
  const objectives = w.objectives.filter((o) => o.text.trim()).map((o, i) => ({
    id: `o${i + 1}`, text: o.text.trim(), smart: isSmart(o), ...(goalByCode.get(o.goalCode.trim().toLocaleLowerCase("pt-BR")) ? { goalId: goalByCode.get(o.goalCode.trim().toLocaleLowerCase("pt-BR"))! } : {}),
    ...(o.indicator.trim() ? { indicator: o.indicator.trim() } : {}), ...(o.target.trim() ? { target: o.target.trim() } : {}), ...(isDate(o.deadline) ? { deadline: o.deadline } : {}),
  }));
  const deliverables = w.deliverables.filter((d) => d.title.trim());
  const wbs = [
    { id: "w0", title: base.title },
    ...deliverables.map((d, i) => {
      const format = toFormat(d.format);
      return { id: `w${i + 1}`, parentId: "w0", title: d.title.trim(), ...(d.acceptance.trim() ? { acceptance: d.acceptance.trim() } : {}), ...(d.ownerId ? { ownerId: d.ownerId } : {}), ...(format ? { format } : {}) };
    }),
  ];
  const people = new Set(projectPeople(w));
  const pad = (n: number) => String(n).padStart(2, "0");
  const deliverableTasks = deliverables.map((d, i) => {
    const format = toFormat(d.format);
    return {
      id: `t${i + 1}`, code: `T${pad(i + 1)}`, title: d.title.trim(), phase: "EXECUCAO" as const, status: "A_FAZER" as const, wbsId: `w${i + 1}`,
      ...(d.ownerId ? { responsibleId: d.ownerId } : {}), durationDays: Number(d.durationDays) || 0, percentComplete: 0, budget: 0, actualCost: 0,
      createdBy: ctx.actorId, createdAt: nowIso, ...(isDate(d.dueAt) ? { dueAt: d.dueAt } : {}), ...(format ? { format } : {}),
    };
  });
  const milestones = w.milestones.filter((m) => m.title.trim() && isDate(m.date));
  const milestoneTasks = milestones.map((m, i) => ({
    id: `tm${i + 1}`, code: `T${pad(deliverables.length + i + 1)}`, title: m.title.trim(), phase: "EXECUCAO" as const, status: "A_FAZER" as const, durationDays: 0,
    milestone: true, percentComplete: 0, budget: 0, actualCost: 0, createdBy: ctx.actorId, createdAt: nowIso, dueAt: m.date,
  }));
  const raci = deliverables.flatMap((d, i) => Object.entries(w.raci[d.id] ?? {})
    .filter(([u, letters]) => people.has(u) && letters.length)
    .map(([userId, letters]) => ({ taskId: `t${i + 1}`, userId, letters: [...letters] })));
  const team: ProjectModel["team"] = [];
  const addMember = (userId: string, role: ProjectRole) => { if (userId && !team.some((m) => m.userId === userId && m.role === role)) team.push({ userId, role }); };
  addMember(w.sponsorId, "PATROCINADOR");
  addMember(w.managerId, "GERENTE");
  w.team.forEach((m) => addMember(m.userId, m.role));
  const totals = budgetTotals(w);
  const risks = w.risks.filter((r) => r.title.trim()).map((r, i) => ({
    id: `k${i + 1}`, title: r.title.trim(), kind: r.kind, probability: Math.min(1, Math.max(0, parseNumber(r.probability) / 100)), impact: Math.max(0, parseNumber(r.impact) || 0),
    impactLevel: Math.min(5, Math.max(1, Math.round(r.impactLevel))), ...(r.response ? { response: r.response } : {}), ...(r.ownerId ? { ownerId: r.ownerId } : {}),
    taskIds: [], status: "ABERTO" as const,
  }));
  const sprints = sprintCalendar(w);
  const description = w.description.trim();
  return {
    ...base,
    ...(description ? { description } : {}),
    ...(isDate(w.endDate) ? { targetEndDate: w.endDate } : {}),
    access: { accessClass: w.accessClass, visibility: w.visibility, ...(w.accessReason.trim() ? { justification: w.accessReason.trim() } : {}) },
    boardModel: w.boardModel,
    ...(sprints.length ? { sprints, currentSprint: 1 } : {}),
    team,
    charter: {
      ...base.charter,
      justification: lines(w.justification), objectives, product: w.product.trim(), highLevelRequirements: lines(w.requirements), premises: lines(w.premises),
      constraints: lines(w.constraints), highLevelRisks: risks.map((r) => r.title), teamRoles: lines(w.teamRoles),
      milestones: milestones.map((m, i) => ({ id: `m${i + 1}`, title: m.title.trim(), date: m.date })), summaryBudget: totals.total,
      managerId: w.managerId || ctx.actorId, ...(w.sponsorId ? { sponsorId: w.sponsorId } : {}),
      scopeIn: lines(w.scopeIn), scopeOut: lines(w.scopeOut), successCriteria: lines(w.successCriteria),
    },
    stakeholders: w.stakeholders.filter((s) => s.name.trim()).map((s, i) => ({ id: `s${i + 1}`, name: s.name.trim(), ...(s.role.trim() ? { role: s.role.trim() } : {}), power: s.power, interest: s.interest })),
    wbs,
    tasks: [...deliverableTasks, ...milestoneTasks],
    raci,
    risks,
    budgetLines: w.budgetLines.filter((b) => b.title.trim()).map((b, i) => ({ id: `b${i + 1}`, title: b.title.trim(), amount: Math.max(0, parseNumber(b.amount) || 0), spend: b.spend })),
    reserves: { contingency: totals.contingency, management: totals.management },
    governance: {
      goals, gut: { ...w.gut }, ...(w.need ? { need: w.need } : {}), spend: w.spend, orgStructure: w.orgStructure,
      iso38500: w.area === "SOFTWARE" ? { ...w.iso38500 } : {},
    },
    origin: { kind: "CRIAR_PROJETO", ...(w.originRef.trim() ? { ref: w.originRef.trim() } : {}) },
  };
}

/** Duração do projeto declarada (dias corridos entre início e término previsto), ou null. */
export const declaredSpan = (w: Pick<ProjectWizardInput, "startDate" | "endDate">) => (isDate(w.startDate) && isDate(w.endDate) ? diffDays(w.startDate, w.endDate) : null);

/** Assistente a partir de um projeto existente (modelo): traz o que o modelo já tem para revisar no assistente. */
export function wizardFromProject(p: ProjectModel, opts: { today: IsoDate; actorId: string }): ProjectWizardInput {
  const w = emptyWizard(opts);
  const root = p.wbs.find((n) => !n.parentId)?.id;
  const deliverables = p.wbs.filter((n) => n.parentId && n.parentId === root).slice(0, 30);
  const ds = deliverables.map((n) => ({
    id: rowId("d"), title: n.title, acceptance: n.acceptance ?? "", ownerId: n.ownerId ?? "", durationDays: "5", dueAt: "",
    format: normalizeFormat(n.format ?? null),
  }));
  return {
    ...w,
    title: p.title, description: p.description ?? "", area: p.area ?? "SOFTWARE", originRef: p.origin?.ref ?? "",
    objectives: p.charter.objectives.length
      ? p.charter.objectives.map((o) => ({ id: rowId("o"), text: o.text, indicator: o.indicator ?? "", target: o.target ?? "", deadline: o.deadline ?? "", goalCode: p.governance.goals.find((g) => g.id === o.goalId)?.code ?? "" }))
      : w.objectives,
    justification: p.charter.justification.length ? [...p.charter.justification] : w.justification,
    product: p.charter.product, scopeIn: p.charter.scopeIn?.length ? [...p.charter.scopeIn] : w.scopeIn, scopeOut: [...(p.charter.scopeOut ?? [])],
    premises: [...p.charter.premises], constraints: [...p.charter.constraints], requirements: [...p.charter.highLevelRequirements],
    successCriteria: p.charter.successCriteria?.length ? [...p.charter.successCriteria] : w.successCriteria,
    deliverables: ds,
    raci: Object.fromEntries(ds.map((d) => [d.id, w.managerId ? { [w.managerId]: ["R", "A"] as RaciLetter[] } : {}])),
    stakeholders: p.stakeholders.map((s) => ({ id: rowId("s"), name: s.name, role: s.role ?? "", power: s.power, interest: s.interest })),
    teamRoles: [...p.charter.teamRoles],
    approach: p.approach, boardModel: p.boardModel,
    budgetLines: p.budgetLines.map((b) => ({ id: rowId("b"), title: b.title, amount: String(b.amount), spend: b.spend })),
    contingency: p.reserves.contingency ? String(p.reserves.contingency) : "", management: p.reserves.management ? String(p.reserves.management) : "",
    risks: p.risks.map((r) => ({ id: rowId("k"), title: r.title, kind: r.kind, probability: String(Math.round(r.probability * 100)), impact: String(r.impact), impactLevel: r.impactLevel, response: r.response ?? "", ownerId: "" })),
    gut: p.governance.gut ? { ...p.governance.gut } : w.gut, need: p.governance.need ?? "", spend: p.governance.spend, orgStructure: p.governance.orgStructure,
    goals: p.governance.goals.map((g) => ({ id: rowId("g"), code: g.code, text: g.text, source: g.source })),
  };
}
