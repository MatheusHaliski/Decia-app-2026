/**
 * Base acadêmica do quadro por fases (aulas de Gestão de Projetos de TI e de Governança de TI — PUCPR BSI 2026, foco ENADE;
 * PMBOK 5/6/7, Scrum Guide, COBIT 5/2019, ISO/IEC 38500, ITIL, Guia de PDTIC do SISP).
 *
 * Três ideias organizam o quadro:
 *  1. **Grupo de processos ≠ fase do ciclo de vida.** As colunas são FASES (as 7 institucionais da SECID ou as clássicas); em cada
 *     fase os 5 grupos de processos se repetem — por isso cada coluna mostra o grupo DOMINANTE, não "o" grupo.
 *  2. **Monitoramento e controle é transversal**: não é coluna, é a faixa que atravessa todas as fases (valor agregado, mudanças,
 *     riscos, lições aprendidas ao longo do projeto).
 *  3. **Cada fase termina num portão (phase gate)** com critério de saída verificável; a decisão de passar é de GOVERNANÇA
 *     (avaliar, dirigir, monitorar — domínio EDM do COBIT / modelo ADM da ISO 38500) e é registrada no DECIA; o trabalho dentro da
 *     fase é GESTÃO (planejar, construir, executar, monitorar — APO, BAI, DSS, MEA).
 */
import type { BoardModel, FlowStatus, ProjectPhase } from "./types";
import { PROJECT_PHASES } from "./types";

export type ProcessGroup = "INICIACAO" | "PLANEJAMENTO" | "EXECUCAO" | "MONITORAMENTO_CONTROLE" | "ENCERRAMENTO";
export const PROCESS_GROUPS: readonly ProcessGroup[] = ["INICIACAO", "PLANEJAMENTO", "EXECUCAO", "MONITORAMENTO_CONTROLE", "ENCERRAMENTO"];

export type KnowledgeArea =
  | "INTEGRACAO" | "ESCOPO" | "CRONOGRAMA" | "CUSTOS" | "QUALIDADE" | "RECURSOS" | "COMUNICACOES" | "RISCOS" | "AQUISICOES" | "PARTES_INTERESSADAS";
export const KNOWLEDGE_AREAS: readonly KnowledgeArea[] = [
  "INTEGRACAO", "ESCOPO", "CRONOGRAMA", "CUSTOS", "QUALIDADE", "RECURSOS", "COMUNICACOES", "RISCOS", "AQUISICOES", "PARTES_INTERESSADAS",
];

export type CobitDomain = "EDM" | "APO" | "BAI" | "DSS" | "MEA";

/** Critério de saída de um portão (avaliado em `metrics.ts`); a chave de i18n é `pm.gate.<id>`. */
export type GateCriterionId =
  | "TAP_APROVADO" | "BUSINESS_CASE_VIAVEL" | "ALINHAMENTO_ESTRATEGICO" | "GUT_AVALIADA" | "PARTES_INTERESSADAS_MAPEADAS"
  | "EAP_REGRA_100" | "CRONOGRAMA_SEM_CICLO" | "RACI_UM_A" | "RISCOS_ANALISADOS" | "RESERVA_COBRE_VME" | "LINHA_DE_BASE"
  | "RASTREABILIDADE_COMPLETA" | "SEM_GOLD_PLATING"
  | "RISCOS_CRITICOS_TRATADOS" | "CONFORMIDADE_AVALIADA"
  | "DECISAO_NO_DECIA"
  | "MUDANCAS_PELO_CCB" | "DESEMPENHO_IDC_IDP" | "ENTREGAS_REVISADAS"
  | "ACEITE_FORMAL" | "LICOES_AO_LONGO" | "CONTRATOS_ENCERRADOS" | "RECURSOS_LIBERADOS" | "ARQUIVAMENTO" | "TRANSICAO_OPERACAO";

/** Critérios de saída que são governança de serviços de TI (ITIL): fora de TI não entram no portão. */
export const IT_ONLY_CRITERIA: ReadonlySet<GateCriterionId> = new Set<GateCriterionId>(["TRANSICAO_OPERACAO"]);

export interface PhaseMeta {
  phase: ProjectPhase;
  /** grupo de processos dominante nesta fase (os outros também ocorrem) */
  dominant: ProcessGroup;
  /** fase clássica do PMBOK a que corresponde */
  classic: "INICIACAO" | "PLANEJAMENTO" | "EXECUCAO" | "ENCERRAMENTO";
  areas: readonly KnowledgeArea[];
  cobit: readonly CobitDomain[];
  /** entregáveis de gerenciamento esperados (chave i18n `pm.artifact.<id>`) */
  artifacts: readonly string[];
  /** critério de saída do portão */
  gate: readonly GateCriterionId[];
}

export const PHASE_META: Record<ProjectPhase, PhaseMeta> = {
  DEMANDA: {
    phase: "DEMANDA", dominant: "INICIACAO", classic: "INICIACAO",
    areas: ["INTEGRACAO", "PARTES_INTERESSADAS"], cobit: ["EDM", "APO"],
    artifacts: ["INVENTARIO_NECESSIDADES", "GUT", "BUSINESS_CASE", "TAP", "REGISTRO_PARTES_INTERESSADAS"],
    gate: ["TAP_APROVADO", "BUSINESS_CASE_VIAVEL", "ALINHAMENTO_ESTRATEGICO", "GUT_AVALIADA", "PARTES_INTERESSADAS_MAPEADAS"],
  },
  PLANEJAMENTO: {
    phase: "PLANEJAMENTO", dominant: "PLANEJAMENTO", classic: "PLANEJAMENTO",
    areas: ["ESCOPO", "CRONOGRAMA", "CUSTOS", "RECURSOS", "RISCOS", "COMUNICACOES"], cobit: ["APO"],
    artifacts: ["EAP", "CRONOGRAMA_CPM_PERT", "ORCAMENTO_RESERVAS", "RACI", "REGISTRO_RISCOS", "PLANO_PROJETO"],
    gate: ["EAP_REGRA_100", "CRONOGRAMA_SEM_CICLO", "RACI_UM_A", "RISCOS_ANALISADOS", "RESERVA_COBRE_VME", "LINHA_DE_BASE"],
  },
  ELABORACAO: {
    phase: "ELABORACAO", dominant: "PLANEJAMENTO", classic: "PLANEJAMENTO",
    areas: ["ESCOPO", "QUALIDADE", "AQUISICOES"], cobit: ["BAI"],
    artifacts: ["REQUISITOS_DETALHADOS", "MATRIZ_RASTREABILIDADE", "ESPECIFICACAO_TECNICA", "ETP_TR"],
    gate: ["RASTREABILIDADE_COMPLETA", "SEM_GOLD_PLATING"],
  },
  ANALISE: {
    phase: "ANALISE", dominant: "MONITORAMENTO_CONTROLE", classic: "PLANEJAMENTO",
    areas: ["RISCOS", "QUALIDADE", "AQUISICOES"], cobit: ["APO", "MEA"],
    artifacts: ["PARECER_TECNICO", "ANALISE_RISCOS", "ESPELHO_CONFORMIDADE"],
    gate: ["RISCOS_CRITICOS_TRATADOS", "CONFORMIDADE_AVALIADA"],
  },
  APROVACAO: {
    phase: "APROVACAO", dominant: "INICIACAO", classic: "PLANEJAMENTO",
    areas: ["INTEGRACAO", "PARTES_INTERESSADAS"], cobit: ["EDM"],
    artifacts: ["DECISAO_COMITE"],
    gate: ["DECISAO_NO_DECIA"],
  },
  EXECUCAO: {
    phase: "EXECUCAO", dominant: "EXECUCAO", classic: "EXECUCAO",
    areas: ["INTEGRACAO", "QUALIDADE", "RECURSOS", "COMUNICACOES", "AQUISICOES", "PARTES_INTERESSADAS"], cobit: ["BAI", "MEA"],
    artifacts: ["ENTREGAS", "RELATORIO_DESEMPENHO", "SOLICITACOES_MUDANCA"],
    gate: ["MUDANCAS_PELO_CCB", "DESEMPENHO_IDC_IDP", "ENTREGAS_REVISADAS"],
  },
  ENCERRAMENTO: {
    phase: "ENCERRAMENTO", dominant: "ENCERRAMENTO", classic: "ENCERRAMENTO",
    areas: ["INTEGRACAO", "AQUISICOES"], cobit: ["BAI", "DSS"],
    artifacts: ["ACEITE", "LICOES_APRENDIDAS", "ENCERRAMENTO_CONTRATOS", "RELATORIO_FINAL", "TRANSICAO_OPERACAO"],
    gate: ["ACEITE_FORMAL", "LICOES_AO_LONGO", "CONTRATOS_ENCERRADOS", "RECURSOS_LIBERADOS", "ARQUIVAMENTO", "TRANSICAO_OPERACAO"],
  },
};

/** Coluna do quadro: no modelo PMBOK uma coluna agrupa várias fases institucionais (a primeira é a fase canônica ao soltar). */
export interface BoardColumnDef {
  id: string;
  phases: readonly ProjectPhase[];
  /** status de fluxo (só no Scrum) */
  statuses?: readonly FlowStatus[];
  /** no Scrum: coluna do backlog do produto (sem sprint ou sprint futura) ou da sprint atual */
  backlog?: "PRODUTO" | "SPRINT";
}

export function boardColumns(model: BoardModel): BoardColumnDef[] {
  if (model === "INSTITUCIONAL") return PROJECT_PHASES.map((p) => ({ id: p, phases: [p] }));
  if (model === "PMBOK") {
    return [
      { id: "INICIACAO", phases: ["DEMANDA"] },
      { id: "PLANEJAMENTO", phases: ["PLANEJAMENTO", "ELABORACAO", "ANALISE", "APROVACAO"] },
      { id: "EXECUCAO", phases: ["EXECUCAO"] },
      { id: "ENCERRAMENTO", phases: ["ENCERRAMENTO"] },
    ];
  }
  return [
    { id: "PRODUCT_BACKLOG", phases: PROJECT_PHASES, statuses: ["A_FAZER"], backlog: "PRODUTO" },
    { id: "SPRINT_BACKLOG", phases: PROJECT_PHASES, statuses: ["A_FAZER"], backlog: "SPRINT" },
    { id: "EM_ANDAMENTO", phases: PROJECT_PHASES, statuses: ["EM_ANDAMENTO"] },
    { id: "EM_REVISAO", phases: PROJECT_PHASES, statuses: ["EM_REVISAO"] },
    { id: "FEITO", phases: PROJECT_PHASES, statuses: ["CONCLUIDA"] },
  ];
}

/** Scrum Guide: 3 responsabilidades, 5 eventos, 3 artefatos com seus compromissos (aula "Execução" §4.3). */
export const SCRUM = {
  roles: ["PRODUCT_OWNER", "SCRUM_MASTER", "DESENVOLVEDORES"],
  events: ["SPRINT", "PLANNING", "DAILY", "REVIEW", "RETROSPECTIVE"],
  artifacts: [
    { artifact: "PRODUCT_BACKLOG", commitment: "META_DO_PRODUTO" },
    { artifact: "SPRINT_BACKLOG", commitment: "META_DA_SPRINT" },
    { artifact: "INCREMENTO", commitment: "DEFINICAO_DE_PRONTO" },
  ],
} as const;

/** Blocos do Project Model Canvas (Finocchio, 2013) — "quadro visual de uma página" da aula de planejamento §3.6. */
export type PmcQuestion = "POR_QUE" | "O_QUE" | "QUEM" | "COMO" | "QUANDO_QUANTO";
export type PmcBlock =
  | "JUSTIFICATIVAS" | "OBJETIVO_SMART" | "BENEFICIOS"
  | "PRODUTO" | "REQUISITOS"
  | "STAKEHOLDERS" | "EQUIPE"
  | "PREMISSAS" | "ENTREGAS" | "RESTRICOES"
  | "RISCOS" | "LINHA_DO_TEMPO" | "CUSTOS";

export const PMC_LAYOUT: readonly { question: PmcQuestion; blocks: readonly PmcBlock[] }[] = [
  { question: "POR_QUE", blocks: ["JUSTIFICATIVAS", "OBJETIVO_SMART", "BENEFICIOS"] },
  { question: "O_QUE", blocks: ["PRODUTO", "REQUISITOS"] },
  { question: "QUEM", blocks: ["STAKEHOLDERS", "EQUIPE"] },
  { question: "COMO", blocks: ["PREMISSAS", "ENTREGAS", "RESTRICOES"] },
  { question: "QUANDO_QUANTO", blocks: ["RISCOS", "LINHA_DO_TEMPO", "CUSTOS"] },
];

/** O que um post-it vira ao ser solto em cada bloco (ou o que nasce ao criar dentro dele). */
export const PMC_TARGET: Record<PmcBlock, "REQ" | "STK" | "WBS" | "RISK" | "LIST"> = {
  JUSTIFICATIVAS: "LIST", OBJETIVO_SMART: "LIST", BENEFICIOS: "LIST",
  PRODUTO: "LIST", REQUISITOS: "REQ",
  STAKEHOLDERS: "STK", EQUIPE: "LIST",
  PREMISSAS: "LIST", ENTREGAS: "WBS", RESTRICOES: "LIST",
  RISCOS: "RISK", LINHA_DO_TEMPO: "LIST", CUSTOS: "LIST",
};
