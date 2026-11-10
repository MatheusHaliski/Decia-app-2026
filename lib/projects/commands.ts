/**
 * Comandos da Mesa de Trabalho — a ÚNICA forma de mudar o projeto, venha a edição do quadro, da linha do tempo, das abas ou do
 * canvas. Por isso o canvas é conectado: soltar um cartão numa faixa de fase muda a fase (quadro); ligar dois cartões cria a
 * dependência (linha do tempo/CPM); soltar um post-it num bloco do Project Model Canvas cria o requisito, a parte interessada,
 * a entrega da EAP, o risco ou o item do TAP correspondente.
 *
 * Alteração ESTRUTURAL gera `ProjectVersion` (RF22.CA02) com resumo legível traduzível; mover/redimensionar no canvas não gera
 * (RF22.CA03). Projeto arquivado recusa alteração estrutural (`PROJETO_BLOQUEADO`, RF22.CA06). Funções puras: devolvem um
 * modelo novo e nunca mutam o anterior.
 */
import { ITEM_SIZE, makeRef, refId, refKind, zoneAt } from "./canvas";
import { canvasZones, effectiveDuration, scheduleOf, wbsRoot } from "./derive";
import { wouldCreateCycle } from "./engine/schedule";
import { PMC_TARGET, type PmcBlock } from "./lifecycle";
import { PROJECT_AREAS, PROJECT_PHASES } from "./types";
import type {
  Approach, BoardModel, BudgetLine, BusinessCase, CanvasNote, CanvasRef, ChangeImpact, ChangeRequest, ChangeStatus, ChangeType,
  Charter, Closure, CommItem, Dependency, ProjectArea, DependencyType, FlowStatus, GateOutcome, Governance, Lesson, ProjectModel, ProjectPhase, RaciLetter,
  Requirement, Risk, RiskKind, SevenRs, Stakeholder, Task, WbsNode,
} from "./types";

type TaskPatch = Partial<Pick<Task,
  "title" | "status" | "durationDays" | "pert" | "percentComplete" | "budget" | "actualCost" | "responsibleId" | "reviewerId" | "moscow"
  | "sprint" | "wbsId" | "milestone" | "changeId">>;
type CharterList = "justification" | "highLevelRequirements" | "premises" | "constraints" | "highLevelRisks" | "teamRoles" | "objectives" | "milestones";

export type ProjectCommand =
  | { type: "TASK_CREATE"; title: string; phase: ProjectPhase; status?: FlowStatus; durationDays?: number; changeId?: string; at?: { x: number; y: number }; sprint?: number }
  | { type: "TASK_UPDATE"; id: string; patch: TaskPatch }
  | { type: "TASK_MOVE_PHASE"; id: string; phase: ProjectPhase }
  | { type: "TASK_DELETE"; id: string }
  | { type: "DEP_ADD"; from: string; to: string; depType?: DependencyType; lagDays?: number }
  | { type: "DEP_UPDATE"; id: string; depType: DependencyType; lagDays: number }
  | { type: "DEP_REMOVE"; id: string }
  | { type: "CANVAS_MOVE"; ref: CanvasRef; x: number; y: number }
  | { type: "CANVAS_CONNECT"; from: CanvasRef; to: CanvasRef }
  | { type: "CANVAS_DISCONNECT"; from: CanvasRef; to: CanvasRef }
  | { type: "CANVAS_CREATE"; x: number; y: number; text: string }
  | { type: "NOTE_UPDATE"; id: string; text: string; color?: CanvasNote["color"] }
  | { type: "NOTE_DELETE"; id: string }
  | { type: "WBS_ADD"; parentId?: string; title: string }
  | { type: "WBS_UPDATE"; id: string; patch: Partial<Pick<WbsNode, "title" | "budget" | "acceptance" | "ownerId">> }
  | { type: "WBS_REMOVE"; id: string }
  | { type: "REQ_ADD"; text: string; origin?: string }
  | { type: "REQ_UPDATE"; id: string; patch: Partial<Pick<Requirement, "text" | "origin" | "test" | "originStakeholderId">> }
  | { type: "REQ_REMOVE"; id: string }
  | { type: "REQ_LINK"; id: string; wbsId: string; on: boolean }
  | { type: "STK_ADD"; name: string; power?: number; interest?: number; role?: string }
  | { type: "STK_UPDATE"; id: string; patch: Partial<Pick<Stakeholder, "name" | "role" | "power" | "interest">> }
  | { type: "STK_REMOVE"; id: string }
  | { type: "COMM_ADD"; info: string; audienceIds: string[]; channel: CommItem["channel"]; frequency: CommItem["frequency"]; ownerId?: string }
  | { type: "COMM_UPDATE"; id: string; patch: Partial<Omit<CommItem, "id">> }
  | { type: "COMM_REMOVE"; id: string }
  | { type: "RISK_ADD"; title: string; kind?: RiskKind; probability?: number; impact?: number; impactLevel?: number }
  | { type: "RISK_UPDATE"; id: string; patch: Partial<Pick<Risk, "title" | "kind" | "probability" | "impact" | "impactLevel" | "response" | "ownerId" | "status" | "taskIds">> }
  | { type: "RISK_REMOVE"; id: string }
  | { type: "RACI_SET"; taskId: string; userId: string; letters: RaciLetter[] }
  | { type: "CHANGE_REQUEST"; title: string; changeType: ChangeType; impact?: Partial<ChangeImpact>; sevenRs?: SevenRs }
  | { type: "CHANGE_UPDATE"; id: string; impact?: Partial<ChangeImpact>; sevenRs?: SevenRs; changeType?: ChangeType }
  | { type: "CHANGE_SET_STATUS"; id: string; status: ChangeStatus; decisionId?: string }
  | { type: "LESSON_ADD"; text: string; kind: Lesson["kind"]; phase?: ProjectPhase }
  | { type: "GATE_SET"; phase: ProjectPhase; outcome: GateOutcome; decisionId?: string; notes?: string }
  | { type: "CHARTER_UPDATE"; patch: Partial<Pick<Charter, "product" | "summaryBudget" | "managerId" | "sponsorId" | "approvedBySponsorAt">> }
  | { type: "CHARTER_LIST_ADD"; list: CharterList; text: string }
  | { type: "CHARTER_LIST_REMOVE"; list: CharterList; index: number }
  | { type: "OBJECTIVE_UPDATE"; id: string; smart?: boolean; goalId?: string | null }
  | { type: "BUSINESS_CASE_UPDATE"; patch: Partial<BusinessCase> }
  | { type: "BUDGET_LINE_ADD"; title: string; amount: number; spend: BudgetLine["spend"] }
  | { type: "BUDGET_LINE_UPDATE"; id: string; patch: Partial<Omit<BudgetLine, "id">> }
  | { type: "BUDGET_LINE_REMOVE"; id: string }
  | { type: "RESERVES_SET"; contingency: number; management: number }
  | { type: "GOVERNANCE_UPDATE"; patch: Partial<Governance> }
  | { type: "CLOSURE_UPDATE"; patch: Partial<Closure> }
  | { type: "BASELINE_SET" }
  | { type: "SET_APPROACH"; approach: Approach }
  | { type: "SET_PROJECT_AREA"; area: ProjectArea }
  | { type: "SET_BOARD_MODEL"; model: BoardModel }
  | { type: "SET_CURRENT_SPRINT"; sprint: number }
  | { type: "SPRINT_SET"; number: number; start: string; end: string; goal?: string }
  | { type: "SET_STATUS_DATE"; date: string }
  | { type: "LINK_DECISION"; decisionId: string };

export type CommandError =
  | "NAO_ENCONTRADO" | "TEXTO_VAZIO" | "CICLO" | "LIGACAO_INVALIDA" | "JA_EXISTE" | "PROJETO_BLOQUEADO" | "TRANSICAO_INVALIDA"
  | "VALOR_INVALIDO" | "MUDANCA_NAO_APROVADA";

export type CommandResult =
  | { ok: true; model: ProjectModel; structural: boolean; versionKey?: string; vars?: Record<string, string | number>; createdRef?: CanvasRef }
  | { ok: false; error: CommandError; detail?: string };

export interface CommandContext { actorId: string; now: Date }

let seq = 0;
/** Identificador local (DEMO): prefixo + tempo + sequência; a API real devolverá UUIDs. */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const fail = (error: CommandError, detail?: string): CommandResult => ({ ok: false, error, detail });
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function nextCode(prefix: string, codes: readonly string[], pad = 2, sep = ""): string {
  const nums = codes.map((c) => Number(c.replace(/^\D+/, ""))).filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${sep}${String(n).padStart(pad, "0")}`;
}

const STRUCTURAL_FREE: ReadonlySet<ProjectCommand["type"]> = new Set([
  "CANVAS_MOVE", "NOTE_UPDATE", "NOTE_DELETE", "SET_BOARD_MODEL", "SET_CURRENT_SPRINT", "SET_STATUS_DATE",
]);

const CHANGE_FLOW: Record<ChangeStatus, readonly ChangeStatus[]> = {
  SOLICITADA: ["EM_ANALISE", "REJEITADA"],
  EM_ANALISE: ["APROVADA", "REJEITADA"],
  APROVADA: ["IMPLEMENTADA"],
  REJEITADA: [],
  IMPLEMENTADA: [],
};

/** Aplica o comando; alteração estrutural incrementa a versão e registra `ProjectVersion`. */
export function applyCommand(model: ProjectModel, cmd: ProjectCommand, ctx: CommandContext): CommandResult {
  const structural = !STRUCTURAL_FREE.has(cmd.type);
  if (structural && model.closure.archived && cmd.type !== "CLOSURE_UPDATE") return fail("PROJETO_BLOQUEADO");
  const r = reduce(model, cmd, ctx);
  if (!r.ok) return r;
  if (!r.structural) return r;
  const number = model.version + 1;
  return {
    ...r,
    model: {
      ...r.model,
      version: number,
      versions: [...r.model.versions, { number, at: ctx.now.toISOString(), actorId: ctx.actorId, key: r.versionKey ?? cmd.type, vars: r.vars }],
    },
  };
}

function ok(model: ProjectModel, structural: boolean, versionKey?: string, vars?: Record<string, string | number>, createdRef?: CanvasRef): CommandResult {
  return { ok: true, model, structural, versionKey, vars, createdRef };
}

function taskById(model: ProjectModel, id: string) {
  return model.tasks.find((t) => t.id === id);
}

function setPosition(model: ProjectModel, ref: CanvasRef, center: { x: number; y: number } | undefined): ProjectModel {
  if (!center) return model;
  const size = ITEM_SIZE[refKind(ref)];
  return { ...model, canvas: { ...model.canvas, positions: { ...model.canvas.positions, [ref]: { x: Math.round(center.x - size.w / 2), y: Math.round(center.y - size.h / 2) } } } };
}

function removePosition(model: ProjectModel, ref: CanvasRef): ProjectModel {
  const positions = { ...model.canvas.positions };
  delete positions[ref];
  return { ...model, canvas: { ...model.canvas, positions } };
}

function reduce(model: ProjectModel, cmd: ProjectCommand, ctx: CommandContext): CommandResult {
  const nowIso = ctx.now.toISOString();
  switch (cmd.type) {
    // ---------------- atividades ----------------
    case "TASK_CREATE": {
      const title = clean(cmd.title);
      if (!title) return fail("TEXTO_VAZIO");
      if (cmd.changeId) {
        const ch = model.changes.find((c) => c.id === cmd.changeId);
        if (!ch) return fail("NAO_ENCONTRADO", cmd.changeId);
        if (ch.status !== "APROVADA" && ch.status !== "IMPLEMENTADA") return fail("MUDANCA_NAO_APROVADA", ch.code);
      }
      const task: Task = {
        id: newId("t"), code: nextCode("T", model.tasks.map((t) => t.code)), title, phase: cmd.phase, status: cmd.status ?? "A_FAZER",
        durationDays: Math.max(0, cmd.durationDays ?? 1), percentComplete: 0, budget: 0, actualCost: 0, createdBy: ctx.actorId,
        sprint: cmd.sprint, changeId: cmd.changeId, addedAfterBaseline: model.baseline ? true : undefined, createdAt: nowIso,
        startedAt: cmd.status && cmd.status !== "A_FAZER" ? nowIso : undefined,
      };
      const ref = makeRef("TASK", task.id);
      const next = setPosition({ ...model, tasks: [...model.tasks, task] }, ref, cmd.at);
      return ok(next, true, "taskCreated", { code: task.code, title }, ref);
    }
    case "TASK_UPDATE": {
      const t = taskById(model, cmd.id);
      if (!t) return fail("NAO_ENCONTRADO", cmd.id);
      const patch: TaskPatch = { ...cmd.patch };
      if (patch.title !== undefined) {
        patch.title = clean(patch.title);
        if (!patch.title) return fail("TEXTO_VAZIO");
      }
      if (patch.percentComplete !== undefined) patch.percentComplete = clamp(Math.round(patch.percentComplete), 0, 100);
      if (patch.durationDays !== undefined && !(patch.durationDays >= 0)) return fail("VALOR_INVALIDO", "durationDays");
      if (patch.budget !== undefined && !(patch.budget >= 0)) return fail("VALOR_INVALIDO", "budget");
      if (patch.actualCost !== undefined && !(patch.actualCost >= 0)) return fail("VALOR_INVALIDO", "actualCost");
      if (patch.wbsId && !model.wbs.some((n) => n.id === patch.wbsId)) return fail("NAO_ENCONTRADO", patch.wbsId);
      if (patch.changeId) {
        // ligar a atividade a uma mudança só vale com a mudança aprovada pelo comitê (regulariza o scope creep)
        const ch = model.changes.find((c) => c.id === patch.changeId);
        if (!ch) return fail("NAO_ENCONTRADO", patch.changeId);
        if (ch.status !== "APROVADA" && ch.status !== "IMPLEMENTADA") return fail("MUDANCA_NAO_APROVADA", ch.code);
      }
      const done = patch.status === "CONCLUIDA" && t.status !== "CONCLUIDA";
      const started = patch.status && patch.status !== "A_FAZER" && !t.startedAt;
      const next: Task = {
        ...t, ...patch,
        ...(started ? { startedAt: nowIso } : {}),
        ...(done ? { doneAt: nowIso, percentComplete: 100 } : {}),
        ...(patch.status && patch.status !== "CONCLUIDA" && t.status === "CONCLUIDA" ? { doneAt: undefined } : {}),
      };
      return ok({ ...model, tasks: model.tasks.map((x) => (x.id === t.id ? next : x)) }, true, done ? "taskDone" : "taskUpdated", { code: t.code });
    }
    case "TASK_MOVE_PHASE": {
      const t = taskById(model, cmd.id);
      if (!t) return fail("NAO_ENCONTRADO", cmd.id);
      if (t.phase === cmd.phase) return ok(model, false);
      return ok({ ...model, tasks: model.tasks.map((x) => (x.id === t.id ? { ...x, phase: cmd.phase } : x)) }, true, "taskPhase", { code: t.code, phase: cmd.phase });
    }
    case "TASK_DELETE": {
      const t = taskById(model, cmd.id);
      if (!t) return fail("NAO_ENCONTRADO", cmd.id);
      const next = removePosition({
        ...model,
        tasks: model.tasks.filter((x) => x.id !== t.id),
        dependencies: model.dependencies.filter((d) => d.from !== t.id && d.to !== t.id),
        raci: model.raci.filter((r) => r.taskId !== t.id),
        risks: model.risks.map((r) => (r.taskIds.includes(t.id) ? { ...r, taskIds: r.taskIds.filter((x) => x !== t.id) } : r)),
      }, makeRef("TASK", t.id));
      return ok(next, true, "taskDeleted", { code: t.code });
    }
    case "DEP_ADD": {
      const a = taskById(model, cmd.from);
      const b = taskById(model, cmd.to);
      if (!a || !b) return fail("NAO_ENCONTRADO");
      if (model.dependencies.some((d) => d.from === a.id && d.to === b.id)) return fail("JA_EXISTE");
      if (wouldCreateCycle(model.dependencies.map((d) => ({ from: d.from, to: d.to, type: d.type, lag: d.lagDays })), a.id, b.id)) return fail("CICLO", `${a.code}→${b.code}`);
      const dep: Dependency = { id: newId("d"), from: a.id, to: b.id, type: cmd.depType ?? "FS", lagDays: cmd.lagDays ?? 0 };
      return ok({ ...model, dependencies: [...model.dependencies, dep] }, true, "depAdded", { from: a.code, to: b.code, type: dep.type });
    }
    case "DEP_UPDATE": {
      const d = model.dependencies.find((x) => x.id === cmd.id);
      if (!d) return fail("NAO_ENCONTRADO", cmd.id);
      if (!Number.isFinite(cmd.lagDays)) return fail("VALOR_INVALIDO", "lagDays");
      const a = taskById(model, d.from);
      const b = taskById(model, d.to);
      return ok({ ...model, dependencies: model.dependencies.map((x) => (x.id === d.id ? { ...x, type: cmd.depType, lagDays: Math.round(cmd.lagDays) } : x)) }, true, "depUpdated",
        { from: a?.code ?? "?", to: b?.code ?? "?", type: cmd.depType });
    }
    case "DEP_REMOVE": {
      const d = model.dependencies.find((x) => x.id === cmd.id);
      if (!d) return fail("NAO_ENCONTRADO", cmd.id);
      return ok({ ...model, dependencies: model.dependencies.filter((x) => x.id !== d.id) }, true, "depRemoved",
        { from: taskById(model, d.from)?.code ?? "?", to: taskById(model, d.to)?.code ?? "?" });
    }

    // ---------------- canvas ----------------
    case "CANVAS_MOVE": {
      const kind = refKind(cmd.ref);
      const id = refId(cmd.ref);
      const size = ITEM_SIZE[kind];
      const moved: ProjectModel = { ...model, canvas: { ...model.canvas, positions: { ...model.canvas.positions, [cmd.ref]: { x: Math.round(cmd.x), y: Math.round(cmd.y) } } } };
      const { zones } = canvasZones(model);
      const zone = zoneAt(zones, cmd.x + size.w / 2, cmd.y + size.h / 2);
      if (kind === "TASK" && zone?.kind === "PHASE") {
        const t = taskById(model, id);
        if (t && t.phase !== zone.phase) {
          return ok({ ...moved, tasks: moved.tasks.map((x) => (x.id === id ? { ...x, phase: zone.phase } : x)) }, true, "taskPhase", { code: t.code, phase: zone.phase });
        }
      }
      if (kind === "NOTE" && zone) {
        const note = model.canvas.notes.find((n) => n.id === id);
        if (!note) return fail("NAO_ENCONTRADO", id);
        const withoutNote = removePosition({ ...moved, canvas: { ...moved.canvas, notes: moved.canvas.notes.filter((n) => n.id !== id) } }, cmd.ref);
        const center = { x: cmd.x + size.w / 2, y: cmd.y + size.h / 2 };
        const created = zone.kind === "PHASE"
          ? reduce(withoutNote, { type: "TASK_CREATE", title: note.text, phase: zone.phase, at: center }, ctx)
          : createInBlock(withoutNote, zone.block, note.text, center, ctx);
        if (!created.ok) return created;
        return ok(created.model, true, "noteConverted", { target: zone.kind === "PHASE" ? zone.phase : zone.block, text: clean(note.text).slice(0, 60) }, created.createdRef);
      }
      return ok(moved, false);
    }
    case "CANVAS_CREATE": {
      const text = clean(cmd.text);
      if (!text) return fail("TEXTO_VAZIO");
      const { zones } = canvasZones(model);
      const zone = zoneAt(zones, cmd.x, cmd.y);
      if (zone?.kind === "PHASE") return reduce(model, { type: "TASK_CREATE", title: text, phase: zone.phase, at: { x: cmd.x, y: cmd.y } }, ctx);
      if (zone?.kind === "PMC") return createInBlock(model, zone.block, text, { x: cmd.x, y: cmd.y }, ctx);
      const note: CanvasNote = { id: newId("n"), text, color: "AMARELO" };
      const ref = makeRef("NOTE", note.id);
      return ok(setPosition({ ...model, canvas: { ...model.canvas, notes: [...model.canvas.notes, note] } }, ref, { x: cmd.x, y: cmd.y }), false, undefined, undefined, ref);
    }
    case "CANVAS_CONNECT":
    case "CANVAS_DISCONNECT": {
      const on = cmd.type === "CANVAS_CONNECT";
      const [ka, kb] = [refKind(cmd.from), refKind(cmd.to)];
      const [ia, ib] = [refId(cmd.from), refId(cmd.to)];
      const pair = (x: string, y: string) => (ka === x && kb === y) || (ka === y && kb === x);
      const idOf = (k: string) => (ka === k ? ia : ib);
      if (ka === "TASK" && kb === "TASK") {
        if (on) return reduce(model, { type: "DEP_ADD", from: ia, to: ib }, ctx);
        const d = model.dependencies.find((x) => (x.from === ia && x.to === ib) || (x.from === ib && x.to === ia));
        return d ? reduce(model, { type: "DEP_REMOVE", id: d.id }, ctx) : fail("NAO_ENCONTRADO");
      }
      if (pair("REQ", "WBS")) return reduce(model, { type: "REQ_LINK", id: idOf("REQ"), wbsId: idOf("WBS"), on }, ctx);
      if (pair("WBS", "TASK")) {
        const t = taskById(model, idOf("TASK"));
        if (!t) return fail("NAO_ENCONTRADO");
        if (!on && t.wbsId !== idOf("WBS")) return fail("NAO_ENCONTRADO");
        if (on && t.wbsId === idOf("WBS")) return fail("JA_EXISTE");
        const wbsId = on ? idOf("WBS") : undefined;
        if (on && !model.wbs.some((n) => n.id === wbsId)) return fail("NAO_ENCONTRADO");
        return ok({ ...model, tasks: model.tasks.map((x) => (x.id === t.id ? { ...x, wbsId } : x)) }, true, on ? "wbsLinked" : "wbsUnlinked", { code: t.code });
      }
      if (pair("RISK", "TASK")) {
        const risk = model.risks.find((r) => r.id === idOf("RISK"));
        const t = taskById(model, idOf("TASK"));
        if (!risk || !t) return fail("NAO_ENCONTRADO");
        const has = risk.taskIds.includes(t.id);
        if (on === has) return fail(on ? "JA_EXISTE" : "NAO_ENCONTRADO");
        const taskIds = on ? [...risk.taskIds, t.id] : risk.taskIds.filter((x) => x !== t.id);
        return ok({ ...model, risks: model.risks.map((r) => (r.id === risk.id ? { ...r, taskIds } : r)) }, true, on ? "riskLinked" : "riskUnlinked", { risk: risk.title, code: t.code });
      }
      if (pair("STK", "REQ")) {
        const req = model.requirements.find((r) => r.id === idOf("REQ"));
        if (!req) return fail("NAO_ENCONTRADO");
        if (!on && req.originStakeholderId !== idOf("STK")) return fail("NAO_ENCONTRADO");
        return reduce(model, { type: "REQ_UPDATE", id: req.id, patch: { originStakeholderId: on ? idOf("STK") : undefined } }, ctx);
      }
      return fail("LIGACAO_INVALIDA", `${ka}→${kb}`);
    }
    case "NOTE_UPDATE": {
      const n = model.canvas.notes.find((x) => x.id === cmd.id);
      if (!n) return fail("NAO_ENCONTRADO", cmd.id);
      const text = clean(cmd.text);
      if (!text) return fail("TEXTO_VAZIO");
      return ok({ ...model, canvas: { ...model.canvas, notes: model.canvas.notes.map((x) => (x.id === n.id ? { ...x, text, color: cmd.color ?? x.color } : x)) } }, false);
    }
    case "NOTE_DELETE": {
      if (!model.canvas.notes.some((x) => x.id === cmd.id)) return fail("NAO_ENCONTRADO", cmd.id);
      return ok(removePosition({ ...model, canvas: { ...model.canvas, notes: model.canvas.notes.filter((x) => x.id !== cmd.id) } }, makeRef("NOTE", cmd.id)), false);
    }

    // ---------------- EAP ----------------
    case "WBS_ADD": {
      const title = clean(cmd.title);
      if (!title) return fail("TEXTO_VAZIO");
      const parentId = cmd.parentId ?? wbsRoot(model.wbs)?.id;
      if (parentId && !model.wbs.some((n) => n.id === parentId)) return fail("NAO_ENCONTRADO", parentId);
      const node: WbsNode = { id: newId("w"), parentId, title };
      return ok({ ...model, wbs: [...model.wbs, node] }, true, "wbsAdded", { title }, makeRef("WBS", node.id));
    }
    case "WBS_UPDATE": {
      const n = model.wbs.find((x) => x.id === cmd.id);
      if (!n) return fail("NAO_ENCONTRADO", cmd.id);
      const patch = { ...cmd.patch };
      if (patch.title !== undefined) {
        patch.title = clean(patch.title);
        if (!patch.title) return fail("TEXTO_VAZIO");
      }
      if (patch.budget !== undefined && !(patch.budget >= 0)) return fail("VALOR_INVALIDO", "budget");
      return ok({ ...model, wbs: model.wbs.map((x) => (x.id === n.id ? { ...x, ...patch } : x)) }, true, "wbsUpdated", { title: patch.title ?? n.title });
    }
    case "WBS_REMOVE": {
      const n = model.wbs.find((x) => x.id === cmd.id);
      if (!n) return fail("NAO_ENCONTRADO", cmd.id);
      if (!n.parentId) return fail("VALOR_INVALIDO", "raiz");
      const gone = new Set<string>([n.id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const x of model.wbs) if (x.parentId && gone.has(x.parentId) && !gone.has(x.id)) {
          gone.add(x.id);
          grew = true;
        }
      }
      let next: ProjectModel = {
        ...model,
        wbs: model.wbs.filter((x) => !gone.has(x.id)),
        tasks: model.tasks.map((t) => (t.wbsId && gone.has(t.wbsId) ? { ...t, wbsId: undefined } : t)),
        requirements: model.requirements.map((r) => ({ ...r, deliverableIds: r.deliverableIds.filter((d) => !gone.has(d)) })),
      };
      for (const id of gone) next = removePosition(next, makeRef("WBS", id));
      return ok(next, true, "wbsRemoved", { title: n.title });
    }

    // ---------------- requisitos e partes interessadas ----------------
    case "REQ_ADD": {
      const text = clean(cmd.text);
      if (!text) return fail("TEXTO_VAZIO");
      const req: Requirement = { id: newId("r"), code: nextCode("RF-", model.requirements.map((r) => r.code)), text, origin: cmd.origin, deliverableIds: [] };
      return ok({ ...model, requirements: [...model.requirements, req] }, true, "reqAdded", { code: req.code }, makeRef("REQ", req.id));
    }
    case "REQ_UPDATE": {
      const r = model.requirements.find((x) => x.id === cmd.id);
      if (!r) return fail("NAO_ENCONTRADO", cmd.id);
      const patch = { ...cmd.patch };
      if (patch.text !== undefined) {
        patch.text = clean(patch.text);
        if (!patch.text) return fail("TEXTO_VAZIO");
      }
      if (patch.originStakeholderId && !model.stakeholders.some((s) => s.id === patch.originStakeholderId)) return fail("NAO_ENCONTRADO");
      return ok({ ...model, requirements: model.requirements.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }, true, "reqUpdated", { code: r.code });
    }
    case "REQ_REMOVE": {
      const r = model.requirements.find((x) => x.id === cmd.id);
      if (!r) return fail("NAO_ENCONTRADO", cmd.id);
      return ok(removePosition({ ...model, requirements: model.requirements.filter((x) => x.id !== r.id) }, makeRef("REQ", r.id)), true, "reqRemoved", { code: r.code });
    }
    case "REQ_LINK": {
      const r = model.requirements.find((x) => x.id === cmd.id);
      if (!r || !model.wbs.some((n) => n.id === cmd.wbsId)) return fail("NAO_ENCONTRADO");
      const has = r.deliverableIds.includes(cmd.wbsId);
      if (cmd.on === has) return fail(cmd.on ? "JA_EXISTE" : "NAO_ENCONTRADO");
      const deliverableIds = cmd.on ? [...r.deliverableIds, cmd.wbsId] : r.deliverableIds.filter((d) => d !== cmd.wbsId);
      return ok({ ...model, requirements: model.requirements.map((x) => (x.id === r.id ? { ...x, deliverableIds } : x)) }, true, cmd.on ? "reqLinked" : "reqUnlinked", { code: r.code });
    }
    case "STK_ADD": {
      const name = clean(cmd.name);
      if (!name) return fail("TEXTO_VAZIO");
      const s: Stakeholder = { id: newId("s"), name, role: cmd.role, power: clamp(cmd.power ?? 3, 1, 5), interest: clamp(cmd.interest ?? 3, 1, 5) };
      return ok({ ...model, stakeholders: [...model.stakeholders, s] }, true, "stkAdded", { name }, makeRef("STK", s.id));
    }
    case "STK_UPDATE": {
      const s = model.stakeholders.find((x) => x.id === cmd.id);
      if (!s) return fail("NAO_ENCONTRADO", cmd.id);
      const patch = { ...cmd.patch };
      if (patch.name !== undefined) {
        patch.name = clean(patch.name);
        if (!patch.name) return fail("TEXTO_VAZIO");
      }
      if (patch.power !== undefined) patch.power = clamp(Math.round(patch.power), 1, 5);
      if (patch.interest !== undefined) patch.interest = clamp(Math.round(patch.interest), 1, 5);
      return ok({ ...model, stakeholders: model.stakeholders.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) }, true, "stkUpdated", { name: patch.name ?? s.name });
    }
    case "STK_REMOVE": {
      const s = model.stakeholders.find((x) => x.id === cmd.id);
      if (!s) return fail("NAO_ENCONTRADO", cmd.id);
      return ok(removePosition({
        ...model,
        stakeholders: model.stakeholders.filter((x) => x.id !== s.id),
        requirements: model.requirements.map((r) => (r.originStakeholderId === s.id ? { ...r, originStakeholderId: undefined } : r)),
        communications: (model.communications ?? []).map((c) => ({ ...c, audienceIds: c.audienceIds.filter((id) => id !== s.id) })).filter((c) => c.audienceIds.length),
      }, makeRef("STK", s.id)), true, "stkRemoved", { name: s.name });
    }

    // ---------------- plano de comunicação ----------------
    case "COMM_ADD": {
      const info = clean(cmd.info);
      if (!info) return fail("TEXTO_VAZIO");
      const audienceIds = [...new Set(cmd.audienceIds)].filter((id) => model.stakeholders.some((s) => s.id === id));
      if (!audienceIds.length) return fail("VALOR_INVALIDO", "audience");
      const item: CommItem = { id: newId("cm"), info, audienceIds, channel: cmd.channel, frequency: cmd.frequency, ownerId: cmd.ownerId };
      return ok({ ...model, communications: [...(model.communications ?? []), item] }, true, "commAdded", { info: info.slice(0, 60) });
    }
    case "COMM_UPDATE": {
      const c = (model.communications ?? []).find((x) => x.id === cmd.id);
      if (!c) return fail("NAO_ENCONTRADO", cmd.id);
      const patch = { ...cmd.patch };
      if (patch.info !== undefined) {
        patch.info = clean(patch.info);
        if (!patch.info) return fail("TEXTO_VAZIO");
      }
      if (patch.audienceIds) {
        patch.audienceIds = [...new Set(patch.audienceIds)].filter((id) => model.stakeholders.some((s) => s.id === id));
        if (!patch.audienceIds.length) return fail("VALOR_INVALIDO", "audience");
      }
      return ok({ ...model, communications: (model.communications ?? []).map((x) => (x.id === c.id ? { ...x, ...patch } : x)) }, true, "commUpdated", { info: (patch.info ?? c.info).slice(0, 60) });
    }
    case "COMM_REMOVE": {
      const c = (model.communications ?? []).find((x) => x.id === cmd.id);
      if (!c) return fail("NAO_ENCONTRADO", cmd.id);
      return ok({ ...model, communications: (model.communications ?? []).filter((x) => x.id !== c.id) }, true, "commRemoved", { info: c.info.slice(0, 60) });
    }

    // ---------------- riscos e RACI ----------------
    case "RISK_ADD": {
      const title = clean(cmd.title);
      if (!title) return fail("TEXTO_VAZIO");
      const risk: Risk = {
        id: newId("k"), title, kind: cmd.kind ?? "AMEACA", probability: clamp(cmd.probability ?? 0.3, 0, 1), impact: Math.max(0, cmd.impact ?? 0),
        impactLevel: clamp(cmd.impactLevel ?? 3, 1, 5), taskIds: [], status: "ABERTO",
      };
      return ok({ ...model, risks: [...model.risks, risk] }, true, "riskAdded", { title }, makeRef("RISK", risk.id));
    }
    case "RISK_UPDATE": {
      const r = model.risks.find((x) => x.id === cmd.id);
      if (!r) return fail("NAO_ENCONTRADO", cmd.id);
      const patch = { ...cmd.patch };
      if (patch.title !== undefined) {
        patch.title = clean(patch.title);
        if (!patch.title) return fail("TEXTO_VAZIO");
      }
      if (patch.probability !== undefined) patch.probability = clamp(patch.probability, 0, 1);
      if (patch.impact !== undefined) patch.impact = Math.max(0, patch.impact);
      if (patch.impactLevel !== undefined) patch.impactLevel = clamp(Math.round(patch.impactLevel), 1, 5);
      return ok({ ...model, risks: model.risks.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }, true, "riskUpdated", { title: patch.title ?? r.title });
    }
    case "RISK_REMOVE": {
      const r = model.risks.find((x) => x.id === cmd.id);
      if (!r) return fail("NAO_ENCONTRADO", cmd.id);
      return ok(removePosition({ ...model, risks: model.risks.filter((x) => x.id !== r.id) }, makeRef("RISK", r.id)), true, "riskRemoved", { title: r.title });
    }
    case "RACI_SET": {
      const t = taskById(model, cmd.taskId);
      if (!t) return fail("NAO_ENCONTRADO", cmd.taskId);
      const order: RaciLetter[] = ["R", "A", "C", "I"];
      const letters = order.filter((l) => cmd.letters.includes(l));
      const rest = model.raci.filter((e) => !(e.taskId === t.id && e.userId === cmd.userId));
      const raci = letters.length ? [...rest, { taskId: t.id, userId: cmd.userId, letters }] : rest;
      return ok({ ...model, raci }, true, "raciSet", { code: t.code, letters: letters.join("") || "—" });
    }

    // ---------------- controle integrado de mudanças ----------------
    case "CHANGE_REQUEST": {
      const title = clean(cmd.title);
      if (!title) return fail("TEXTO_VAZIO");
      const ch: ChangeRequest = {
        id: newId("c"), code: nextCode("MUD-", model.changes.map((c) => c.code)), title, requesterId: ctx.actorId, type: cmd.changeType,
        status: "SOLICITADA", impact: { scope: 0, scheduleDays: 0, cost: 0, quality: 0, resources: 0, risk: 0, ...cmd.impact }, sevenRs: { ...cmd.sevenRs }, createdAt: nowIso,
      };
      return ok({ ...model, changes: [...model.changes, ch] }, true, "changeRequested", { code: ch.code });
    }
    case "CHANGE_UPDATE": {
      const c = model.changes.find((x) => x.id === cmd.id);
      if (!c) return fail("NAO_ENCONTRADO", cmd.id);
      if (c.status !== "SOLICITADA" && c.status !== "EM_ANALISE") return fail("TRANSICAO_INVALIDA", c.status);
      const next: ChangeRequest = { ...c, type: cmd.changeType ?? c.type, impact: { ...c.impact, ...cmd.impact }, sevenRs: { ...c.sevenRs, ...cmd.sevenRs } };
      return ok({ ...model, changes: model.changes.map((x) => (x.id === c.id ? next : x)) }, true, "changeUpdated", { code: c.code });
    }
    case "CHANGE_SET_STATUS": {
      const c = model.changes.find((x) => x.id === cmd.id);
      if (!c) return fail("NAO_ENCONTRADO", cmd.id);
      // padrão = pré-aprovada; emergencial = ECAB: podem ir direto de SOLICITADA a APROVADA (ITIL)
      const fast = (c.type === "PADRAO" || c.type === "EMERGENCIAL") && c.status === "SOLICITADA" && cmd.status === "APROVADA";
      if (!fast && !CHANGE_FLOW[c.status].includes(cmd.status)) return fail("TRANSICAO_INVALIDA", `${c.status}→${cmd.status}`);
      const decided = cmd.status === "APROVADA" || cmd.status === "REJEITADA";
      let next: ProjectModel = {
        ...model,
        changes: model.changes.map((x) => (x.id === c.id ? { ...x, status: cmd.status, decisionId: cmd.decisionId ?? x.decisionId, decidedAt: decided ? nowIso : x.decidedAt } : x)),
      };
      // mudança implementada atualiza a linha de base (solicitar → analisar → aprovar/rejeitar → ATUALIZAR A LINHA DE BASE)
      if (cmd.status === "IMPLEMENTADA" && next.baseline) {
        const rebased = baselineFrom(next, nowIso);
        if (rebased) next = { ...next, baseline: rebased };
      }
      return ok(next, true, "changeStatus", { code: c.code, status: cmd.status });
    }

    // ---------------- lições, portões ----------------
    case "LESSON_ADD": {
      const text = clean(cmd.text);
      if (!text) return fail("TEXTO_VAZIO");
      const lesson: Lesson = { id: newId("l"), phase: cmd.phase ?? model.currentPhase, text, kind: cmd.kind, authorId: ctx.actorId, at: nowIso };
      return ok({ ...model, lessons: [...model.lessons, lesson] }, true, "lessonAdded", { phase: lesson.phase });
    }
    case "GATE_SET": {
      const others = model.gates.filter((g) => g.phase !== cmd.phase);
      const gate = { phase: cmd.phase, outcome: cmd.outcome, decisionId: cmd.decisionId ?? model.gates.find((g) => g.phase === cmd.phase)?.decisionId, notes: cmd.notes, decidedAt: cmd.outcome === "PENDENTE" ? undefined : nowIso };
      let currentPhase = model.currentPhase;
      const idx = PROJECT_PHASES.indexOf(cmd.phase);
      if ((cmd.outcome === "APROVADO" || cmd.outcome === "APROVADO_COM_RESSALVAS") && model.currentPhase === cmd.phase && idx < PROJECT_PHASES.length - 1) currentPhase = PROJECT_PHASES[idx + 1]!;
      let closure = model.closure;
      if (cmd.outcome === "ENCERRADO") {
        currentPhase = "ENCERRAMENTO";
        closure = { ...closure, cancelledReason: cmd.notes || closure.cancelledReason || "—" };
      }
      return ok({ ...model, gates: [...others, gate], currentPhase, closure }, true, "gateSet", { phase: cmd.phase, outcome: cmd.outcome });
    }

    // ---------------- iniciação: TAP, business case, orçamento ----------------
    case "CHARTER_UPDATE": {
      // aprovar registra quem aprovou; desfazer a aprovação apaga o registro
      const approval = "approvedBySponsorAt" in cmd.patch ? { approvedBy: cmd.patch.approvedBySponsorAt ? ctx.actorId : undefined } : {};
      return ok({ ...model, charter: { ...model.charter, ...cmd.patch, ...approval } }, true, "charterUpdated");
    }
    case "CHARTER_LIST_ADD": {
      const text = clean(cmd.text);
      if (!text) return fail("TEXTO_VAZIO");
      const c = model.charter;
      const charter: Charter =
        cmd.list === "objectives" ? { ...c, objectives: [...c.objectives, { id: newId("o"), text, smart: false }] }
        : cmd.list === "milestones" ? { ...c, milestones: [...c.milestones, { id: newId("m"), title: text }] }
        : { ...c, [cmd.list]: [...c[cmd.list], text] };
      return ok({ ...model, charter }, true, "charterListAdded", { list: cmd.list });
    }
    case "CHARTER_LIST_REMOVE": {
      const c = model.charter;
      const arr = c[cmd.list] as readonly unknown[];
      if (cmd.index < 0 || cmd.index >= arr.length) return fail("NAO_ENCONTRADO");
      return ok({ ...model, charter: { ...c, [cmd.list]: arr.filter((_, i) => i !== cmd.index) } }, true, "charterListRemoved", { list: cmd.list });
    }
    case "OBJECTIVE_UPDATE": {
      const o = model.charter.objectives.find((x) => x.id === cmd.id);
      if (!o) return fail("NAO_ENCONTRADO", cmd.id);
      if (cmd.goalId && !model.governance.goals.some((g) => g.id === cmd.goalId)) return fail("NAO_ENCONTRADO", cmd.goalId);
      const next = { ...o, smart: cmd.smart ?? o.smart, goalId: cmd.goalId === null ? undefined : (cmd.goalId ?? o.goalId) };
      return ok({ ...model, charter: { ...model.charter, objectives: model.charter.objectives.map((x) => (x.id === o.id ? next : x)) } }, true, "objectiveUpdated");
    }
    case "BUSINESS_CASE_UPDATE":
      return ok({ ...model, businessCase: { ...model.businessCase, ...cmd.patch } }, true, "businessCaseUpdated");
    case "BUDGET_LINE_ADD": {
      const title = clean(cmd.title);
      if (!title) return fail("TEXTO_VAZIO");
      if (!(cmd.amount >= 0)) return fail("VALOR_INVALIDO", "amount");
      return ok({ ...model, budgetLines: [...model.budgetLines, { id: newId("b"), title, amount: cmd.amount, spend: cmd.spend }] }, true, "budgetLineAdded", { title });
    }
    case "BUDGET_LINE_UPDATE": {
      const b = model.budgetLines.find((x) => x.id === cmd.id);
      if (!b) return fail("NAO_ENCONTRADO", cmd.id);
      if (cmd.patch.amount !== undefined && !(cmd.patch.amount >= 0)) return fail("VALOR_INVALIDO", "amount");
      return ok({ ...model, budgetLines: model.budgetLines.map((x) => (x.id === b.id ? { ...x, ...cmd.patch } : x)) }, true, "budgetLineUpdated", { title: cmd.patch.title ?? b.title });
    }
    case "BUDGET_LINE_REMOVE": {
      const b = model.budgetLines.find((x) => x.id === cmd.id);
      if (!b) return fail("NAO_ENCONTRADO", cmd.id);
      return ok({ ...model, budgetLines: model.budgetLines.filter((x) => x.id !== b.id) }, true, "budgetLineRemoved", { title: b.title });
    }
    case "RESERVES_SET":
      if (!(cmd.contingency >= 0) || !(cmd.management >= 0)) return fail("VALOR_INVALIDO", "reserves");
      return ok({ ...model, reserves: { contingency: cmd.contingency, management: cmd.management } }, true, "reservesSet");
    case "GOVERNANCE_UPDATE":
      return ok({ ...model, governance: { ...model.governance, ...cmd.patch } }, true, "governanceUpdated");
    case "CLOSURE_UPDATE":
      return ok({ ...model, closure: { ...model.closure, ...cmd.patch } }, true, "closureUpdated");
    case "BASELINE_SET": {
      const baseline = baselineFrom(model, nowIso);
      if (!baseline) return fail("CICLO");
      return ok({ ...model, baseline, tasks: model.tasks.map((t) => ({ ...t, addedAfterBaseline: undefined })) }, true, "baselineSet", { finish: baseline.finish });
    }
    case "SET_PROJECT_AREA":
      if (!PROJECT_AREAS.includes(cmd.area)) return fail("VALOR_INVALIDO", "area");
      if ((model.area ?? "SOFTWARE") === cmd.area) return ok(model, false);
      return ok({ ...model, area: cmd.area }, true, "areaSet", { area: cmd.area });
    case "SET_APPROACH":
      return ok({ ...model, approach: cmd.approach }, true, "approachSet", { approach: cmd.approach });
    case "SET_BOARD_MODEL":
      return ok({ ...model, boardModel: cmd.model }, false);
    case "SET_CURRENT_SPRINT":
      if (!(cmd.sprint >= 1)) return fail("VALOR_INVALIDO", "sprint");
      return ok({ ...model, currentSprint: Math.round(cmd.sprint) }, false);
    case "SPRINT_SET": {
      const n = Math.round(cmd.number);
      if (!(n >= 1) || !/^\d{4}-\d{2}-\d{2}/.test(cmd.start) || !/^\d{4}-\d{2}-\d{2}/.test(cmd.end) || cmd.end.slice(0, 10) < cmd.start.slice(0, 10)) return fail("VALOR_INVALIDO", "sprint");
      const sprint = { number: n, start: cmd.start.slice(0, 10), end: cmd.end.slice(0, 10), goal: cmd.goal ? clean(cmd.goal) : undefined };
      const sprints = [...(model.sprints ?? []).filter((x) => x.number !== n), sprint].sort((a, b) => a.number - b.number);
      return ok({ ...model, sprints }, true, "sprintSet", { n });
    }
    case "SET_STATUS_DATE":
      if (!/^\d{4}-\d{2}-\d{2}/.test(cmd.date)) return fail("VALOR_INVALIDO", "date");
      return ok({ ...model, statusDate: cmd.date.slice(0, 10) }, false);
    case "LINK_DECISION":
      if (model.decisionIds.includes(cmd.decisionId)) return ok(model, false);
      return ok({ ...model, decisionIds: [...model.decisionIds, cmd.decisionId] }, true, "decisionLinked");
  }
}

/** Cria o dado da área correspondente ao bloco do Project Model Canvas (post-it solto ou criado dentro do bloco). */
function createInBlock(model: ProjectModel, block: PmcBlock, text: string, center: { x: number; y: number }, ctx: CommandContext): CommandResult {
  const target = PMC_TARGET[block];
  const place = (r: CommandResult): CommandResult => (r.ok && r.createdRef ? { ...r, model: setPosition(r.model, r.createdRef, center) } : r);
  if (target === "REQ") return place(reduce(model, { type: "REQ_ADD", text }, ctx));
  if (target === "STK") return place(reduce(model, { type: "STK_ADD", name: text }, ctx));
  if (target === "WBS") return place(reduce(model, { type: "WBS_ADD", title: text }, ctx));
  if (target === "RISK") return place(reduce(model, { type: "RISK_ADD", title: text }, ctx));
  switch (block) {
    case "JUSTIFICATIVAS": return reduce(model, { type: "CHARTER_LIST_ADD", list: "justification", text }, ctx);
    case "OBJETIVO_SMART": return reduce(model, { type: "CHARTER_LIST_ADD", list: "objectives", text }, ctx);
    case "BENEFICIOS": return reduce(model, { type: "BUSINESS_CASE_UPDATE", patch: { benefits: [...model.businessCase.benefits, clean(text)] } }, ctx);
    case "PRODUTO": return reduce(model, { type: "CHARTER_UPDATE", patch: { product: model.charter.product ? `${model.charter.product}; ${clean(text)}` : clean(text) } }, ctx);
    case "EQUIPE": return reduce(model, { type: "CHARTER_LIST_ADD", list: "teamRoles", text }, ctx);
    case "PREMISSAS": return reduce(model, { type: "CHARTER_LIST_ADD", list: "premises", text }, ctx);
    case "RESTRICOES": return reduce(model, { type: "CHARTER_LIST_ADD", list: "constraints", text }, ctx);
    case "LINHA_DO_TEMPO": return reduce(model, { type: "CHARTER_LIST_ADD", list: "milestones", text }, ctx);
    case "CUSTOS": return reduce(model, { type: "BUDGET_LINE_ADD", title: text, amount: 0, spend: "GROW" }, ctx);
    default: return fail("LIGACAO_INVALIDA", block);
  }
}

/** Congela cronograma e orçamento atuais como linha de base; `null` se a rede tiver ciclo. */
export function baselineFrom(model: ProjectModel, nowIso: string): ProjectModel["baseline"] | null {
  const s = scheduleOf(model);
  if (!s.ok) return null;
  const tasks: NonNullable<ProjectModel["baseline"]>["tasks"] = {};
  let bac = 0;
  for (const t of model.tasks) {
    const row = s.rows[t.id]!;
    tasks[t.id] = { es: row.es, ef: row.ef, duration: effectiveDuration(t), budget: t.budget };
    bac += t.budget;
  }
  return { setAt: nowIso, finish: s.finish, bac: Math.round(bac * 100) / 100, tasks };
}
