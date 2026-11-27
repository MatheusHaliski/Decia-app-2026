/**
 * Curadoria dos pacotes de profissão nas telas (auditoria de 27/11/2026). O dado é curado por `scripts/career/curar-pacotes.mjs`
 * (reprodutível; `curation.test.ts` confere as regras em todos os pacotes); aqui ficam as funções puras que as telas usam:
 *  • trilha Carreira — currículo, perfil profissional e plano 30-60-90 são modelos da pessoa, não do trabalho da equipe;
 *  • modelos de ÁREA coerentes com a profissão — os de contratação pública (Lei 14.133: ETP, termo de referência) só aparecem para
 *    profissões em que eles fazem parte do trabalho (Ciências Contábeis, por exemplo, não recebe ETP como modelo da área);
 *  • D-156 — a autonomia que um serviço do pacote pode ter é a mais restritiva entre pessoa, pacote, serviço e consentimento.
 */
import { effectivePersonalPolicy, mostRestrictive, packCeiling, type AiPolicy, type AutonomyMode, type ConsentState } from "@/lib/ai/autonomy";
import type { WorkArea } from "@/lib/tasks/client";
import { packTemplates, type TaskTemplate } from "@/lib/tasks/templates";
import type { AiService, OccupationPack } from "./occupationPack";

/** Profissões em que contratação pública (Lei 14.133/2021) é trabalho da área. */
export const PROCUREMENT_FIELDS: ReadonlySet<string> = new Set(["administracao", "gestao-publica", "direito", "processos-gerenciais"]);

/** Modelo de área de contratação pública (ETP, termo de referência, contratos administrativos). */
export const isProcurementTemplate = (tpl: Pick<TaskTemplate, "tags" | "type">): boolean =>
  tpl.type === "ESTUDO_TECNICO_PRELIMINAR" || (tpl.tags ?? []).some((t) => /14\.133|contratações públicas/i.test(t));

/**
 * Modelos da área para quem tem um campo de estudo escolhido: sem os de contratação pública quando a profissão não lida com eles. Sem
 * campo, todos (a pessoa escolheu só a área).
 */
export function areaTemplatesForField<T extends Pick<TaskTemplate, "tags" | "type">>(templates: readonly T[], fieldCode: string | null | undefined): T[] {
  if (!fieldCode || PROCUREMENT_FIELDS.has(fieldCode)) return [...templates];
  return templates.filter((t) => !isProcurementTemplate(t));
}

/** Trilha Carreira do pacote (currículo, perfil profissional, 30-60-90), na ordem de prioridade. */
export const careerTemplates = (pack: OccupationPack, area: WorkArea): TaskTemplate[] => packTemplates(pack, area, "CARREIRA");

/** Pacote com o teto de autonomia da D-156 aplicado (dado antigo ou adulterado não sobe a autonomia na tela). */
export function withAutonomyCeiling(pack: OccupationPack): OccupationPack {
  const ceiling = packCeiling(pack.system.defaultAutonomy);
  return ceiling === pack.system.defaultAutonomy ? pack : { ...pack, system: { ...pack.system, defaultAutonomy: ceiling } };
}

/**
 * Política efetiva de um serviço de IA do pacote para a pessoa (D-156): o mais restritivo entre o padrão pessoal, o teto do pacote, o
 * modo padrão do serviço e o consentimento (só conta quando o serviço exige um). Serviço que o pacote não configura: MANUAL.
 */
export function servicePolicy(pack: OccupationPack | null | undefined, service: AiService, personDefault: AutonomyMode, consentGranted: boolean): AiPolicy {
  if (!pack) return effectivePersonalPolicy(personDefault, null, null);
  const svc = pack.ai.services.find((s) => s.service === service);
  if (!svc) return effectivePersonalPolicy("MANUAL", null, null);
  const consent: ConsentState = svc.consent ? consentGranted : null;
  return effectivePersonalPolicy(personDefault, mostRestrictive(packCeiling(pack.system.defaultAutonomy), svc.defaultMode), consent);
}
