/**
 * Derivações básicas do modelo, usadas pelos comandos e pelas visões: duração efetiva (PERT ⇒ TE), cronograma CPM do projeto,
 * EAP com códigos e as zonas do canvas com a altura das faixas calculada pelas atividades.
 */
import { phaseZones, pmcZones, laneHeightFor, type Zone } from "./canvas";
import { pert } from "./engine/pert";
import { schedule, type ScheduleResult } from "./engine/schedule";
import { PROJECT_PHASES, type ProjectModel, type Task, type WbsNode } from "./types";

/** Duração usada no cronograma: TE do PERT quando há três pontos válidos; senão a duração planejada; marco = 0. */
export function effectiveDuration(task: Pick<Task, "durationDays" | "pert" | "milestone">): number {
  if (task.milestone) return 0;
  if (task.pert) {
    const e = pert(task.pert);
    if (e.valid) return e.te;
  }
  return Math.max(0, task.durationDays);
}

export function scheduleOf(model: Pick<ProjectModel, "tasks" | "dependencies">): ScheduleResult {
  return schedule(
    model.tasks.map((t) => ({ id: t.id, duration: effectiveDuration(t) })),
    model.dependencies.map((d) => ({ from: d.from, to: d.to, type: d.type, lag: d.lagDays })),
  );
}

export const wbsRoot = (wbs: readonly WbsNode[]) => wbs.find((n) => !n.parentId);

export interface WbsTreeNode { node: WbsNode; code: string; depth: number; children: WbsTreeNode[]; leaf: boolean }

/** Árvore da EAP com códigos 1, 1.1, 1.1.1… (a raiz é o projeto, código "0"). Filhos na ordem do array. */
export function wbsTree(wbs: readonly WbsNode[]): WbsTreeNode | null {
  const root = wbsRoot(wbs);
  if (!root) return null;
  const byParent = new Map<string, WbsNode[]>();
  for (const n of wbs) if (n.parentId) byParent.set(n.parentId, [...(byParent.get(n.parentId) ?? []), n]);
  const build = (node: WbsNode, code: string, depth: number, seen: Set<string>): WbsTreeNode => {
    const kids = seen.has(node.id) ? [] : (byParent.get(node.id) ?? []);
    const next = new Set(seen).add(node.id);
    const children = kids.map((k, i) => build(k, depth === 0 ? String(i + 1) : `${code}.${i + 1}`, depth + 1, next));
    return { node, code, depth, children, leaf: children.length === 0 };
  };
  return build(root, "0", 0, new Set());
}

export function flattenWbs(tree: WbsTreeNode | null): WbsTreeNode[] {
  if (!tree) return [];
  const out: WbsTreeNode[] = [];
  const walk = (n: WbsTreeNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  walk(tree);
  return out;
}

/** Zonas do canvas para este projeto (as faixas de fase crescem com o número de atividades da fase mais cheia). */
export function canvasZones(model: Pick<ProjectModel, "tasks">): { zones: Zone[]; laneHeight: number } {
  const counts = PROJECT_PHASES.map((p) => model.tasks.filter((t) => t.phase === p).length);
  const laneHeight = laneHeightFor(Math.max(0, ...counts));
  return { zones: [...pmcZones(), ...phaseZones(laneHeight)], laneHeight };
}
