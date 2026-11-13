/**
 * "Usar este modelo" (RF40.CA04, `LicenseEnforcer.copy`): o que cada licença entrega. Tarefa com COPIA_LIVRE vira rascunho do
 * criador igual ao modelo; com ATRIBUICAO, o rascunho leva a linha de crédito ao autor no fim do roteiro; SOMENTE_LEITURA não copia
 * (consulta como referência). Projeto abre a Mesa do projeto de origem e o Autopiloto por link (copiar projeto é do RF22/RF30).
 * Kit entrega um rascunho por tarefa. O rascunho chega ao criador por `saveTaskDraft` + `draftHref` (lib/tasks/drafts).
 */
import { AREA_TEMPLATES } from "@/lib/tasks/areaTemplates";
import { AREA_EXTENSIONS } from "@/lib/tasks/client";
import type { TaskDraft, TaskTemplate } from "@/lib/tasks/templates";
import type { ModelOffer } from "./types";

export const templateById = (id: string): TaskTemplate | undefined => AREA_TEMPLATES.find((t) => t.id === id);

/** Modelos de tarefa por trás da oferta (tarefa: 1; kit: os do kit; projeto: nenhum). */
export function templatesOf(offer: Pick<ModelOffer, "source">): TaskTemplate[] {
  if (offer.source.type === "TASK_TEMPLATE") return [templateById(offer.source.templateId)].filter((t): t is TaskTemplate => !!t);
  if (offer.source.type === "KIT") return offer.source.templateIds.map(templateById).filter((t): t is TaskTemplate => !!t);
  return [];
}

/** A licença permite copiar para um rascunho editável? */
export const licenseCopies = (offer: Pick<ModelOffer, "license">) => offer.license !== "SOMENTE_LEITURA";

/** Rascunho do criador a partir do modelo; `attribution` (já traduzida) vai no fim do roteiro quando a licença pede crédito. */
export function draftFromTemplate(tpl: TaskTemplate, offer: Pick<ModelOffer, "license">, attribution: string | null): Partial<TaskDraft> {
  const allowed = new Set(AREA_EXTENSIONS[tpl.area]);
  const extensions: Record<string, string> = {};
  for (const [k, v] of Object.entries(tpl.extensions)) if (allowed.has(k) && v) extensions[k] = v;
  const credit = offer.license === "ATRIBUICAO" && attribution ? `\n\n---\n${attribution}` : "";
  return {
    title: tpl.title,
    type: tpl.type,
    area: tpl.area,
    objective: tpl.objective,
    descriptionMd: tpl.descriptionMd + credit,
    ...(tpl.priority ? { priority: tpl.priority } : {}),
    deliverables: [...tpl.deliverables],
    criteria: [...tpl.criteria],
    references: tpl.references.map((r) => ({ ...r })),
    extensions,
  };
}

/** Seções (`## `) do roteiro, para a prévia. */
export const sectionsOf = (md: string) => md.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());

export const projectDeskHref = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/edit`;
export const AUTOPILOT_HREF = "/autopilot";
export const modelHref = (offerId: string) => `/models?modelo=${encodeURIComponent(offerId)}`;
