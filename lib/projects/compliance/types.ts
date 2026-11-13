/**
 * Espelho de Conformidade (RF32) — tipos do catálogo de checklists e do resultado da verificação.
 *
 * Um checklist (`ComplianceChecklist` do README) tem fonte (federal, estadual, municipal ou do departamento), base legal e itens.
 * Cada item diz em que fase se aplica, em que tipo de projeto vale (`appliesTo`), se é obrigatório ou recomendado e qual REGRA
 * determinística confere a estrutura do projeto (`rule`). Nada aqui chama IA: a verificação é uma função pura (D-12).
 */
import type { WorkspaceTab } from "../metrics";
import type { ProjectArea, ProjectPhase } from "../types";

export const CHECKLIST_SOURCES = ["FEDERAL", "ESTADUAL", "MUNICIPAL", "DEPARTAMENTO"] as const;
export type ChecklistSource = (typeof CHECKLIST_SOURCES)[number];

export type Requirement = "OBRIGATORIO" | "RECOMENDADO";
export const ITEM_STATUSES = ["ATENDIDO", "PARCIAL", "FALTANDO", "NAO_SE_APLICA"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Sinais do projeto que decidem se um item se aplica (detectados nos textos e na área do projeto, com a evidência). */
export const SIGNALS = ["CONTRATACAO", "DADOS_PESSOAIS", "DADOS_SENSIVEIS", "SISTEMA_DIGITAL", "OBRA_OU_ESPACO"] as const;
export type Signal = (typeof SIGNALS)[number];

export type Applicability =
  | { kind: "SEMPRE" }
  | { kind: "SINAL"; signal: Signal }
  | { kind: "AREA"; areas: ProjectArea[] }
  | { kind: "TODOS"; of: Applicability[] };

/**
 * Regras (lista fechada). ARTEFATO: existe atividade com as palavras-chave numa das fases, com responsável? MARCO: existe marco
 * com as palavras na fase? RISCO: há risco registrado com as palavras, com resposta e dono (ou atividade de análise na fase)?
 * ORCAMENTO: há linha de orçamento com as palavras? PORTOES_NO_DECIA: os portões decididos têm decisão registrada no DECIA?
 * LICOES: lições em pelo menos N fases? REVISAO: entregas concluídas revisadas por outra pessoa? OBJETIVO_ALINHADO: algum
 * objetivo do projeto aponta para uma meta do PEI/PDTIC/BSC?
 */
export type Rule =
  | { kind: "ARTEFATO"; keywords: string[]; phases: ProjectPhase[]; needsResponsible?: boolean }
  | { kind: "MARCO"; keywords: string[]; phases: ProjectPhase[] }
  | { kind: "RISCO"; keywords: string[]; taskKeywords?: string[]; phases?: ProjectPhase[] }
  | { kind: "ORCAMENTO"; keywords: string[] }
  | { kind: "PORTOES_NO_DECIA" }
  | { kind: "LICOES"; minPhases: number }
  | { kind: "REVISAO" }
  | { kind: "OBJETIVO_ALINHADO"; source: "PEI" | "PDTIC" | "BSC" };
export type RuleKind = Rule["kind"];
export const RULE_KINDS: readonly RuleKind[] = ["ARTEFATO", "MARCO", "RISCO", "ORCAMENTO", "PORTOES_NO_DECIA", "LICOES", "REVISAO", "OBJETIVO_ALINHADO"];
/** Regras que a tarefa técnica sugerida resolve (as outras se corrigem numa aba da Mesa). */
export const TASK_RULES: ReadonlySet<RuleKind> = new Set<RuleKind>(["ARTEFATO", "MARCO", "RISCO"]);

export interface ComplianceItem {
  id: string;
  /** código curto (vai entre colchetes no título da tarefa criada, como referência ao item) */
  code: string;
  checklistId: string;
  /** texto do item: chave i18n (catálogo do sistema) ou texto livre (checklist do departamento) */
  titleKey?: string;
  title?: string;
  whyKey?: string;
  why?: string;
  /** base legal com número e ano (dado; o texto da lei não é traduzido) ou chave i18n da diretriz de exemplo */
  basis?: string;
  basisKey?: string;
  /** fase em que o item se aplica (é nela que a tarefa sugerida nasce) */
  phase: ProjectPhase;
  requirement: Requirement;
  appliesTo: Applicability;
  rule: Rule;
  /** tarefa técnica sugerida quando falta (título por chave i18n ou texto) */
  suggestion?: { titleKey?: string; title?: string; durationDays: number; milestone?: boolean };
  /** aba da Mesa onde se corrige o que não se resolve com uma tarefa */
  fixTab?: WorkspaceTab;
}

export interface ComplianceChecklist {
  id: string;
  source: ChecklistSource;
  nameKey?: string;
  name?: string;
  basis?: string;
  basisKey?: string;
  /** diretriz de EXEMPLO (estadual/municipal): o órgão substitui pela sua norma */
  example: boolean;
  version: string;
  items: ComplianceItem[];
}

export type EvidenceKind = "TASK" | "WBS" | "REQ" | "RISK" | "BUDGET" | "CHARTER" | "STK" | "LESSON" | "GATE" | "GOAL" | "AREA" | "NEED";
export interface Evidence {
  kind: EvidenceKind;
  id: string;
  code?: string;
  /** texto do projeto como está (dado do usuário) ou valor de enum (AREA, GATE) */
  label: string;
  phase?: ProjectPhase;
  responsibleId?: string;
  /** a atividade está numa das fases esperadas? */
  inPhase?: boolean;
  /** ligada ao item pela tarefa sugerida (referência gravada no Espelho) */
  linked?: boolean;
}

export type ReasonCode =
  | "ATENDIDO" | "FASE_ERRADA" | "SEM_RESPONSAVEL" | "SO_MENCAO" | "NAO_E_MARCO" | "FALTANDO"
  | "NA_SINAL" | "NA_AREA" | "NA_MARCADO"
  | "RISCO_SEM_RESPOSTA" | "ORCAMENTO_FALTANDO"
  | "PORTOES_TODOS" | "PORTOES_PARCIAL" | "PORTOES_SEM_DECISAO" | "PORTOES_NENHUM"
  | "LICOES_OK" | "LICOES_POUCAS" | "LICOES_NENHUMA"
  | "REVISAO_OK" | "REVISAO_PARCIAL" | "REVISAO_NENHUMA" | "REVISAO_SEM_ENTREGAS"
  | "META_LIGADA" | "META_SEM_LIGACAO" | "META_INEXISTENTE";

export interface Waiver { itemId: string; reason: string; by: string; at: string }
/** Referência gravada quando a tarefa sugerida é criada (o `TaskItem.checklistItemId` do README, enquanto a Mesa não tem o campo). */
export interface TaskLink { taskId: string; itemId: string; by: string; at: string }

export interface ItemResult {
  item: ComplianceItem;
  source: ChecklistSource;
  example: boolean;
  status: ItemStatus;
  reason: { code: ReasonCode; vars: Record<string, string | number> };
  evidence: Evidence[];
  /** obrigatório e faltando: bloqueia a passagem para a Aprovação sem justificativa do chefe (RF32.CA04) */
  blocking: boolean;
  /** a tarefa técnica sugerida resolve a lacuna */
  canSuggest: boolean;
  /** atividade com as palavras-chave numa fase errada: pode ser movida para a fase do item */
  moveTaskId?: string;
  waiver?: Waiver;
}

export interface Score { applicable: number; met: number; partial: number; missing: number; notApplicable: number; percent: number | null }

export interface SignalResult { signal: Signal; on: boolean; evidence: Evidence[] }

export interface MirrorResult {
  catalogVersion: string;
  signals: Record<Signal, SignalResult>;
  items: ItemResult[];
  score: Score;
  bySource: Record<ChecklistSource, Score>;
  byPhase: Record<ProjectPhase, Score>;
  blocking: ItemResult[];
}

export interface MirrorContext {
  checklists?: readonly ComplianceChecklist[];
  waivers?: Readonly<Record<string, Waiver>>;
  links?: readonly TaskLink[];
}
