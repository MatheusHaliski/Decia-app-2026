/**
 * Aplicação das alavancas do Simulador (RF31) sobre uma CÓPIA do modelo — nunca sobre o projeto. Funções puras: o modelo de
 * entrada não é alterado e a mesma entrada dá sempre a mesma saída (ids sintéticos derivados da posição da alavanca, sem relógio).
 *
 * Regras (cada uma vira um "efeito" legível, `sim.fx.<chave>`, para explicar o porquê de cada número):
 *  - escopo: só sai o que ainda não começou (o custo já gasto não volta); ao retirar uma atividade, as predecessoras passam a ligar
 *    direto às sucessoras (término→início), para a precedência continuar valendo;
 *  - esforço e preço mexem só no que FALTA fazer (parte concluída fica como está);
 *  - atraso de fornecedor na ENTREGA vira a restrição "não começa antes de" (início planejado no plano atual + dias); atividade já
 *    em andamento pausa; atividade concluída não é atingida;
 *  - ausência de pessoa: atividade dela em andamento pausa pelo tempo da ausência; a que começaria durante a ausência espera a volta
 *    (janelas do plano depois das mudanças de escopo);
 *  - corte de orçamento: base = custo planejado + reservas; RESERVA tira da gerencial e depois da contingência; LINHAS reduz o
 *    orçamento do trabalho sem reduzir o trabalho; ESCOPO retira atividades não iniciadas Won't → Could → Should (Must nunca).
 */
import { effectiveDuration, scheduleOf } from "../derive";
import { dateToOffset, wouldCreateCycle, type ScheduleResult } from "../engine/schedule";
import { hasKeyword, normalizeText } from "../compliance/text";
import type { Moscow, ProjectModel, Task } from "../types";
import { LEVER_ORDER, type Effect, type Lever, type TaskSelector } from "./types";

const r2 = (x: number) => Math.round(x * 100) / 100;
const EPS = 0.005;
/** Prefixo dos nós de restrição "não começa antes de" na rede do cenário. */
export const SNET_PREFIX = "~snet:";

export type LeverError = "VALOR_INVALIDO" | "SEM_ALVO" | "NAO_ENCONTRADO" | "TEXTO_VAZIO";

export interface CutOutcome {
  /** base do percentual: custo planejado + reserva de contingência + reserva gerencial (projeto original) */
  base: number;
  requested: number;
  fromManagement: number;
  fromContingency: number;
  fromLines: number;
  fromScope: number;
  uncovered: number;
}

export interface Applied {
  /** cópia do modelo com as alavancas de escopo, esforço, recursos e preço já nas atividades */
  model: ProjectModel;
  /** "não começa antes de" (dias corridos desde o início), por atividade */
  constraints: Record<string, { at: number; lever: number }>;
  removed: string[];
  removedMust: string[];
  added: string[];
  /** atividades atingidas por atraso, indisponibilidade, esforço ou reajuste (para os riscos registrados ligados a elas) */
  hit: string[];
  /** atividades atingidas por indisponibilidade de pessoa */
  resourceHit: string[];
  /** reajuste sobre linhas de orçamento (custo certo, fora das atividades) */
  extraPrice: number;
  /** orçamento das atividades retiradas */
  savings: number;
  addedBudget: number;
  /** variação de orçamento das atividades por esforço e por reajuste */
  taskBudgetDelta: number;
  reserves: { contingency: number; management: number };
  cut: CutOutcome;
  effects: Effect[];
  invalid: { lever: number; error: LeverError }[];
}

const isDone = (t: Task) => t.status === "CONCLUIDA";
const notStarted = (t: Task) => t.status === "A_FAZER" && t.percentComplete <= 0;
const selectorEmpty = (s: TaskSelector | undefined) => !s || (!s.taskIds?.length && !s.keywords?.length && !s.riskIds?.length);

/** Atividades atingidas por um seletor (na ordem do modelo): ids escolhidos ∪ palavra no título ∪ ligadas aos riscos. */
export function resolveTargets(model: Pick<ProjectModel, "tasks" | "risks">, sel: TaskSelector | undefined): string[] {
  if (!sel) return [];
  const ids = new Set<string>();
  const exists = new Set(model.tasks.map((t) => t.id));
  for (const id of sel.taskIds ?? []) if (exists.has(id)) ids.add(id);
  const keywords = (sel.keywords ?? []).filter((k) => k.trim());
  if (keywords.length) {
    for (const t of model.tasks) {
      const n = normalizeText(t.title);
      if (keywords.some((k) => hasKeyword(n, k))) ids.add(t.id);
    }
  }
  for (const rid of sel.riskIds ?? []) for (const id of model.risks.find((r) => r.id === rid)?.taskIds ?? []) if (exists.has(id)) ids.add(id);
  return model.tasks.filter((t) => ids.has(t.id)).map((t) => t.id);
}

/** Valida a alavanca contra o modelo; `null` = válida. */
export function validateLever(lever: Lever, model: ProjectModel): LeverError | null {
  const finite = (x: number) => typeof x === "number" && Number.isFinite(x);
  switch (lever.kind) {
    case "CORTE_ORCAMENTO":
      if (!finite(lever.value) || lever.value <= 0 || (lever.mode === "PERCENTUAL" && lever.value > 100)) return "VALOR_INVALIDO";
      return null;
    case "ATRASO_FORNECEDOR":
      if (!finite(lever.days) || lever.days <= 0 || lever.days > 730) return "VALOR_INVALIDO";
      return resolveTargets(model, lever.target).length ? null : "SEM_ALVO";
    case "ESCOPO_RETIRAR":
      if (!lever.wbsIds.length && !lever.taskIds.length) return "SEM_ALVO";
      if (lever.wbsIds.some((id) => !model.wbs.some((n) => n.id === id)) || lever.taskIds.some((id) => !model.tasks.some((t) => t.id === id))) return "NAO_ENCONTRADO";
      return null;
    case "ESCOPO_INCLUIR":
      if (!lever.title.trim()) return "TEXTO_VAZIO";
      if (!finite(lever.durationDays) || lever.durationDays < 0 || lever.durationDays > 3650 || !finite(lever.budget) || lever.budget < 0) return "VALOR_INVALIDO";
      if ((lever.afterTaskId && !model.tasks.some((t) => t.id === lever.afterTaskId)) || (lever.beforeTaskId && !model.tasks.some((t) => t.id === lever.beforeTaskId))) return "NAO_ENCONTRADO";
      if (lever.afterTaskId && lever.afterTaskId === lever.beforeTaskId) return "VALOR_INVALIDO";
      return null;
    case "ESCOPO_ESFORCO":
      if (!finite(lever.pct) || lever.pct === 0 || lever.pct < -90 || lever.pct > 500) return "VALOR_INVALIDO";
      if (!selectorEmpty(lever.target) && !resolveTargets(model, lever.target).length) return "SEM_ALVO";
      return null;
    case "INDISPONIBILIDADE":
      if (!lever.userId) return "SEM_ALVO";
      if (lever.mode === "AUSENCIA") {
        if (!finite(lever.days) || lever.days <= 0 || lever.days > 730) return "VALOR_INVALIDO";
        if (lever.fromDate && !/^\d{4}-\d{2}-\d{2}/.test(lever.fromDate)) return "VALOR_INVALIDO";
      } else if (!finite(lever.capacityPct) || lever.capacityPct <= 0 || lever.capacityPct >= 100) return "VALOR_INVALIDO";
      return null;
    case "REAJUSTE_PRECO":
      if (!finite(lever.pct) || lever.pct === 0 || lever.pct < -90 || lever.pct > 500) return "VALOR_INVALIDO";
      if (!lever.budgetLineIds.length && selectorEmpty(lever.target)) return "SEM_ALVO";
      if (lever.budgetLineIds.some((id) => !model.budgetLines.some((b) => b.id === id))) return "NAO_ENCONTRADO";
      if (!selectorEmpty(lever.target) && !resolveTargets(model, lever.target).length && !lever.budgetLineIds.length) return "SEM_ALVO";
      return null;
  }
}

/** Multiplica a parte que FALTA (1 − % concluído) por `factor`; a parte feita fica como está. */
function scaleRemaining(t: Task, factor: number, what: { duration?: boolean; budget?: boolean }): Task {
  const done = Math.max(0, Math.min(100, t.percentComplete)) / 100;
  const k = done + (1 - done) * factor;
  const next: Task = { ...t };
  if (what.duration && !t.milestone) {
    next.durationDays = r2(t.durationDays * k);
    if (t.pert) next.pert = { o: r2(t.pert.o * k), m: r2(t.pert.m * k), p: r2(t.pert.p * k) };
  }
  if (what.budget) next.budget = r2(t.budget * k);
  return next;
}

/** Soma dias à duração (e aos três pontos do PERT, que andam juntos). */
function addDays(t: Task, days: number): Task {
  return { ...t, durationDays: r2(t.durationDays + days), pert: t.pert ? { o: r2(t.pert.o + days), m: r2(t.pert.m + days), p: r2(t.pert.p + days) } : undefined };
}

/** Retira a atividade e liga predecessoras → sucessoras (término→início), para a precedência continuar valendo. */
function removeTask(model: ProjectModel, id: string): ProjectModel {
  const preds = model.dependencies.filter((d) => d.to === id).map((d) => d.from);
  const succs = model.dependencies.filter((d) => d.from === id).map((d) => d.to);
  const deps = model.dependencies.filter((d) => d.from !== id && d.to !== id);
  for (const p of preds) for (const s of succs) {
    if (p !== s && !deps.some((d) => d.from === p && d.to === s)) deps.push({ id: `sim-bridge:${p}:${s}`, from: p, to: s, type: "FS", lagDays: 0 });
  }
  return {
    ...model,
    tasks: model.tasks.filter((t) => t.id !== id),
    dependencies: deps,
    raci: model.raci.filter((r) => r.taskId !== id),
    risks: model.risks.map((r) => (r.taskIds.includes(id) ? { ...r, taskIds: r.taskIds.filter((x) => x !== id) } : r)),
  };
}

function nextCode(codes: readonly string[]): string {
  const nums = codes.map((c) => Number(c.replace(/^\D+/, ""))).filter((n) => Number.isFinite(n));
  return `T${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
}

const MOSCOW_CUT_ORDER: Partial<Record<Moscow, number>> = { WONT: 0, COULD: 1, SHOULD: 2 };

/** Aplica as alavancas válidas, na ordem canônica, a uma cópia do modelo. */
export function applyLevers(original: ProjectModel, levers: readonly Lever[]): Applied {
  const plannedOriginal = original.tasks.reduce((s, t) => s + t.budget, 0);
  const st: Applied = {
    model: original,
    constraints: {},
    removed: [],
    removedMust: [],
    added: [],
    hit: [],
    resourceHit: [],
    extraPrice: 0,
    savings: 0,
    addedBudget: 0,
    taskBudgetDelta: 0,
    reserves: { ...original.reserves },
    cut: { base: r2(plannedOriginal + original.reserves.contingency + original.reserves.management), requested: 0, fromManagement: 0, fromContingency: 0, fromLines: 0, fromScope: 0, uncovered: 0 },
    effects: [],
    invalid: [],
  };
  const fx = (lever: number, key: string, vars: Record<string, string | number> = {}) => st.effects.push({ lever, key, vars });
  const code = (id: string) => st.model.tasks.find((t) => t.id === id)?.code ?? original.tasks.find((t) => t.id === id)?.code ?? id;
  const setTask = (next: Task) => {
    st.model = { ...st.model, tasks: st.model.tasks.map((t) => (t.id === next.id ? next : t)) };
  };
  const hit = (id: string, resource = false) => {
    if (!st.hit.includes(id)) st.hit.push(id);
    if (resource && !st.resourceHit.includes(id)) st.resourceHit.push(id);
  };
  const constrain = (id: string, at: number, lever: number) => {
    const cur = st.constraints[id];
    if (!cur || at > cur.at) st.constraints[id] = { at: r2(at), lever };
  };
  const drop = (id: string, lever: number, why: "RETIRAR" | "CORTE") => {
    const t = st.model.tasks.find((x) => x.id === id);
    if (!t) return;
    st.model = removeTask(st.model, id);
    if (st.added.includes(id)) st.added = st.added.filter((x) => x !== id);
    else st.removed.push(id);
    if (t.moscow === "MUST") st.removedMust.push(id);
    st.savings = r2(st.savings + t.budget);
    fx(lever, why === "CORTE" ? "removeCut" : "remove", { code: t.code, title: t.title, budgetBrl: t.budget, ...(t.moscow ? { moscow: t.moscow } : {}) });
  };

  const order = levers
    .map((lever, index) => ({ lever, index }))
    .sort((a, b) => LEVER_ORDER[a.lever.kind] - LEVER_ORDER[b.lever.kind] || a.index - b.index);

  let planAfterScope: ScheduleResult | null = null;
  const planOriginal = scheduleOf(original);
  const plan = () => (planAfterScope ??= scheduleOf(st.model));

  for (const { lever, index } of order) {
    // a escolha da pessoa se refere ao projeto como ele é; o que outra alavanca já tirou da cópia é pulado na aplicação
    const error = validateLever(lever, original);
    if (error) {
      st.invalid.push({ lever: index, error });
      fx(index, "invalid", { error });
      continue;
    }
    switch (lever.kind) {
      // ------------------------------------------------------------ escopo
      case "ESCOPO_RETIRAR": {
        const ids = new Set(lever.taskIds);
        for (const w of lever.wbsIds) {
          const sub = new Set([w]);
          let grew = true;
          while (grew) {
            grew = false;
            for (const n of st.model.wbs) if (n.parentId && sub.has(n.parentId) && !sub.has(n.id)) {
              sub.add(n.id);
              grew = true;
            }
          }
          for (const t of st.model.tasks) if (t.wbsId && sub.has(t.wbsId)) ids.add(t.id);
          const node = st.model.wbs.find((n) => n.id === w);
          st.model = { ...st.model, wbs: st.model.wbs.filter((n) => !sub.has(n.id)), requirements: st.model.requirements.map((r) => ({ ...r, deliverableIds: r.deliverableIds.filter((d) => !sub.has(d)) })) };
          if (node) fx(index, "removeWbs", { title: node.title });
        }
        for (const t of st.model.tasks.filter((x) => ids.has(x.id))) {
          if (!notStarted(t)) fx(index, "removeStarted", { code: t.code, title: t.title });
          else drop(t.id, index, "RETIRAR");
        }
        planAfterScope = null;
        break;
      }
      case "ESCOPO_INCLUIR": {
        const id = `sim-add-${index}`;
        const task: Task = {
          id, code: nextCode([...st.model.tasks, ...original.tasks].map((t) => t.code)), title: lever.title.replace(/\s+/g, " ").trim(), phase: lever.phase, status: "A_FAZER",
          durationDays: r2(lever.durationDays), percentComplete: 0, budget: r2(lever.budget), actualCost: 0, moscow: lever.moscow, createdBy: "simulador",
          addedAfterBaseline: original.baseline ? true : undefined,
        };
        st.model = { ...st.model, tasks: [...st.model.tasks, task] };
        st.added.push(id);
        st.addedBudget = r2(st.addedBudget + task.budget);
        const link = (from: string, to: string) => {
          const deps = st.model.dependencies.map((d) => ({ from: d.from, to: d.to, type: d.type, lag: d.lagDays }));
          if (wouldCreateCycle(deps, from, to)) {
            fx(index, "addCycle", { from: code(from), to: code(to) });
            return false;
          }
          st.model = { ...st.model, dependencies: [...st.model.dependencies, { id: `sim-dep:${from}:${to}`, from, to, type: "FS", lagDays: 0 }] };
          return true;
        };
        const after = lever.afterTaskId && st.model.tasks.some((t) => t.id === lever.afterTaskId) && link(lever.afterTaskId, id) ? lever.afterTaskId : undefined;
        const before = lever.beforeTaskId && st.model.tasks.some((t) => t.id === lever.beforeTaskId) && link(id, lever.beforeTaskId) ? lever.beforeTaskId : undefined;
        const vars = { code: task.code, title: task.title, days: task.durationDays, budgetBrl: task.budget, phase: task.phase };
        if (!after && !before) fx(index, "addParallel", vars);
        else fx(index, "add", { ...vars, after: after ? code(after) : "—", before: before ? code(before) : "—" });
        planAfterScope = null;
        break;
      }
      case "ESCOPO_ESFORCO": {
        const factor = 1 + lever.pct / 100;
        const targets = selectorEmpty(lever.target) ? st.model.tasks.filter((t) => !isDone(t) && !t.milestone).map((t) => t.id) : resolveTargets(st.model, lever.target);
        let n = 0;
        for (const id of targets) {
          const t = st.model.tasks.find((x) => x.id === id)!;
          if (isDone(t) || t.milestone) continue;
          const next = scaleRemaining(t, factor, { duration: true, budget: true });
          setTask(next);
          st.taskBudgetDelta = r2(st.taskBudgetDelta + next.budget - t.budget);
          hit(id);
          n++;
          fx(index, "effort", { code: t.code, fromDays: effectiveDuration(t), toDays: effectiveDuration(next), fromBrl: t.budget, toBrl: next.budget, pct: lever.pct });
        }
        if (!n) fx(index, "effortNone");
        planAfterScope = null;
        break;
      }

      // ------------------------------------------------------------ recursos
      case "INDISPONIBILIDADE": {
        const mine = st.model.tasks.filter((t) => t.responsibleId === lever.userId && !isDone(t) && !t.milestone);
        if (lever.mode === "CAPACIDADE") {
          const factor = 100 / lever.capacityPct;
          for (const t of mine) {
            const next = scaleRemaining(t, factor, { duration: true });
            setTask(next);
            hit(t.id, true);
            fx(index, "capacity", { code: t.code, fromDays: effectiveDuration(t), toDays: effectiveDuration(next), capacityPct: lever.capacityPct, person: lever.userId });
          }
          if (!mine.length) fx(index, "resourceNone", { person: lever.userId });
          break;
        }
        const p = plan();
        if (!p.ok) {
          st.invalid.push({ lever: index, error: "VALOR_INVALIDO" });
          fx(index, "invalid", { error: "CICLO" });
          break;
        }
        const from = lever.fromDate ? dateToOffset(original.startDate, lever.fromDate) : dateToOffset(original.startDate, original.statusDate);
        const to = from + lever.days;
        let n = 0;
        for (const t of mine) {
          const row = p.rows[t.id];
          if (!row || row.ef <= from || row.es >= to) continue;
          n++;
          hit(t.id, true);
          if (row.es >= from) {
            constrain(t.id, to, index);
            fx(index, "absenceWait", { code: t.code, fromDays: row.es, toDays: to, person: lever.userId });
          } else {
            const next = addDays(t, to - from);
            setTask(next);
            fx(index, "absencePause", { code: t.code, days: to - from, fromDays: effectiveDuration(t), toDays: effectiveDuration(next), person: lever.userId });
          }
        }
        if (!n) fx(index, "absenceNone", { person: lever.userId, fromDays: from, toDays: to });
        break;
      }

      // ------------------------------------------------------------ fornecedor
      case "ATRASO_FORNECEDOR": {
        const supplier = lever.supplier?.trim() || "—";
        const targets = resolveTargets(st.model, lever.target);
        if (!targets.length) fx(index, "noTargets");
        for (const id of targets) {
          const t = st.model.tasks.find((x) => x.id === id)!;
          if (isDone(t)) {
            fx(index, "delayDone", { code: t.code });
            continue;
          }
          hit(id);
          if (t.status !== "A_FAZER" && !t.milestone) {
            const next = addDays(t, lever.days);
            setTask(next);
            fx(index, "delayPause", { code: t.code, days: lever.days, fromDays: effectiveDuration(t), toDays: effectiveDuration(next), supplier });
          } else if (lever.mode === "ENTREGA" || t.milestone) {
            const p = planOriginal.ok && planOriginal.rows[id] ? planOriginal : plan();
            const es = p.ok ? (p.rows[id]?.es ?? 0) : 0;
            constrain(id, es + lever.days, index);
            fx(index, "delayStart", { code: t.code, fromDays: es, toDays: r2(es + lever.days), days: lever.days, supplier });
          } else {
            const next = addDays(t, lever.days);
            setTask(next);
            fx(index, "delayDuration", { code: t.code, fromDays: effectiveDuration(t), toDays: effectiveDuration(next), days: lever.days, supplier });
          }
        }
        break;
      }

      // ------------------------------------------------------------ preço
      case "REAJUSTE_PRECO": {
        for (const lid of lever.budgetLineIds) {
          const line = st.model.budgetLines.find((b) => b.id === lid);
          if (!line) continue;
          const extra = r2((line.amount * lever.pct) / 100);
          st.extraPrice = r2(st.extraPrice + extra);
          fx(index, "priceLine", { line: line.title, fromBrl: line.amount, toBrl: r2(line.amount + extra), pct: lever.pct });
        }
        if (!selectorEmpty(lever.target)) {
          for (const id of resolveTargets(st.model, lever.target)) {
            const t = st.model.tasks.find((x) => x.id === id)!;
            if (isDone(t)) {
              fx(index, "priceDone", { code: t.code });
              continue;
            }
            const next = scaleRemaining(t, 1 + lever.pct / 100, { budget: true });
            setTask(next);
            st.taskBudgetDelta = r2(st.taskBudgetDelta + next.budget - t.budget);
            hit(id);
            fx(index, "priceTask", { code: t.code, fromBrl: t.budget, toBrl: next.budget, pct: lever.pct });
          }
        }
        break;
      }

      // ------------------------------------------------------------ corte de orçamento
      case "CORTE_ORCAMENTO": {
        const requested = r2(lever.mode === "PERCENTUAL" ? (st.cut.base * lever.value) / 100 : lever.value);
        st.cut.requested = r2(st.cut.requested + requested);
        let rest = requested;
        if (lever.source === "RESERVA") {
          const m = Math.min(rest, st.reserves.management);
          st.reserves.management = r2(st.reserves.management - m);
          rest = r2(rest - m);
          const c = Math.min(rest, st.reserves.contingency);
          st.reserves.contingency = r2(st.reserves.contingency - c);
          rest = r2(rest - c);
          st.cut.fromManagement = r2(st.cut.fromManagement + m);
          st.cut.fromContingency = r2(st.cut.fromContingency + c);
          fx(index, "cutReserve", { amountBrl: requested, managementBrl: m, contingencyBrl: c });
        } else if (lever.source === "LINHAS") {
          const remaining = r2(st.model.tasks.filter((t) => !isDone(t)).reduce((s, t) => s + t.budget * (1 - Math.max(0, Math.min(100, t.percentComplete)) / 100), 0) - st.cut.fromLines);
          const l = Math.max(0, Math.min(rest, remaining));
          st.cut.fromLines = r2(st.cut.fromLines + l);
          rest = r2(rest - l);
          fx(index, "cutLines", { amountBrl: requested, linesBrl: l });
        } else {
          const candidates = st.model.tasks
            .filter((t) => !t.milestone && notStarted(t) && t.budget > 0 && t.moscow !== undefined && MOSCOW_CUT_ORDER[t.moscow] !== undefined)
            .sort((a, b) => MOSCOW_CUT_ORDER[a.moscow!]! - MOSCOW_CUT_ORDER[b.moscow!]! || b.budget - a.budget || a.code.localeCompare(b.code, undefined, { numeric: true }));
          let saved = 0;
          for (const t of candidates) {
            if (rest <= EPS) break;
            drop(t.id, index, "CORTE");
            saved = r2(saved + t.budget);
            rest = r2(Math.max(0, rest - t.budget));
          }
          st.cut.fromScope = r2(st.cut.fromScope + saved);
          fx(index, candidates.length ? "cutScope" : "cutScopeNone", { amountBrl: requested, savedBrl: saved });
          planAfterScope = null;
        }
        if (rest > EPS) {
          st.cut.uncovered = r2(st.cut.uncovered + rest);
          fx(index, "cutUncovered", { uncoveredBrl: rest });
        }
        break;
      }
    }
  }
  return st;
}
