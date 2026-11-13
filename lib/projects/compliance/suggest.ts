/**
 * "Sugerir tarefa" do Espelho (RF32.CA03, `ComplianceService.createMissingTask`): monta a tarefa técnica faltante para um item e a
 * cria pelos comandos EXISTENTES da Mesa — `TASK_CREATE` na fase do item e, quando há responsável ou é marco, `TASK_UPDATE`. A
 * referência ao item vai no título (`[código]`, visível no quadro) e no vínculo devolvido para o armazenamento do Espelho
 * (`TaskLink`, o `TaskItem.checklistItemId` do README enquanto a atividade da Mesa não tem esse campo).
 */
import { refId } from "../canvas";
import type { CommandResult, ProjectCommand } from "../commands";
import type { ProjectModel, ProjectPhase } from "../types";
import type { ItemResult } from "./types";

export interface SuggestionPlan {
  itemId: string;
  code: string;
  /** título final da atividade, já com a referência ao item */
  title: string;
  phase: ProjectPhase;
  durationDays: number;
  milestone: boolean;
  responsibleId?: string;
}

/** Título da atividade com a referência ao item do checklist entre colchetes. */
export const taskTitle = (title: string, code: string) => `${title.replace(/\s+/g, " ").trim()} [${code}]`;

/** Plano da tarefa sugerida para um item com lacuna que uma atividade resolve (`null` quando não cabe sugestão). */
export function planSuggestion(r: ItemResult, title: string, responsibleId?: string): SuggestionPlan | null {
  const s = r.item.suggestion;
  if (!r.canSuggest || !s || !title.trim()) return null;
  return {
    itemId: r.item.id, code: r.item.code, title: taskTitle(title, r.item.code), phase: r.item.phase,
    durationDays: Math.max(0, s.durationDays), milestone: Boolean(s.milestone || r.item.rule.kind === "MARCO"), responsibleId: responsibleId || undefined,
  };
}

/** O comando EXISTENTE de inclusão de atividade, na fase certa. */
export function suggestionCommand(plan: SuggestionPlan): Extract<ProjectCommand, { type: "TASK_CREATE" }> {
  return { type: "TASK_CREATE", title: plan.title, phase: plan.phase, durationDays: plan.milestone ? 0 : plan.durationDays };
}

/** Mover para a fase do item a atividade que já trata do assunto, mas está na fase errada (comando existente). */
export function moveCommand(r: ItemResult): Extract<ProjectCommand, { type: "TASK_MOVE_PHASE" }> | null {
  return r.moveTaskId ? { type: "TASK_MOVE_PHASE", id: r.moveTaskId, phase: r.item.phase } : null;
}

export interface SuggestionOutcome {
  created: { itemId: string; taskId: string; code: string }[];
  failed: { itemId: string; error: string }[];
}

/** Cria as atividades planejadas pelo `dispatch` da Mesa (um comando por vez; erro de uma não impede as outras). */
export function createSuggestedTasks(dispatch: (cmd: ProjectCommand) => CommandResult, plans: readonly SuggestionPlan[]): SuggestionOutcome {
  const outcome: SuggestionOutcome = { created: [], failed: [] };
  for (const plan of plans) {
    const r = dispatch(suggestionCommand(plan));
    if (!r.ok || !r.createdRef) {
      outcome.failed.push({ itemId: plan.itemId, error: r.ok ? "NAO_ENCONTRADO" : r.error });
      continue;
    }
    const taskId = refId(r.createdRef);
    const patch = { ...(plan.responsibleId ? { responsibleId: plan.responsibleId } : {}), ...(plan.milestone ? { milestone: true } : {}) };
    if (Object.keys(patch).length) dispatch({ type: "TASK_UPDATE", id: taskId, patch });
    outcome.created.push({ itemId: plan.itemId, taskId, code: String(r.vars?.code ?? "") });
  }
  return outcome;
}

/** Responsável padrão da tarefa sugerida: o gerente do projeto (TAP), se houver. */
export const defaultResponsible = (model: ProjectModel) => model.charter.managerId;
