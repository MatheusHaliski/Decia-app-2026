/**
 * "Enviar à aprovação" (RF31.CA03): o cenário escolhido vira uma SOLICITAÇÃO DE MUDANÇA normal pelo caminho que já existe na Mesa
 * (`CHANGE_REQUEST` em commands.ts) e é levado ao comitê (CCB/CAB) no DECIA (`openChangeDecision` em decia.ts). O cronograma e o
 * orçamento do projeto NÃO mudam: só depois da aprovação a equipe implementa (Controle › Implementar), como em qualquer mudança.
 *
 * O impacto nas seis restrições sai do motor (números do cenário menos os da linha de base); os níveis 0–5 seguem regras fixas,
 * mostradas na tela: escopo e recursos pela fração afetada (≤ 5 % → 1, ≤ 10 % → 2, ≤ 20 % → 3, ≤ 35 % → 4, acima → 5); riscos
 * pelos riscos NOVOS (crítico vale 2, atenção 1, até 5); qualidade não é simulada (0).
 */
import type { CommandResult, ProjectCommand } from "../commands";
import type { ChangeImpact, ChangeRequest, ProjectModel, SevenRs } from "../types";
import type { Outcome, ScenarioResult } from "./engine";

/** Nível 0–5 a partir da fração afetada (0 = nada mudou). */
export function impactLevel(ratio: number): number {
  if (!(ratio > 0)) return 0;
  if (ratio <= 0.05) return 1;
  if (ratio <= 0.1) return 2;
  if (ratio <= 0.2) return 3;
  if (ratio <= 0.35) return 4;
  return 5;
}

export function approvalImpact(r: ScenarioResult, base: Outcome): ChangeImpact {
  const open = base.model.tasks.filter((t) => t.status !== "CONCLUIDA" && !t.milestone).length;
  const riskPoints = r.risks.filter((x) => x.isNew).reduce((s, x) => s + (x.severity === "CRITICO" ? 2 : 1), 0);
  return {
    scope: impactLevel(r.scopeChange / Math.max(1, base.cost.approvedBac)),
    scheduleDays: Math.round(r.deltas.finishDays * 10) / 10,
    cost: Math.round(r.deltas.eacBrl),
    quality: 0,
    resources: impactLevel(open ? r.resourceHit.length / open : 0),
    risk: Math.min(5, riskPoints),
  };
}

/** O comando existente que abre a solicitação de mudança (tipo NORMAL: decide o comitê). */
export function approvalCommand(r: ScenarioResult, base: Outcome, texts: { title: string; sevenRs: SevenRs }): Extract<ProjectCommand, { type: "CHANGE_REQUEST" }> {
  return { type: "CHANGE_REQUEST", title: texts.title, changeType: "NORMAL", impact: approvalImpact(r, base), sevenRs: texts.sevenRs };
}

export type SubmitResult =
  | { ok: true; changeId: string; changeCode: string; decisionId: string }
  | { ok: false; error: string };

/**
 * Abre a mudança e a leva ao comitê: `CHANGE_REQUEST` → `openChange` (DECIA) → os comandos que a ponte devolve (mudança em análise
 * ligada à decisão, vínculo da decisão no projeto). Nada no plano muda.
 */
export function submitForApproval(
  dispatch: (cmd: ProjectCommand) => CommandResult,
  r: ScenarioResult,
  base: Outcome,
  texts: { title: string; sevenRs: SevenRs },
  openChange: (model: ProjectModel, change: ChangeRequest) => { decisionId: string; commands: ProjectCommand[] },
): SubmitResult {
  const created = dispatch(approvalCommand(r, base, texts));
  if (!created.ok) return { ok: false, error: created.error };
  const code = String(created.vars?.code ?? "");
  const change = created.model.changes.find((c) => c.code === code);
  if (!change) return { ok: false, error: "NAO_ENCONTRADO" };
  const opened = openChange(created.model, change);
  for (const cmd of opened.commands) dispatch(cmd);
  return { ok: true, changeId: change.id, changeCode: code, decisionId: opened.decisionId };
}
