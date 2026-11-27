/**
 * Pontos de partida do "Criar projeto" pela profissão preferida (auditoria 27/11/2026: um engenheiro civil não deve nascer com projeto
 * de TI, com PEI/PDTIC e COBIT). A área do projeto vem da categoria da profissão (`occupationArea`) e o modelo, da área: obra de
 * engenharia, contratação, ato normativo (jurídico), TI; nas demais áreas, serviço/processo ou projeto genérico. Só TI recebe a
 * governança específica de TI (`isItProject`). Funções puras: a profissão não sai da tela da própria pessoa (D-147).
 */
import { occupationArea } from "@/lib/career/categories";
import { KIND_APPROACH } from "@/lib/projects/autopilot/recipes";
import { templateKind, type ProjectTemplateId } from "@/lib/projects/autopilot/proposal";
import { projectAreaOf, type Approach, type ProjectArea } from "@/lib/projects/types";

export const TEMPLATE_BY_AREA: Readonly<Record<ProjectArea, ProjectTemplateId>> = {
  SOFTWARE: "tipo-ti",
  ENGENHARIA: "tipo-obra",
  ADMINISTRACAO: "tipo-aquisicao",
  JURIDICO: "tipo-normativo",
  PLANEJAMENTO: "tipo-servico",
  DESIGN: "tipo-outra",
  PESQUISA: "tipo-outra",
  MARKETING: "tipo-outra",
  OUTRA: "tipo-outra",
};

export interface ProjectDefaults {
  /** área do projeto em branco */
  area: ProjectArea;
  approach: Approach;
  /** modelo pré-selecionado */
  template: ProjectTemplateId;
  /** `true` quando veio da profissão preferida (a tela avisa "a partir da sua profissão — só você vê") */
  fromOccupation: boolean;
}

/** Sem profissão: o padrão de antes (TI, híbrida). */
export const GENERIC_DEFAULTS: ProjectDefaults = { area: "SOFTWARE", approach: "HIBRIDO", template: "tipo-ti", fromOccupation: false };

export function projectDefaultsFor(occupation: string | null | undefined): ProjectDefaults {
  const area = projectAreaOf(occupationArea(occupation));
  if (!area) return GENERIC_DEFAULTS;
  const template = TEMPLATE_BY_AREA[area];
  const kind = templateKind(template);
  return { area, approach: kind ? KIND_APPROACH[kind] : "HIBRIDO", template, fromOccupation: true };
}

/**
 * Área final de um projeto criado por modelo: os modelos genéricos (serviço, projeto genérico) herdam a área da profissão quando ela
 * existe; os específicos (TI, obra, contratação, normativo, capacitação) mantêm a área do próprio modelo.
 */
export function templateAreaOverride(template: ProjectTemplateId, defaults: ProjectDefaults): ProjectArea | null {
  if (!defaults.fromOccupation || defaults.area === "SOFTWARE") return null;
  return template === "tipo-outra" || template === "tipo-servico" ? defaults.area : null;
}
