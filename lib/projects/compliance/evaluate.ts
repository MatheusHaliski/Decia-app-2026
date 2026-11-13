/**
 * Verificação do Espelho de Conformidade (RF32, `ComplianceService.evaluate`) — função PURA: confronta a estrutura do projeto
 * (atividades com fase e responsável, EAP, requisitos, riscos, orçamento, portões, lições, objetivos) com os checklists e devolve,
 * por item, ATENDIDO (com o que atende), PARCIAL (o que falta: fase, responsável, atividade), FALTANDO ou NÃO SE APLICA (com o
 * motivo). Placar por fonte e por fase; obrigatórios faltando bloqueiam a passagem para a Aprovação sem justificativa do chefe.
 *
 * `mirrorSummary(model)` é a leitura compacta para outros módulos (Feedback da Mesa, card do projeto, Simulador) sem depender
 * da tela nem do armazenamento.
 */
import { PROJECT_PHASES, type ProjectArea, type ProjectModel, type ProjectPhase } from "../types";
import { CATALOG_VERSION, defaultChecklists } from "./catalog";
import { hasKeyword, normalizeText } from "./text";
import {
  CHECKLIST_SOURCES, SIGNALS, TASK_RULES,
  type Applicability, type ChecklistSource, type ComplianceChecklist, type ComplianceItem, type Evidence, type EvidenceKind, type ItemResult,
  type MirrorContext, type MirrorResult, type ReasonCode, type Rule, type Score, type Signal, type SignalResult, type Waiver,
} from "./types";

/** Texto do projeto já normalizado, com a origem (evidência). */
interface Doc extends Evidence { norm: string; milestone?: boolean }

export function projectCorpus(model: ProjectModel): Doc[] {
  const docs: Doc[] = [];
  const add = (kind: EvidenceKind, id: string, label: string, extra: Partial<Doc> = {}, text = label) => {
    if (label.trim()) docs.push({ kind, id, label, norm: normalizeText(text), ...extra });
  };
  const c = model.charter;
  add("CHARTER", "title", model.title);
  add("CHARTER", "product", c.product);
  const lists = ["justification", "highLevelRequirements", "premises", "constraints", "highLevelRisks"] as const;
  for (const list of lists) c[list].forEach((text, i) => add("CHARTER", `${list}:${i}`, text));
  for (const t of model.tasks) add("TASK", t.id, t.title, { code: t.code, phase: t.phase, responsibleId: t.responsibleId, milestone: t.milestone });
  for (const n of model.wbs) if (n.parentId) add("WBS", n.id, n.title, { responsibleId: n.ownerId });
  for (const r of model.requirements) add("REQ", r.id, r.text, { code: r.code }, `${r.text} ${r.origin ?? ""}`);
  for (const r of model.risks) add("RISK", r.id, r.title, { responsibleId: r.ownerId });
  for (const b of model.budgetLines) add("BUDGET", b.id, b.title);
  for (const s of model.stakeholders) add("STK", s.id, s.name, {}, `${s.name} ${s.role ?? ""}`);
  return docs;
}

const matches = (d: { norm: string }, keywords: readonly string[]) => keywords.some((k) => hasKeyword(d.norm, k));
const strip = (d: Doc): Evidence => {
  const e: Evidence = { kind: d.kind, id: d.id, label: d.label };
  if (d.code !== undefined) e.code = d.code;
  if (d.phase !== undefined) e.phase = d.phase;
  if (d.responsibleId !== undefined) e.responsibleId = d.responsibleId;
  return e;
};

// ------------------------------------------------------------------ sinais (em que tipo de projeto o item vale)

export const SIGNAL_KEYWORDS: Record<Signal, readonly string[]> = {
  CONTRATACAO: ["contrat*", "licita*", "fornecedor*", "aquisic*", "pregao", "edital", "terceiriz*"],
  DADOS_PESSOAIS: ["lgpd", "dados pessoais", "dado pessoal", "cpf", "cadastro*", "login", "titular*", "privacidade", "prontuario*"],
  DADOS_SENSIVEIS: ["dado sensivel", "dados sensiveis", "dados pessoais sensiveis", "saude", "prontuario*", "biometri*", "genetic*", "religi*", "etnic*", "racial", "sindica*", "vida sexual", "opiniao politica"],
  SISTEMA_DIGITAL: ["sistema*", "software", "aplicativo*", "app", "plataforma*", "portal", "site", "sitio eletronico", "digital"],
  OBRA_OU_ESPACO: ["obra civil", "obras", "reforma*", "edificac*", "edificio*", "predio*", "espaco fisico", "auditorio*", "calcada*", "pavimentac*", "canteiro"],
};
const SIGNAL_AREAS: Partial<Record<Signal, readonly ProjectArea[]>> = { SISTEMA_DIGITAL: ["SOFTWARE"], OBRA_OU_ESPACO: ["ENGENHARIA"] };

export function projectSignals(model: ProjectModel, docs: readonly Doc[] = projectCorpus(model)): Record<Signal, SignalResult> {
  const area = model.area ?? "SOFTWARE";
  const out = {} as Record<Signal, SignalResult>;
  for (const signal of SIGNALS) {
    const evidence: Evidence[] = [];
    if (SIGNAL_AREAS[signal]?.includes(area)) evidence.push({ kind: "AREA", id: "area", label: area });
    if (signal === "CONTRATACAO" && model.governance.need === "CONTRATACAO") evidence.push({ kind: "NEED", id: "need", label: "CONTRATACAO" });
    for (const d of docs) if (matches(d, SIGNAL_KEYWORDS[signal])) evidence.push(strip(d));
    out[signal] = { signal, on: evidence.length > 0, evidence: evidence.slice(0, 6) };
  }
  return out;
}

function applicability(a: Applicability, signals: Record<Signal, SignalResult>, model: ProjectModel): { ok: true } | { ok: false; code: ReasonCode; vars: Record<string, string> } {
  switch (a.kind) {
    case "SEMPRE": return { ok: true };
    case "SINAL": return signals[a.signal].on ? { ok: true } : { ok: false, code: "NA_SINAL", vars: { signal: a.signal } };
    case "AREA": {
      const area = model.area ?? "SOFTWARE";
      return a.areas.includes(area) ? { ok: true } : { ok: false, code: "NA_AREA", vars: { area } };
    }
    case "TODOS":
      for (const x of a.of) {
        const r = applicability(x, signals, model);
        if (!r.ok) return r;
      }
      return { ok: true };
  }
}

// ------------------------------------------------------------------ regras

type RuleOutcome = Pick<ItemResult, "status" | "reason" | "evidence"> & { canSuggest?: boolean; moveTaskId?: string };
const out = (status: ItemResult["status"], code: ReasonCode, vars: Record<string, string | number> = {}, evidence: Evidence[] = [], extra: Partial<RuleOutcome> = {}): RuleOutcome =>
  ({ status, reason: { code, vars }, evidence, ...extra });

/** Atividades que casam com as palavras (ou ligadas ao item) classificadas por fase e responsável; marco sem palavras = qualquer marco. */
function taskMatches(docs: readonly Doc[], keywords: readonly string[], phases: readonly ProjectPhase[], linked: ReadonlySet<string>, milestone: boolean): Evidence[] {
  const any = milestone && !keywords.length;
  return docs
    .filter((d) => d.kind === "TASK" && Boolean(d.milestone) === milestone && (any || linked.has(d.id) || matches(d, keywords)))
    .map((d) => ({ ...strip(d), inPhase: d.phase !== undefined && phases.includes(d.phase), linked: linked.has(d.id) || undefined }));
}

/** Atividade na fase com responsável → ATENDIDO; sem responsável / fase errada / só mencionada → PARCIAL; nada → FALTANDO. */
function classifyTasks(found: readonly Evidence[], phases: readonly ProjectPhase[], needsResponsible: boolean, mentions: readonly Evidence[], keywords: readonly string[]): RuleOutcome {
  const phasesVar = phases.join(",");
  const full = found.filter((e) => e.inPhase && (!needsResponsible || e.responsibleId));
  if (full.length) return out("ATENDIDO", "ATENDIDO", {}, [...full, ...found.filter((e) => !full.includes(e))]);
  const noResp = found.find((e) => e.inPhase && !e.responsibleId);
  if (noResp) return out("PARCIAL", "SEM_RESPONSAVEL", { code: noResp.code ?? noResp.label }, [...found]);
  const wrong = found.find((e) => !e.inPhase);
  if (wrong) return out("PARCIAL", "FASE_ERRADA", { code: wrong.code ?? wrong.label, phase: wrong.phase ?? "", phases: phasesVar }, [...found], { moveTaskId: wrong.id });
  if (mentions.length) return out("PARCIAL", "SO_MENCAO", {}, [...mentions], { canSuggest: true });
  return out("FALTANDO", "FALTANDO", { keywords: keywords.map((k) => k.replace(/\*$/, "…")).slice(0, 4).join(", ") }, [], { canSuggest: true });
}

function evaluateRule(rule: Rule, item: ComplianceItem, model: ProjectModel, docs: readonly Doc[], linked: ReadonlySet<string>): RuleOutcome {
  switch (rule.kind) {
    case "ARTEFATO": {
      const found = taskMatches(docs, rule.keywords, rule.phases, linked, false);
      const mentions = docs.filter((d) => (d.kind === "WBS" || d.kind === "REQ" || d.kind === "CHARTER" || d.kind === "BUDGET") && matches(d, rule.keywords)).map(strip);
      return classifyTasks(found, rule.phases, rule.needsResponsible !== false, mentions, rule.keywords);
    }
    case "MARCO": {
      const found = taskMatches(docs, rule.keywords, rule.phases, linked, true);
      const inPhase = found.filter((e) => e.inPhase);
      if (inPhase.length) return out("ATENDIDO", "ATENDIDO", {}, found);
      const wrong = found.find((e) => !e.inPhase);
      if (wrong) return out("PARCIAL", "FASE_ERRADA", { code: wrong.code ?? wrong.label, phase: wrong.phase ?? "", phases: rule.phases.join(",") }, found, { moveTaskId: wrong.id });
      const plain = taskMatches(docs, rule.keywords, rule.phases, linked, false);
      if (plain.length && rule.keywords.length) return out("PARCIAL", "NAO_E_MARCO", { code: plain[0]!.code ?? plain[0]!.label }, plain, { canSuggest: true });
      return out("FALTANDO", "FALTANDO", { keywords: rule.keywords.map((k) => k.replace(/\*$/, "…")).slice(0, 4).join(", ") }, [], { canSuggest: true });
    }
    case "RISCO": {
      const risks = model.risks.filter((r) => r.status !== "ENCERRADO" && hasAny(r.title, rule.keywords));
      const handled = risks.filter((r) => r.response && r.ownerId);
      const phases = rule.phases ?? [item.phase];
      const tasks = rule.taskKeywords?.length || linked.size ? taskMatches(docs, rule.taskKeywords ?? [], phases, linked, false) : [];
      const riskEv = (r: (typeof risks)[number]): Evidence => ({ kind: "RISK", id: r.id, label: r.title, responsibleId: r.ownerId });
      const fullTasks = tasks.filter((e) => e.inPhase && e.responsibleId);
      if (handled.length || fullTasks.length) return out("ATENDIDO", "ATENDIDO", {}, [...handled.map(riskEv), ...fullTasks]);
      if (risks.length) return out("PARCIAL", "RISCO_SEM_RESPOSTA", { title: risks[0]!.title }, risks.map(riskEv), { canSuggest: true });
      return classifyTasks(tasks, phases, true, [], [...rule.keywords, ...(rule.taskKeywords ?? [])]);
    }
    case "ORCAMENTO": {
      const lines = docs.filter((d) => d.kind === "BUDGET" && matches(d, rule.keywords)).map(strip);
      return lines.length ? out("ATENDIDO", "ATENDIDO", {}, lines) : out("FALTANDO", "ORCAMENTO_FALTANDO", { keywords: rule.keywords.slice(0, 4).join(", ") });
    }
    case "PORTOES_NO_DECIA": {
      const decided = model.gates.filter((g) => g.outcome !== "PENDENTE");
      const ev = decided.map((g): Evidence => ({ kind: "GATE", id: g.phase, label: g.outcome, phase: g.phase, linked: g.decisionId ? true : undefined }));
      if (!decided.length) return out("NAO_SE_APLICA", "PORTOES_NENHUM");
      const withDecision = decided.filter((g) => g.decisionId).length;
      if (withDecision === decided.length) return out("ATENDIDO", "PORTOES_TODOS", { n: withDecision }, ev);
      if (withDecision > 0) return out("PARCIAL", "PORTOES_PARCIAL", { n: withDecision, total: decided.length }, ev);
      return out("FALTANDO", "PORTOES_SEM_DECISAO", { total: decided.length }, ev);
    }
    case "LICOES": {
      const phases = [...new Set(model.lessons.map((l) => l.phase))];
      const ev = model.lessons.map((l): Evidence => ({ kind: "LESSON", id: l.id, label: l.text, phase: l.phase }));
      if (phases.length >= rule.minPhases) return out("ATENDIDO", "LICOES_OK", { n: phases.length }, ev);
      if (phases.length) return out("PARCIAL", "LICOES_POUCAS", { n: phases.length, min: rule.minPhases }, ev);
      return out("FALTANDO", "LICOES_NENHUMA", { min: rule.minPhases });
    }
    case "REVISAO": {
      const done = model.tasks.filter((t) => t.status === "CONCLUIDA" && !t.milestone);
      if (!done.length) return out("NAO_SE_APLICA", "REVISAO_SEM_ENTREGAS");
      const reviewed = done.filter((t) => t.reviewerId && t.reviewerId !== t.responsibleId);
      const ev = done.map((t): Evidence => ({ kind: "TASK", id: t.id, code: t.code, label: t.title, phase: t.phase, responsibleId: t.responsibleId, inPhase: reviewed.includes(t) }));
      if (reviewed.length === done.length) return out("ATENDIDO", "REVISAO_OK", { n: done.length }, ev);
      if (reviewed.length) return out("PARCIAL", "REVISAO_PARCIAL", { reviewed: reviewed.length, done: done.length }, ev);
      return out("FALTANDO", "REVISAO_NENHUMA", { done: done.length }, ev);
    }
    case "OBJETIVO_ALINHADO": {
      const goals = model.governance.goals.filter((g) => g.source === rule.source);
      if (!goals.length) return out("FALTANDO", "META_INEXISTENTE", { source: rule.source });
      const objs = model.charter.objectives.filter((o) => o.goalId && goals.some((g) => g.id === o.goalId));
      const ev = goals.map((g): Evidence => ({ kind: "GOAL", id: g.id, code: g.code, label: g.text }));
      if (objs.length) return out("ATENDIDO", "META_LIGADA", { code: goals.find((g) => g.id === objs[0]!.goalId)!.code }, ev);
      return out("PARCIAL", "META_SEM_LIGACAO", { code: goals[0]!.code, source: rule.source }, ev);
    }
  }
}

const hasAny = (text: string, keywords: readonly string[]) => {
  const n = normalizeText(text);
  return keywords.some((k) => hasKeyword(n, k));
};

// ------------------------------------------------------------------ resultado

const emptyScore = (): Score => ({ applicable: 0, met: 0, partial: 0, missing: 0, notApplicable: 0, percent: null });
function tally(s: Score, r: ItemResult) {
  if (r.status === "NAO_SE_APLICA") s.notApplicable++;
  else {
    s.applicable++;
    if (r.status === "ATENDIDO") s.met++;
    else if (r.status === "PARCIAL") s.partial++;
    else s.missing++;
  }
  s.percent = s.applicable ? Math.round((s.met / s.applicable) * 100) : null;
}

export function evaluateItem(item: ComplianceItem, checklist: Pick<ComplianceChecklist, "source" | "example">, model: ProjectModel, ctx: {
  docs: readonly Doc[]; signals: Record<Signal, SignalResult>; links: ReadonlyMap<string, ReadonlySet<string>>; waivers: Readonly<Record<string, Waiver>>;
}): ItemResult {
  const base = { item, source: checklist.source, example: checklist.example, blocking: false, canSuggest: false };
  const app = applicability(item.appliesTo, ctx.signals, model);
  if (!app.ok) return { ...base, status: "NAO_SE_APLICA", reason: { code: app.code, vars: app.vars }, evidence: [] };
  const linked = ctx.links.get(item.id) ?? new Set<string>();
  const r = evaluateRule(item.rule, item, model, ctx.docs, linked);
  const waiver = ctx.waivers[item.id];
  if (waiver && r.status !== "NAO_SE_APLICA") {
    return { ...base, status: "NAO_SE_APLICA", reason: { code: "NA_MARCADO", vars: { by: waiver.by, reason: waiver.reason } }, evidence: r.evidence, waiver };
  }
  const canSuggest = Boolean(r.canSuggest && item.suggestion && TASK_RULES.has(item.rule.kind) && (r.status === "FALTANDO" || r.status === "PARCIAL"));
  return {
    ...base, status: r.status, reason: r.reason, evidence: r.evidence, canSuggest, moveTaskId: r.moveTaskId,
    blocking: item.requirement === "OBRIGATORIO" && r.status === "FALTANDO",
  };
}

/** Confronta o projeto com os checklists (padrão: catálogo do sistema + semente do departamento). */
export function evaluateMirror(model: ProjectModel, ctx: MirrorContext = {}): MirrorResult {
  const checklists = ctx.checklists ?? defaultChecklists();
  const docs = projectCorpus(model);
  const signals = projectSignals(model, docs);
  const taskIds = new Set(model.tasks.map((t) => t.id));
  const links = new Map<string, Set<string>>();
  for (const l of ctx.links ?? []) if (taskIds.has(l.taskId)) links.set(l.itemId, (links.get(l.itemId) ?? new Set()).add(l.taskId));
  const waivers = ctx.waivers ?? {};
  const items = checklists.flatMap((c) => c.items.map((item) => evaluateItem(item, c, model, { docs, signals, links, waivers })));
  const score = emptyScore();
  const bySource = Object.fromEntries(CHECKLIST_SOURCES.map((s) => [s, emptyScore()])) as Record<ChecklistSource, Score>;
  const byPhase = Object.fromEntries(PROJECT_PHASES.map((p) => [p, emptyScore()])) as Record<ProjectPhase, Score>;
  for (const r of items) {
    tally(score, r);
    tally(bySource[r.source], r);
    tally(byPhase[r.item.phase], r);
  }
  return { catalogVersion: CATALOG_VERSION, signals, items, score, bySource, byPhase, blocking: items.filter((r) => r.blocking) };
}

// ------------------------------------------------------------------ leitura compacta e portão da Aprovação

/** Justificativa do chefe para passar à Aprovação com obrigatórios pendentes (autoridade humana, RF32.CA04). */
export interface ApprovalOverride { by: string; reason: string; at: string; blockingCodes: string[] }
export type GateStatus = "LIBERADO" | "BLOQUEADO" | "LIBERADO_COM_JUSTIFICATIVA";

export function approvalGate(result: Pick<MirrorResult, "blocking">, override?: ApprovalOverride | null): { status: GateStatus; blocking: string[]; uncovered: string[] } {
  const blocking = result.blocking.map((r) => r.item.code);
  if (!blocking.length) return { status: "LIBERADO", blocking, uncovered: [] };
  const uncovered = override ? blocking.filter((c) => !override.blockingCodes.includes(c)) : blocking;
  return { status: override && !uncovered.length ? "LIBERADO_COM_JUSTIFICATIVA" : "BLOQUEADO", blocking, uncovered };
}

export interface MirrorSummary {
  catalogVersion: string;
  percent: number | null;
  met: number;
  partial: number;
  missing: number;
  applicable: number;
  /** obrigatórios faltando (códigos dos itens) */
  blocking: string[];
  bySource: Record<ChecklistSource, Pick<Score, "percent" | "applicable" | "met">>;
  gate: GateStatus;
}

/** Leitura compacta do Espelho para outro módulo (ex.: Feedback da Mesa) — pura, sem tela nem armazenamento. */
export function mirrorSummary(model: ProjectModel, ctx: MirrorContext & { override?: ApprovalOverride | null } = {}): MirrorSummary {
  const r = evaluateMirror(model, ctx);
  const bySource = Object.fromEntries(CHECKLIST_SOURCES.map((s) => [s, { percent: r.bySource[s].percent, applicable: r.bySource[s].applicable, met: r.bySource[s].met }])) as MirrorSummary["bySource"];
  return {
    catalogVersion: r.catalogVersion, percent: r.score.percent, met: r.score.met, partial: r.score.partial, missing: r.score.missing, applicable: r.score.applicable,
    blocking: r.blocking.map((x) => x.item.code), bySource, gate: approvalGate(r, ctx.override).status,
  };
}
