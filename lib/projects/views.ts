/**
 * Projeções do mesmo modelo (RF22: "trocar de visão reprojeta o mesmo estado"): quadro por fases, linha do tempo (Gantt + rede
 * PERT/CPM + curva S), canvas (itens, zonas e ligações), EAP, rastreabilidade e valor agregado. Nada aqui muda o modelo.
 */
import { ITEM_SIZE, LANES_TOP, LANE_HEADER, LANE_W, gridSlot, makeRef, type Rect, type Zone } from "./canvas";
import { canvasZones, effectiveDuration, flattenWbs, scheduleOf, wbsTree, type WbsTreeNode } from "./derive";
import { earnedAndActual, evm, plannedValueAt, sCurve, type EvmResult } from "./engine/evm";
import { emv, looksLikeActivity, mendelow, probabilityLevel, raciProblems, riskSeverity, type EngagementStrategy, type RaciLetter, type RaciProblem, type RiskBand } from "./engine/methods";
import { pathStats, pert, probabilityByTarget, targetForConfidence } from "./engine/pert";
import { dateToOffset, offsetToDate, type SchedRow } from "./engine/schedule";
import { PHASE_META, PMC_TARGET, boardColumns, type BoardColumnDef, type PmcBlock } from "./lifecycle";
import { FLOW_STATUSES, PROJECT_PHASES, type BoardModel, type CanvasRef, type FlowStatus, type ProjectModel, type ProjectPhase, type Task } from "./types";

// ---------------------------------------------------------------- cronograma
export interface TimelineRow extends SchedRow { task: Task; startDate: string; endDate: string; baseline?: { es: number; ef: number } }
export interface TimelineView {
  ok: boolean;
  cycle?: string[];
  rows: TimelineRow[];
  finish: number;
  finishDate: string;
  criticalPath: string[];
  dependencies: ProjectModel["dependencies"];
  statusOffset: number;
  /** PERT do caminho crítico: TE, σ, probabilidade de cumprir a linha de base (ou o término) e o prazo P80 */
  pert: { te: number; sd: number; target: number; probability: number; p80: number } | null;
  curve: { t: number; pv: number }[];
  baselineFinish?: number;
}

export function timelineView(model: ProjectModel): TimelineView {
  const s = scheduleOf(model);
  const statusOffset = dateToOffset(model.startDate, model.statusDate);
  if (!s.ok) {
    return {
      ok: false, cycle: "cycle" in s ? s.cycle : [], rows: [], finish: 0, finishDate: model.startDate, criticalPath: [], dependencies: model.dependencies,
      statusOffset, pert: null, curve: [], baselineFinish: model.baseline?.finish,
    };
  }
  const byId = new Map(model.tasks.map((t) => [t.id, t]));
  const rows: TimelineRow[] = s.order.map((id) => {
    const row = s.rows[id]!;
    const b = model.baseline?.tasks[id];
    return {
      ...row, task: byId.get(id)!, startDate: offsetToDate(model.startDate, row.es), endDate: offsetToDate(model.startDate, Math.max(row.es, row.ef - 1e-6)),
      baseline: b ? { es: b.es, ef: b.ef } : undefined,
    };
  });
  // PERT no caminho crítico: atividades sem três pontos contam como determinísticas (variância 0)
  const est = s.criticalPath.map((id) => {
    const t = byId.get(id)!;
    return t.pert && pert(t.pert).valid ? pert(t.pert) : { te: effectiveDuration(t), sd: 0, variance: 0, valid: true };
  });
  const path = pathStats(est);
  const target = model.baseline?.finish ?? s.finish;
  const budgets = Object.fromEntries(model.tasks.map((t) => [t.id, t.budget]));
  const planRows = model.baseline ? model.baseline.tasks : s.rows;
  const planFinish = model.baseline?.finish ?? s.finish;
  return {
    ok: true, rows, finish: s.finish, finishDate: offsetToDate(model.startDate, s.finish), criticalPath: s.criticalPath, dependencies: model.dependencies,
    statusOffset,
    pert: { te: path.te, sd: path.sd, target, probability: probabilityByTarget(path.te, path.sd, target), p80: targetForConfidence(path.te, path.sd, 0.8) },
    curve: sCurve(planRows, model.baseline ? Object.fromEntries(Object.entries(model.baseline.tasks).map(([id, b]) => [id, b.budget])) : budgets, planFinish),
    baselineFinish: model.baseline?.finish,
  };
}

// ---------------------------------------------------------------- valor agregado
export function evmView(model: ProjectModel): EvmResult & { statusOffset: number; usesBaseline: boolean } {
  const statusOffset = dateToOffset(model.startDate, model.statusDate);
  const { ev, ac, bac } = earnedAndActual(model.tasks);
  let pv = 0;
  if (model.baseline) {
    pv = plannedValueAt(model.baseline.tasks, Object.fromEntries(Object.entries(model.baseline.tasks).map(([id, b]) => [id, b.budget])), statusOffset);
  } else {
    const s = scheduleOf(model);
    if (s.ok) pv = plannedValueAt(s.rows, Object.fromEntries(model.tasks.map((t) => [t.id, t.budget])), statusOffset);
  }
  return { ...evm({ pv, ev, ac, bac: model.baseline?.bac ?? bac }), statusOffset, usesBaseline: Boolean(model.baseline) };
}

// ---------------------------------------------------------------- quadro por fases
export interface BoardCard {
  task: Task;
  critical: boolean;
  totalFloat: number | null;
  accountable?: string;
  responsible: string[];
  risks: number;
  /** atividade criada depois da linha de base sem mudança aprovada (scope creep) */
  unauthorized: boolean;
}
export interface BoardColumn extends BoardColumnDef { groups: Record<FlowStatus, BoardCard[]>; count: number }
export interface BoardView { model: BoardModel; columns: BoardColumn[] }

export function boardCards(model: ProjectModel): Map<string, BoardCard> {
  const s = scheduleOf(model);
  const cards = new Map<string, BoardCard>();
  for (const t of model.tasks) {
    const entries = model.raci.filter((e) => e.taskId === t.id);
    cards.set(t.id, {
      task: t,
      critical: s.ok ? Boolean(s.rows[t.id]?.critical) : false,
      totalFloat: s.ok ? (s.rows[t.id]?.totalFloat ?? null) : null,
      accountable: entries.find((e) => e.letters.includes("A"))?.userId,
      responsible: entries.filter((e) => e.letters.includes("R")).map((e) => e.userId),
      risks: model.risks.filter((r) => r.status === "ABERTO" && r.taskIds.includes(t.id)).length,
      unauthorized: Boolean(t.addedAfterBaseline && !t.changeId),
    });
  }
  return cards;
}

export function boardView(model: ProjectModel, boardModel: BoardModel = model.boardModel): BoardView {
  const cards = boardCards(model);
  const empty = (): Record<FlowStatus, BoardCard[]> => ({ A_FAZER: [], EM_ANDAMENTO: [], EM_REVISAO: [], CONCLUIDA: [] });
  const scrumScope = (t: Task) => model.approach === "AGIL" || model.approach === "ITERATIVO" || t.phase === "EXECUCAO";
  const sprint = model.currentSprint ?? 1;
  const columns = boardColumns(boardModel).map((col): BoardColumn => {
    const groups = empty();
    for (const t of model.tasks) {
      const card = cards.get(t.id)!;
      if (boardModel === "SCRUM") {
        if (!scrumScope(t) || !col.statuses!.includes(t.status)) continue;
        if (col.backlog === "PRODUTO" && t.sprint === sprint) continue;
        if (col.backlog === "SPRINT" && t.sprint !== sprint) continue;
      } else if (!col.phases.includes(t.phase)) continue;
      groups[t.status].push(card);
    }
    for (const st of FLOW_STATUSES) groups[st].sort((a, b) => Number(b.critical) - Number(a.critical) || a.task.code.localeCompare(b.task.code));
    return { ...col, groups, count: FLOW_STATUSES.reduce((n, st) => n + groups[st].length, 0) };
  });
  return { model: boardModel, columns };
}

// ---------------------------------------------------------------- EAP e rastreabilidade
export type WbsIssue =
  | { kind: "SOMA_DIFERENTE"; nodeId: string; declared: number; children: number }
  | { kind: "ATIVIDADE_FORA_DO_PACOTE"; taskId: string; nodeId: string }
  | { kind: "ATIVIDADE_SEM_PACOTE"; taskId: string }
  | { kind: "PACOTE_SEM_ATIVIDADE"; nodeId: string }
  | { kind: "PARECE_ATIVIDADE"; nodeId: string };
export interface WbsView { tree: WbsTreeNode | null; nodes: WbsTreeNode[]; rollup: Record<string, number>; issues: WbsIssue[] }

export function wbsView(model: ProjectModel): WbsView {
  const tree = wbsTree(model.wbs);
  const nodes = flattenWbs(tree);
  const leafIds = new Set(nodes.filter((n) => n.leaf && n.depth > 0).map((n) => n.node.id));
  const rollup: Record<string, number> = {};
  const issues: WbsIssue[] = [];
  const taskBudget = (wbsId: string) => model.tasks.filter((t) => t.wbsId === wbsId).reduce((s, t) => s + t.budget, 0);
  const compute = (n: WbsTreeNode): number => {
    const own = n.leaf ? (n.node.budget ?? taskBudget(n.node.id)) : n.children.reduce((s, c) => s + compute(c), 0);
    rollup[n.node.id] = Math.round(own * 100) / 100;
    if (!n.leaf && n.node.budget !== undefined && Math.abs(n.node.budget - own) > 0.005) {
      issues.push({ kind: "SOMA_DIFERENTE", nodeId: n.node.id, declared: n.node.budget, children: Math.round(own * 100) / 100 });
    }
    return own;
  };
  if (tree) compute(tree);
  for (const t of model.tasks) {
    if (t.milestone) continue;
    if (!t.wbsId) issues.push({ kind: "ATIVIDADE_SEM_PACOTE", taskId: t.id });
    else if (!leafIds.has(t.wbsId)) issues.push({ kind: "ATIVIDADE_FORA_DO_PACOTE", taskId: t.id, nodeId: t.wbsId });
  }
  for (const id of leafIds) if (!model.tasks.some((t) => t.wbsId === id)) issues.push({ kind: "PACOTE_SEM_ATIVIDADE", nodeId: id });
  for (const n of nodes) if (n.depth > 0 && looksLikeActivity(n.node.title)) issues.push({ kind: "PARECE_ATIVIDADE", nodeId: n.node.id });
  return { tree, nodes, rollup, issues };
}

export interface TraceRow { requirementId: string; code: string; text: string; origin?: string; deliverables: { id: string; code: string; title: string }[]; test?: string; complete: boolean }
export interface TraceView { rows: TraceRow[]; untraced: string[]; untested: string[]; goldPlating: string[]; coverage: number }

export function traceabilityView(model: ProjectModel): TraceView {
  const nodes = flattenWbs(wbsTree(model.wbs));
  const codeOf = new Map(nodes.map((n) => [n.node.id, n.code]));
  const rows = model.requirements.map((r): TraceRow => {
    const deliverables = r.deliverableIds.map((id) => ({ id, code: codeOf.get(id) ?? "?", title: model.wbs.find((w) => w.id === id)?.title ?? "?" }));
    const origin = r.origin ?? model.stakeholders.find((s) => s.id === r.originStakeholderId)?.name;
    return { requirementId: r.id, code: r.code, text: r.text, origin, deliverables, test: r.test, complete: Boolean(origin && deliverables.length && r.test) };
  });
  const linked = new Set(model.requirements.flatMap((r) => r.deliverableIds));
  // entrega folha sem requisito que a justifique = potencial gold plating (fazer além do pedido)
  const goldPlating = nodes.filter((n) => n.depth > 0 && n.leaf && !linked.has(n.node.id) && !hasLinkedAncestor(n, nodes, linked)).map((n) => n.node.id);
  return {
    rows,
    untraced: model.requirements.filter((r) => !r.deliverableIds.length).map((r) => r.id),
    untested: model.requirements.filter((r) => !r.test).map((r) => r.id),
    goldPlating,
    coverage: rows.length ? Math.round((rows.filter((r) => r.complete).length / rows.length) * 100) : 0,
  };
}

function hasLinkedAncestor(n: WbsTreeNode, nodes: readonly WbsTreeNode[], linked: ReadonlySet<string>): boolean {
  let parentId = n.node.parentId;
  while (parentId) {
    if (linked.has(parentId)) return true;
    parentId = nodes.find((x) => x.node.id === parentId)?.node.parentId;
  }
  return false;
}

// ---------------------------------------------------------------- riscos, partes interessadas, RACI
export interface RiskRow { id: string; title: string; kind: "AMEACA" | "OPORTUNIDADE"; probability: number; impact: number; emv: number; pLevel: number; iLevel: number; score: number; band: RiskBand; response?: string; open: boolean }
export function riskRows(model: ProjectModel): RiskRow[] {
  return model.risks.map((r) => {
    const pLevel = probabilityLevel(r.probability);
    const sev = riskSeverity(pLevel, r.impactLevel);
    return { id: r.id, title: r.title, kind: r.kind, probability: r.probability, impact: r.impact, emv: emv(r.probability, r.impact), pLevel, iLevel: r.impactLevel, score: sev.score, band: sev.band, response: r.response, open: r.status === "ABERTO" };
  }).sort((a, b) => b.score - a.score || b.emv - a.emv);
}

export function stakeholderMap(model: ProjectModel): Record<EngagementStrategy, ProjectModel["stakeholders"]> {
  const out: Record<EngagementStrategy, ProjectModel["stakeholders"]> = { GERENCIAR_DE_PERTO: [], MANTER_SATISFEITO: [], MANTER_INFORMADO: [], MONITORAR: [] };
  for (const s of model.stakeholders) out[mendelow(s.power, s.interest)].push(s);
  return out;
}

export function raciMatrix(model: ProjectModel): { taskId: string; code: string; title: string; cells: Record<string, RaciLetter[]>; problems: RaciProblem[] }[] {
  return model.tasks.filter((t) => !t.milestone).map((t) => {
    const cells: Record<string, RaciLetter[]> = {};
    for (const e of model.raci.filter((x) => x.taskId === t.id)) cells[e.userId] = e.letters;
    return { taskId: t.id, code: t.code, title: t.title, cells, problems: raciProblems(cells) };
  });
}

// ---------------------------------------------------------------- canvas
export type CanvasItemView =
  | { ref: CanvasRef; kind: "TASK"; rect: Rect; task: Task; critical: boolean; title: string; code: string }
  | { ref: CanvasRef; kind: "WBS"; rect: Rect; title: string; code: string }
  | { ref: CanvasRef; kind: "REQ"; rect: Rect; title: string; code: string }
  | { ref: CanvasRef; kind: "RISK"; rect: Rect; title: string; band: RiskBand }
  | { ref: CanvasRef; kind: "STK"; rect: Rect; title: string; strategy: EngagementStrategy }
  | { ref: CanvasRef; kind: "NOTE"; rect: Rect; title: string; color?: string };
export type CanvasEdgeKind = "DEPENDENCIA" | "RASTREABILIDADE" | "EAP" | "RISCO" | "ORIGEM";
export interface CanvasEdge { id: string; kind: CanvasEdgeKind; from: CanvasRef; to: CanvasRef; critical?: boolean; label?: string; depId?: string }
export interface CanvasView {
  width: number;
  height: number;
  zones: Zone[];
  laneHeight: number;
  items: CanvasItemView[];
  edges: CanvasEdge[];
  /** conteúdo dos blocos de lista do Project Model Canvas (TAP, benefícios, marcos, custos, equipe) */
  lists: Partial<Record<PmcBlock, string[]>>;
  lanesTop: number;
}

export function canvasView(model: ProjectModel): CanvasView {
  const { zones, laneHeight } = canvasZones(model);
  const s = scheduleOf(model);
  const pos = model.canvas.positions;
  const zoneRect = (block: PmcBlock) => (zones.find((z) => z.kind === "PMC" && z.block === block)!.rect);
  const laneRect = (phase: ProjectPhase) => (zones.find((z) => z.kind === "PHASE" && z.phase === phase)!.rect);
  const counters = new Map<string, number>();
  const auto = (key: string, rect: Rect, kind: keyof typeof ITEM_SIZE) => {
    const k = counters.get(key) ?? 0;
    counters.set(key, k + 1);
    return gridSlot(rect, k, ITEM_SIZE[kind]);
  };
  const place = (ref: CanvasRef, key: string, rect: Rect, kind: keyof typeof ITEM_SIZE): Rect => {
    const p = pos[ref] ?? auto(key, rect, kind);
    return { x: p.x, y: p.y, ...ITEM_SIZE[kind] };
  };

  const items: CanvasItemView[] = [];
  const wbsNodes = flattenWbs(wbsTree(model.wbs)).filter((n) => n.depth > 0);
  for (const n of wbsNodes) {
    const ref = makeRef("WBS", n.node.id);
    items.push({ ref, kind: "WBS", rect: place(ref, "ENTREGAS", zoneRect("ENTREGAS"), "WBS"), title: n.node.title, code: n.code });
  }
  for (const r of model.requirements) {
    const ref = makeRef("REQ", r.id);
    items.push({ ref, kind: "REQ", rect: place(ref, "REQUISITOS", zoneRect("REQUISITOS"), "REQ"), title: r.text, code: r.code });
  }
  for (const st of model.stakeholders) {
    const ref = makeRef("STK", st.id);
    items.push({ ref, kind: "STK", rect: place(ref, "STAKEHOLDERS", zoneRect("STAKEHOLDERS"), "STK"), title: st.name, strategy: mendelow(st.power, st.interest) });
  }
  for (const r of model.risks) {
    const ref = makeRef("RISK", r.id);
    items.push({ ref, kind: "RISK", rect: place(ref, "RISCOS", zoneRect("RISCOS"), "RISK"), title: r.title, band: riskSeverity(probabilityLevel(r.probability), r.impactLevel).band });
  }
  for (const phase of PROJECT_PHASES) {
    for (const t of model.tasks.filter((x) => x.phase === phase)) {
      const ref = makeRef("TASK", t.id);
      items.push({ ref, kind: "TASK", rect: place(ref, `PHASE:${phase}`, laneRect(phase), "TASK"), task: t, critical: s.ok ? Boolean(s.rows[t.id]?.critical) : false, title: t.title, code: t.code });
    }
  }
  const freeArea: Rect = { x: 0, y: LANES_TOP + LANE_HEADER + laneHeight + 40, w: LANE_W * PROJECT_PHASES.length, h: 200 };
  for (const n of model.canvas.notes) {
    const ref = makeRef("NOTE", n.id);
    items.push({ ref, kind: "NOTE", rect: place(ref, "NOTES", freeArea, "NOTE"), title: n.text, color: n.color });
  }

  const critical = new Set(s.ok ? s.criticalPath : []);
  const edges: CanvasEdge[] = [];
  for (const d of model.dependencies) {
    edges.push({ id: `dep:${d.id}`, depId: d.id, kind: "DEPENDENCIA", from: makeRef("TASK", d.from), to: makeRef("TASK", d.to), critical: critical.has(d.from) && critical.has(d.to), label: d.type === "FS" && d.lagDays === 0 ? undefined : `${d.type}${d.lagDays ? (d.lagDays > 0 ? `+${d.lagDays}` : d.lagDays) : ""}` });
  }
  for (const r of model.requirements) for (const w of r.deliverableIds) edges.push({ id: `tr:${r.id}:${w}`, kind: "RASTREABILIDADE", from: makeRef("REQ", r.id), to: makeRef("WBS", w) });
  for (const t of model.tasks) if (t.wbsId) edges.push({ id: `eap:${t.wbsId}:${t.id}`, kind: "EAP", from: makeRef("WBS", t.wbsId), to: makeRef("TASK", t.id) });
  for (const r of model.risks) for (const tid of r.taskIds) edges.push({ id: `rk:${r.id}:${tid}`, kind: "RISCO", from: makeRef("RISK", r.id), to: makeRef("TASK", tid) });
  for (const r of model.requirements) if (r.originStakeholderId) edges.push({ id: `or:${r.originStakeholderId}:${r.id}`, kind: "ORIGEM", from: makeRef("STK", r.originStakeholderId), to: makeRef("REQ", r.id) });

  const c = model.charter;
  const lists: Partial<Record<PmcBlock, string[]>> = {
    JUSTIFICATIVAS: c.justification,
    OBJETIVO_SMART: c.objectives.map((o) => o.text),
    BENEFICIOS: model.businessCase.benefits,
    PRODUTO: c.product ? [c.product] : [],
    EQUIPE: c.teamRoles,
    PREMISSAS: c.premises,
    RESTRICOES: c.constraints,
    LINHA_DO_TEMPO: c.milestones.map((m) => (m.date ? `${m.title} · ${m.date}` : m.title)),
    CUSTOS: model.budgetLines.map((b) => `${b.title} · ${b.amount}`),
  };
  for (const [block, target] of Object.entries(PMC_TARGET)) if (target !== "LIST") delete lists[block as PmcBlock];

  const maxBottom = Math.max(freeArea.y + freeArea.h, ...items.map((i) => i.rect.y + i.rect.h + 40));
  const maxRight = Math.max(LANE_W * PROJECT_PHASES.length, ...items.map((i) => i.rect.x + i.rect.w + 40));
  return { width: maxRight, height: maxBottom, zones, laneHeight, items, edges, lists, lanesTop: LANES_TOP };
}

/** Metadados acadêmicos da fase (para o cabeçalho das colunas do quadro e da faixa do canvas). */
export const phaseMeta = (phase: ProjectPhase) => PHASE_META[phase];
