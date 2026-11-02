/**
 * Pacote de domínio por família de ocupação (RF75.CA19; GUIA_DE_CARREIRA §4.6): o que a profissão preferida
 * (`User.preferredOccupation`) carrega para o Guia de Carreira (RF75) e a Análise de Perfil (RF50) — escopo, vocabulário,
 * competências, variantes das perguntas do guia, tarefas-guia L1–L10/D1–D10 parametrizadas, rubrica, contexto e serviços da
 * IA (RF43 capabilities, RF51 modos), configurações do Work Station, fontes de mercado e caminhos vizinhos. É dado
 * versionado (`contracts/career/occupation-packs/*.json`, esquema `contracts/career/occupation-pack.schema.json`), não
 * código: adicionar uma profissão é acrescentar um arquivo. Estes tipos espelham o esquema; `career.test.ts` garante que as
 * listas fechadas daqui e do esquema são as mesmas.
 */
import type { AutonomyMode, AiAction } from "@/lib/ai/autonomy";

export const GENERIC_PACK_CODE = "generico";
export const PACK_STATUSES = ["pesquisa", "revisado", "ativo"] as const;
export type PackStatus = (typeof PACK_STATUSES)[number];

/** Catálogo de tarefas-guia (GUIA_DE_CARREIRA §7): L = Letters, D = Drawings. */
export const GUIDED_TASK_CODES = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"] as const;
export type GuidedTaskCode = (typeof GUIDED_TASK_CODES)[number];
/** Tarefas que só fazem sentido no computador (d4; §7.3). */
export const COMPUTER_ONLY_TASKS: readonly GuidedTaskCode[] = ["D3", "D8"];

/** Serviços de IA que um pacote configura; cada um mapeia para uma capability do RF43 e um modo padrão do RF51. */
export const AI_SERVICES = [
  "PERGUNTAS_GUIA", "SUGESTAO_TAREFAS", "PLANO_SEMANAL", "PRE_CHECAGEM_RUBRICA", "RASCUNHO_LETTERS", "APOIO_DRAWINGS",
  "ANALISE_PERFIL", "CAMINHOS_DE_CARREIRA", "PESSOAS_SEMELHANTES", "EXPLICACAO_POR_QUE", "RESUMO_PROFISSIONAL", "IMPORTAR_CURRICULO",
] as const;
export type AiService = (typeof AI_SERVICES)[number];
/** Capabilities do AiGateway (RF43). */
export const AI_CAPABILITIES = ["ARTEFATO", "INSIGHT", "PREENCHER_TAREFA", "MEMORIA_BUSCA", "AUTOPILOT_PROJETO", "CAPA_IA"] as const;
export type AiCapability = (typeof AI_CAPABILITIES)[number];
export const AI_ACTIONS = ["SUGESTAO_ESPONTANEA", "RESPONDER", "PROPOR_ALTERACAO", "APLICAR_ALTERACAO", "EXECUTAR_PASSO"] as const satisfies readonly AiAction[];
/** Finalidades de consentimento (ConsentPurpose; GUIA_DE_CARREIRA e ANALISE_PERFIL_IA planejadas). */
export const PACK_CONSENTS = ["RESUMO_PROFISSIONAL_IA", "GUIA_DE_CARREIRA", "ANALISE_PERFIL_IA"] as const;
export type PackConsent = (typeof PACK_CONSENTS)[number];
export const DRAWINGS_MODES = ["2d-tecnico", "3d", "diagrama", "infografico", "prancha", "wireframe"] as const;
export type DrawingsMode = (typeof DRAWINGS_MODES)[number];
export const LETTERS_TEMPLATES = [
  "curriculo", "carta", "estudo-de-caso", "relatorio-tecnico", "post", "bio", "pop", "proposta", "plano-30-60-90", "revisao",
  "parecer", "memorial", "laudo", "artigo", "plano-de-aula", "roteiro", "relatorio-de-caso", "projeto-de-pesquisa",
] as const;
export type LettersTemplate = (typeof LETTERS_TEMPLATES)[number];
export const RELEVANCES = ["alta", "media", "baixa"] as const;
export type Relevance = (typeof RELEVANCES)[number];

export interface LocalizedLabel { "pt-BR": string; en: string; es: string }
export interface Coded { code: string; title: string }
export interface EscoRef { uri: string; label: string }
export interface SourceRef { title: string; url: string; accessedAt: string }

export interface OptionsQuestion { prompt: string; options: string[]; why: string }
export interface ExtraQuestion { id: string; prompt: string; type: "sim-nao" | "escolha" | "texto" | "lista"; options: string[]; why: string; where: "P" | "X" | "S" }
export interface TaskParams {
  title: string;
  brief: string;
  parameters: Record<string, string | number | boolean | string[]>;
  criteria: string[];
  evidence: string;
  time: string;
  level: 1 | 2 | 3;
}
export interface CustomTask { id: string; editor: "letters" | "drawings"; title: string; competency: string; criteria: string[]; evidence: string; time: string; trigger: string; level: 1 | 2 | 3 }
export interface ObjectiveCriterion { id: string; check: string; appliesTo: string[]; auto: boolean }
export interface SubjectiveCriterion { id: string; label: string; levels: { aproxima: string; atende: string; supera: string } }
export interface PackService { service: AiService; capability: AiCapability; defaultMode: AutonomyMode; action: AiAction; consent: PackConsent | null; note: string }
export interface MarketSource { title: string; url: string; geography: string; cadence: "mensal" | "trimestral" | "anual" | "continua" | "eventual"; kind: "estatistica-oficial" | "conselho" | "associacao" | "pesquisa" | "edital" }
export interface CareerPath { to: string; why: string; gaps: string[]; steps: string[] }
export interface LearningResource { title: string; provider: string; url: string; free: boolean; kind: "curso" | "norma" | "livro" | "comunidade" | "certificacao" | "portal" }

export interface OccupationPack {
  schemaVersion: 1;
  code: string;
  version: string;
  status: PackStatus;
  generatedAt: string;
  label: LocalizedLabel;
  /** Códigos do catálogo de ramos (`academicFields.ts`) servidos por este pacote; vazio só no genérico. */
  fields: string[];
  family: { cbo: Coded[]; isco08: Coded[]; esco: EscoRef[] };
  scope: { summary: string; entryRoles: string[]; midRoles: string[]; seniorRoles: string[]; sectors: string[]; regulation: { name: string; issuer: string; about: string }[] };
  vocabulary: { terms: { term: string; meaning: string }[]; tools: string[]; deliverables: string[] };
  competencies: { core: { label: string; esco: EscoRef | null; kind: "nucleo" | "apoio" }[]; transversal: string[]; tracks: { id: string; label: string; steps: string[] }[] };
  questions: {
    a4?: { hint: string; cboFamilies: string[]; why: string };
    b9?: { levels: Record<"primeiro-emprego" | "junior" | "pleno" | "senior" | "gestao", string>; why: string };
    c2: OptionsQuestion;
    c4?: { certifications: string[]; languages: string[]; why: string };
    c5: OptionsQuestion;
    extra: ExtraQuestion[];
    interestTestWhenUnknown: boolean;
  };
  guidedTasks: { priority: GuidedTaskCode[]; excluded: { code: GuidedTaskCode; reason: string }[]; parameters: Partial<Record<GuidedTaskCode, TaskParams>>; custom: CustomTask[] };
  rubric: { objective: ObjectiveCriterion[]; subjective: SubjectiveCriterion[] };
  ai: {
    contextSnippet: string;
    citeSources: { title: string; url: string; kind: "norma" | "conselho" | "orgao-publico" | "estatistica" | "educacao" | "comunidade" | "referencia" }[];
    services: PackService[];
    dataScope: { default: string[]; optional: string[]; never: string[] };
    provider: { default: "local" | "externo"; externalNeedsConsent: true; externalAllowedFor: AiService[] };
    guardrails: string[];
  };
  system: {
    editors: { letters: Relevance; drawings: Relevance };
    drawingsModes: DrawingsMode[];
    lettersTemplates: LettersTemplate[];
    defaultAutonomy: AutonomyMode;
    deviceNotes: string;
    nudges: { cadence: "diaria" | "semanal"; examples: string[] };
    insights: { peersBy: ("cbo" | "esco" | "competencias" | "setor")[] };
    privacy: { sensitiveData: string[]; publicByDefault: false };
  };
  market: { sources: MarketSource[]; claimsPolicy: string };
  paths: CareerPath[];
  learning: LearningResource[];
  sources: SourceRef[];
  naoConferido: string[];
}

export type Device = "celular" | "computador";

/** Pacote da profissão preferida; sem profissão ou sem pacote para ela, o genérico (CA19: "sem o campo, vale o pacote genérico"). */
export function packForField(fieldCode: string | null | undefined, packs: readonly OccupationPack[]): OccupationPack | undefined {
  const own = fieldCode ? packs.find((p) => p.fields.includes(fieldCode)) : undefined;
  return own ?? packs.find((p) => p.code === GENERIC_PACK_CODE);
}

/** Composição do prompt (E6): base + trecho do pacote, com a profissão nomeada para a explicação "por que" citar o campo usado. */
export function composeAiContext(base: string, pack: OccupationPack): string {
  return `${base.trim()}\n\n[Profissão preferida: ${pack.label["pt-BR"]}; pacote ${pack.code} v${pack.version}]\n${pack.ai.contextSnippet.trim()}`;
}

/** Ordem das tarefas-guia para o plano: prioridade do pacote, sem as excluídas e, no celular, sem D3/D8 (d4). */
export function plannedTasks(pack: OccupationPack, device: Device): GuidedTaskCode[] {
  const excluded = new Set(pack.guidedTasks.excluded.map((e) => e.code));
  return pack.guidedTasks.priority.filter((c) => !excluded.has(c) && (device === "computador" || !COMPUTER_ONLY_TASKS.includes(c)));
}

/** Serviço do pacote (modo padrão, capability, consentimento), ou `undefined` quando a profissão não o configura. */
export function serviceConfig(pack: OccupationPack, service: AiService): PackService | undefined {
  return pack.ai.services.find((s) => s.service === service);
}

/** Critérios que a IA pré-checa para uma tarefa (RF75.CA06: só os objetivos marcados `auto`). */
export function autoChecks(pack: OccupationPack, task: GuidedTaskCode | string): ObjectiveCriterion[] {
  return pack.rubric.objective.filter((c) => c.auto && c.appliesTo.includes(task));
}
