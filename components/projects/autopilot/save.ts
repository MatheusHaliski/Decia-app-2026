/**
 * Salvar a proposta do Autopiloto (RF30.CA04): vira o `ProjectModel` da Mesa (versão 1 "Gerado pelo Autopiloto a partir de …",
 * origem AUTOPILOTO com crédito aos modelos) e entra no repositório — no DEMO, a memória desta aba.
 */
import { newProjectId, proposalToProject, type ProjectProposal } from "@/lib/projects/autopilot/proposal";
import type { ProjectRepository } from "@/lib/projects/repository";
import type { ProjectModel } from "@/lib/projects/types";

export type SaveProposalResult = { ok: true; id: string; model: ProjectModel } | { ok: false; error: "JA_EXISTE" | "VALOR_INVALIDO" | "SEM_CRIACAO" };

export function saveProposal(repo: ProjectRepository, proposal: ProjectProposal, ctx: { actorId: string; now: Date }): SaveProposalResult {
  if (!repo.create) return { ok: false, error: "SEM_CRIACAO" };
  const id = newProjectId("ap", ctx.now);
  const model = proposalToProject(proposal, { id, actorId: ctx.actorId, now: ctx.now });
  const r = repo.create(model);
  return r.ok ? { ok: true, id, model: r.model } : { ok: false, error: r.error };
}
