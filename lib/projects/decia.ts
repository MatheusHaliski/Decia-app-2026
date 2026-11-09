/**
 * Ponte entre a Mesa (GESTÃO) e o DECIA (GOVERNANÇA): as decisões que a governança toma sobre o projeto — portão de fase
 * (avançar, avançar com ressalvas, suspender, encerrar), mudança avaliada pelo comitê (CCB/CAB) e seleção de projetos — nascem
 * como decisões estruturadas no DECIA, ligadas ao projeto (`projectId` + vínculo de trabalho). Quando a decisão é tomada lá, o
 * resultado volta para a Mesa (`syncFromDecia`). "Governança decide e cobra; gestão planeja e faz" (aula de Governança de TI, TE1).
 */
import { addAlternative, createDecision } from "@/lib/decia/commands";
import type { DecisionRepository } from "@/lib/decia/repository";
import type { DecisionAggregate } from "@/lib/decia/types";
import type { ProjectCommand } from "./commands";
import type { ChangeRequest, GateOutcome, ProjectModel, ProjectPhase } from "./types";

/** Alternativas padrão, na ordem dos rótulos A, B, C, D que o DECIA atribui. Conteúdo do usuário (pt-BR), editável lá. */
export const GATE_ALTERNATIVES: readonly { title: string; outcome: GateOutcome }[] = [
  { title: "Avançar para a próxima fase", outcome: "APROVADO" },
  { title: "Avançar com ressalvas registradas", outcome: "APROVADO_COM_RESSALVAS" },
  { title: "Suspender e corrigir os critérios de saída", outcome: "SUSPENSO" },
  { title: "Encerrar o projeto (inclusive cancelamento formal)", outcome: "ENCERRADO" },
];
export const CHANGE_ALTERNATIVES: readonly { title: string; status: "APROVADA" | "REJEITADA" | "EM_ANALISE" }[] = [
  { title: "Aprovar a mudança e atualizar a linha de base", status: "APROVADA" },
  { title: "Rejeitar a mudança", status: "REJEITADA" },
  { title: "Adiar para nova análise de impacto", status: "EM_ANALISE" },
];
/** Seleção e priorização no portfólio (aula de Governança: business case, GUT, AHP/scoring) — decisão da governança (EDM). */
export const SELECTION_ALTERNATIVES: readonly { title: string }[] = [
  { title: "Priorizar agora no portfólio de TI" },
  { title: "Priorizar no próximo ciclo de planejamento (PDTIC)" },
  { title: "Não priorizar: devolver a demanda com parecer" },
];
const LABELS = ["A", "B", "C", "D", "E", "F"];
const DECIDED = new Set(["DECIDIDA", "EM_EXECUCAO", "RESOLVIDA", "REVISADA"]);

function linkToProject(agg: DecisionAggregate, project: ProjectModel, actorId: string, now: Date): DecisionAggregate {
  return {
    ...agg,
    decision: { ...agg.decision, projectId: project.id },
    workLinks: [...agg.workLinks, { id: `wl-${agg.decision.id}`, targetType: "PROJETO", targetId: project.id, label: project.title, createdByUserId: actorId, createdAt: now.toISOString() }],
  };
}

/** Abre no DECIA a decisão do portão da fase; devolve o id e os comandos para a Mesa registrar o vínculo. */
export function openGateDecision(repo: DecisionRepository, project: ProjectModel, phase: ProjectPhase, phaseLabel: string, actorId: string, now = new Date()): { decisionId: string; commands: ProjectCommand[] } {
  const owner = project.charter.sponsorId ?? actorId;
  let agg = createDecision({
    question: `Aprovar a saída da fase ${phaseLabel} do projeto "${project.title}"?`, complexity: "PADRAO", impact: "ALTO", kind: "ESTRATEGICA", templateKey: "portao", ownerUserId: owner,
  }, now);
  for (const alt of GATE_ALTERNATIVES) agg = addAlternative(agg, { title: alt.title }, owner, now);
  agg = linkToProject(agg, project, actorId, now);
  repo.save(agg);
  return { decisionId: agg.decision.id, commands: [{ type: "GATE_SET", phase, outcome: "PENDENTE", decisionId: agg.decision.id }, { type: "LINK_DECISION", decisionId: agg.decision.id }] };
}

/** Leva a mudança ao comitê (CCB/CAB) no DECIA, com os critérios das seis restrições. */
export function openChangeDecision(repo: DecisionRepository, project: ProjectModel, change: ChangeRequest, actorId: string, now = new Date()): { decisionId: string; commands: ProjectCommand[] } {
  const owner = project.charter.sponsorId ?? actorId;
  let agg = createDecision({
    question: `Aprovar a mudança ${change.code} — ${change.title}?`, complexity: "PADRAO", impact: change.impact.cost > 0 || change.impact.scheduleDays > 0 ? "ALTO" : "MEDIO",
    kind: "OPERACIONAL", templateKey: "mudanca", ownerUserId: owner,
  }, now);
  for (const alt of CHANGE_ALTERNATIVES) agg = addAlternative(agg, { title: alt.title }, owner, now);
  agg = linkToProject(agg, project, actorId, now);
  repo.save(agg);
  const cmds: ProjectCommand[] = [{ type: "LINK_DECISION", decisionId: agg.decision.id }];
  if (change.status === "SOLICITADA") cmds.unshift({ type: "CHANGE_SET_STATUS", id: change.id, status: "EM_ANALISE", decisionId: agg.decision.id });
  return { decisionId: agg.decision.id, commands: cmds };
}

/** Leva a seleção/priorização do projeto ao DECIA (critérios do modelo "selecao": VPL, alinhamento, risco, rapidez). */
export function openSelectionDecision(repo: DecisionRepository, project: ProjectModel, actorId: string, now = new Date()): { decisionId: string; commands: ProjectCommand[] } {
  const owner = project.charter.sponsorId ?? actorId;
  let agg = createDecision({
    question: `Priorizar o projeto "${project.title}" no portfólio de TI?`, complexity: "PADRAO", impact: "ALTO", kind: "ESTRATEGICA", templateKey: "selecao", ownerUserId: owner,
  }, now);
  for (const alt of SELECTION_ALTERNATIVES) agg = addAlternative(agg, { title: alt.title }, owner, now);
  agg = linkToProject(agg, project, actorId, now);
  repo.save(agg);
  return { decisionId: agg.decision.id, commands: [{ type: "LINK_DECISION", decisionId: agg.decision.id }] };
}

const selectedLabel = (agg: DecisionAggregate) => agg.alternatives.find((a) => a.id === agg.decision.selectedAlternativeId)?.label;

/** Resultado do portão a partir da decisão já tomada no DECIA (ou `null` se ainda não decidida). */
export function gateOutcomeOf(agg: DecisionAggregate): GateOutcome | null {
  if (!DECIDED.has(agg.decision.status)) return null;
  const idx = LABELS.indexOf(selectedLabel(agg) ?? "");
  return GATE_ALTERNATIVES[idx]?.outcome ?? null;
}

export function changeStatusOf(agg: DecisionAggregate): "APROVADA" | "REJEITADA" | "EM_ANALISE" | null {
  if (!DECIDED.has(agg.decision.status)) return null;
  const idx = LABELS.indexOf(selectedLabel(agg) ?? "");
  return CHANGE_ALTERNATIVES[idx]?.status ?? null;
}

/** Comandos que trazem para a Mesa as decisões tomadas no DECIA (portões e mudanças ainda pendentes aqui). */
export function syncFromDecia(project: ProjectModel, decisions: readonly DecisionAggregate[]): ProjectCommand[] {
  const byId = new Map(decisions.map((d) => [d.decision.id, d]));
  const cmds: ProjectCommand[] = [];
  for (const g of project.gates) {
    if (g.outcome !== "PENDENTE" || !g.decisionId) continue;
    const agg = byId.get(g.decisionId);
    const outcome = agg ? gateOutcomeOf(agg) : null;
    if (outcome) cmds.push({ type: "GATE_SET", phase: g.phase, outcome, decisionId: g.decisionId, notes: agg?.decision.rationale });
  }
  for (const c of project.changes) {
    if (!c.decisionId || (c.status !== "EM_ANALISE" && c.status !== "SOLICITADA")) continue;
    const agg = byId.get(c.decisionId);
    const status = agg ? changeStatusOf(agg) : null;
    if (!status || status === "EM_ANALISE") continue;
    if (c.status === "SOLICITADA") cmds.push({ type: "CHANGE_SET_STATUS", id: c.id, status: "EM_ANALISE", decisionId: c.decisionId });
    cmds.push({ type: "CHANGE_SET_STATUS", id: c.id, status, decisionId: c.decisionId });
  }
  return cmds;
}
