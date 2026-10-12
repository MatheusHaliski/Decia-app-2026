/**
 * DECIA — tipos do domínio "decisão estruturada" (docs/decia/03_MODELO_FUNCIONAL.md §4.2, RF29 Rastro de Decisão).
 * Espelham as entidades e enums do pacote Java `domain.decisao` (migration V22). Valores dos enums em português,
 * exatamente como a especificação. Onde a especificação nomeia um enum sem listar os valores (DecisionKind,
 * EvidenceKind, SourceQuality), os valores abaixo são DESIGN PROPOSAL e estão listados no relatório de ambiguidades.
 */

export const DECISION_LIFECYCLE = [
  "RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "DECIDIDA", "EM_EXECUCAO", "RESOLVIDA",
  "REVISADA", "REABERTA", "ARQUIVADA",
] as const;
export type DecisionLifecycle = (typeof DECISION_LIFECYCLE)[number];

/** Transições permitidas (§4.3). */
export const LIFECYCLE_TRANSITIONS: Record<DecisionLifecycle, readonly DecisionLifecycle[]> = {
  RASCUNHO: ["ENQUADRAMENTO", "ARQUIVADA"],
  ENQUADRAMENTO: ["PESQUISA", "COMPARACAO", "ARQUIVADA"],
  PESQUISA: ["COMPARACAO", "ENQUADRAMENTO", "ARQUIVADA"],
  COMPARACAO: ["AGUARDANDO_DECISAO", "PESQUISA", "ARQUIVADA"],
  AGUARDANDO_DECISAO: ["DECIDIDA", "COMPARACAO"],
  DECIDIDA: ["EM_EXECUCAO", "REABERTA", "RESOLVIDA"],
  EM_EXECUCAO: ["RESOLVIDA", "REABERTA"],
  RESOLVIDA: ["REVISADA", "REABERTA"],
  REVISADA: ["ARQUIVADA", "REABERTA"],
  REABERTA: ["COMPARACAO"],
  ARQUIVADA: [],
};

/** Estados em que a estrutura (alternativas, critérios, pesos, notas) pode mudar; depois de DECIDIDA só reabrindo (§4.3). */
export const STRUCTURE_EDITABLE: readonly DecisionLifecycle[] = ["RASCUNHO", "ENQUADRAMENTO", "PESQUISA", "COMPARACAO", "AGUARDANDO_DECISAO", "REABERTA"];
export const isStructureEditable = (s: DecisionLifecycle) => STRUCTURE_EDITABLE.includes(s);

/**
 * Caminho explícito até AGUARDANDO_DECISAO para a ação única "Decidir" (decisão rápida, §4.3): cada passo é uma transição
 * permitida e fica na trilha. Estados fora deste mapa não podem decidir (Codex P1, PR #31).
 */
export const PATH_TO_AWAITING: Partial<Record<DecisionLifecycle, readonly DecisionLifecycle[]>> = {
  RASCUNHO: ["ENQUADRAMENTO", "COMPARACAO", "AGUARDANDO_DECISAO"],
  ENQUADRAMENTO: ["COMPARACAO", "AGUARDANDO_DECISAO"],
  PESQUISA: ["COMPARACAO", "AGUARDANDO_DECISAO"],
  COMPARACAO: ["AGUARDANDO_DECISAO"],
  REABERTA: ["COMPARACAO", "AGUARDANDO_DECISAO"],
  AGUARDANDO_DECISAO: [],
};

export const DECISION_COMPLEXITY = ["RAPIDA", "PADRAO", "PROFUNDA"] as const;
export type DecisionComplexity = (typeof DECISION_COMPLEXITY)[number];

/** Tipo da decisão (filtro "tipo") — mesmos valores do enum Java `DecisionKind` (ws-domain, PR #30). */
export const DECISION_KIND = ["ESTRATEGICA", "TATICA", "OPERACIONAL", "TECNICA", "FINANCEIRA", "PRODUTO", "PESSOAS", "CONTRATACAO", "RISCO"] as const;
export type DecisionKind = (typeof DECISION_KIND)[number];

export const DECISION_LEVEL = ["BAIXO", "MEDIO", "ALTO", "CRITICO"] as const;
export type DecisionLevel = (typeof DECISION_LEVEL)[number];

export const LIKELIHOOD = ["RARA", "POSSIVEL", "PROVAVEL", "QUASE_CERTA"] as const;
export type Likelihood = (typeof LIKELIHOOD)[number];

export type DecisionRole = "CONDUTOR" | "APROVADOR" | "CONTRIBUIDOR" | "INFORMADO";
export type ContentOrigin = "HUMANO" | "IA" | "IMPORTADA";
export type Visibility = "PRIVADA" | "DEPARTAMENTO" | "EMPRESA" | "PUBLICA";
export type AlternativeStatus = "ATIVA" | "DESCARTADA";
export type CriterionDirection = "MAIOR_MELHOR" | "MENOR_MELHOR";
export type EvidenceNature = "FATO" | "EVIDENCIA" | "OPINIAO";
/** Mesmos valores do enum Java `EvidenceKind`. */
export type EvidenceKind = "DOCUMENTO" | "METRICA" | "CONJUNTO_DADOS" | "PESQUISA" | "FEEDBACK_USUARIO" | "BENCHMARK" | "TESTE_TECNICO" | "OPINIAO_ESPECIALISTA" | "FONTE_EXTERNA" | "NORMA";
/** Mesmos valores do enum Java `SourceQuality`. */
export const SOURCE_QUALITY = ["PRIMARIA", "SECUNDARIA", "INTERNA", "ESPECIALISTA", "NAO_VERIFICADA"] as const;
export type SourceQuality = (typeof SOURCE_QUALITY)[number];
export type RelevanceLevel = "BAIXA" | "MEDIA" | "ALTA";
export type EvidenceTargetType = "ALTERNATIVA" | "CRITERIO" | "PREMISSA" | "RISCO" | "AVALIACAO";
export type EvidenceStance = "SUSTENTA" | "CONTRADIZ" | "CONTEXTO";
export type AssumptionValidation = "NAO_VALIDADA" | "EM_VALIDACAO" | "VALIDADA" | "INVALIDADA";
export type RiskSource = "MANUAL" | "PRE_MORTEM" | "RED_TEAM" | "IA";
export type RiskStatus = "ABERTO" | "MITIGADO" | "ACEITO" | "OCORREU" | "ENCERRADO";
export type ScenarioCase = "MELHOR" | "BASE" | "PIOR";
export type ForecastResolution = "PENDENTE" | "OCORREU" | "NAO_OCORREU" | "ANULADA";
export type RecommendationSource = "MODELO" | "IA";
export type RecommendationStatus = "SUGERIDA" | "ACEITA" | "DESCARTADA";
export type TriggerStatus = "ATIVO" | "DISPARADO" | "ARQUIVADO";
export type SnapshotKind = "DECISAO" | "REABERTURA" | "CHECKPOINT";
export type CheckpointKind = "PROGRAMADO" | "GATILHO";
export type CheckpointStatus = "AGENDADO" | "CONCLUIDO" | "PERDIDO" | "CANCELADO";
export type CheckpointAction = "MANTER" | "AJUSTAR" | "REABRIR";
export type OutcomeResult = "SUCESSO" | "PARCIAL" | "FALHOU" | "CANCELADA" | "SUBSTITUIDA";
export type ProcessQuality = "ADEQUADA" | "PARCIAL" | "INADEQUADA";
export type WorkLinkTarget = "TAREFA" | "PROJETO" | "MARCO";

/**
 * Fatos de domínio da decisão (pretérito) — mesmos valores e nomes de mensagem do enum Java `DecisionEventType`
 * (ws-domain, PR #30). Formam o histórico da decisão (linha do tempo do card). Eventos de interface/analytics
 * (`card_flipped`, `decision_compared`, `ai_suggestion_*`…) vivem só em lib/decia/analytics.ts e nunca entram aqui.
 */
export const DECISION_EVENT_MESSAGE = {
  DECISAO_CRIADA: "DecisionCreated", PROBLEMA_ENQUADRADO: "DecisionFramed", ESTADO_ALTERADO: "DecisionStatusChanged",
  EVIDENCIA_ADICIONADA: "EvidenceAdded", EVIDENCIA_SUBSTITUIDA: "EvidenceSuperseded", ALTERNATIVA_CRIADA: "AlternativeCreated",
  ALTERNATIVA_DESCARTADA: "AlternativeDiscarded", CRITERIO_ATUALIZADO: "CriterionUpdated", AVALIACAO_REGISTRADA: "AssessmentRecorded",
  PREMISSA_ATUALIZADA: "AssumptionUpdated", RISCO_ALTERADO: "RiskChanged", RECOMENDACAO_GERADA: "RecommendationGenerated",
  SUGESTAO_IA_ACEITA: "AiSuggestionAccepted", SUGESTAO_IA_DESCARTADA: "AiSuggestionDismissed", DECISAO_DESAFIADA: "DecisionChallenged",
  DECISAO_FINALIZADA: "DecisionFinalized", DECISAO_REABERTA: "DecisionReopened", TRABALHO_VINCULADO: "WorkItemsLinked",
  CHECKPOINT_VENCENDO: "CheckpointDue", CHECKPOINT_CONCLUIDO: "CheckpointCompleted", GATILHO_DISPARADO: "TriggerFired",
  RESULTADO_REGISTRADO: "OutcomeRecorded", REVISAO_CONCLUIDA: "ReviewCompleted", DECISAO_ARQUIVADA: "DecisionArchived",
} as const;
export type DecisionEventType = keyof typeof DECISION_EVENT_MESSAGE;
export const DECISION_EVENT_TYPES = Object.keys(DECISION_EVENT_MESSAGE) as DecisionEventType[];

/** Estado de uma análise assíncrona da IA — distinto do estado da decisão (nunca termos técnicos de mensageria na UI). */
export type AiAnalysisState = "SOLICITADA" | "PROCESSANDO" | "PARCIAL" | "CONCLUIDA" | "FALHOU";

/** Datas sempre em ISO-8601 (UTC). */
export type IsoDate = string;

export interface Decision {
  id: string;
  version: number;
  title: string;
  question: string;
  contextMd?: string;
  objective?: string;
  constraintsMd?: string;
  scope?: string;
  stakeholders: string[];
  resourcesMd?: string;
  dependenciesMd?: string;
  targetDate?: IsoDate;
  ownerUserId: string | null;
  createdByUserId: string;
  companyId: string;
  departmentId?: string;
  sessionId?: string;
  projectId?: string;
  finalDecisionId?: string;
  supersedesDecisionId?: string;
  status: DecisionLifecycle;
  complexity: DecisionComplexity;
  kind: DecisionKind;
  impact: DecisionLevel;
  urgency: DecisionLevel;
  visibility: Visibility;
  accessClass: string;
  weightingEnabled: boolean;
  independentScoring: boolean;
  templateKey?: string;
  /** estado ATUAL; o do momento da decisão vive no snapshot */
  selectedAlternativeId?: string;
  decidedAt?: IsoDate;
  decisionConfidencePct?: number;
  rationale?: string;
  reviewEveryDays?: number;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  /** chave i18n de uma nota contextual do sistema (ex.: regras legais de contratação pública) — nunca conselho jurídico */
  contextNoteKey?: string;
}

export interface DecisionParticipant { userId: string; role: DecisionRole; joinedAt: IsoDate; assessmentsSubmittedAt?: IsoDate }

export interface DecisionAlternative {
  id: string;
  label: string;
  title: string;
  description?: string;
  doNothing: boolean;
  pros: string[];
  cons: string[];
  estimatedCost?: string;
  estimatedDurationDays?: number;
  status: AlternativeStatus;
  discardReason?: string;
  origin: ContentOrigin;
  aiInferenceId?: string;
  position: number;
}

export interface DecisionCriterion {
  id: string;
  name: string;
  description?: string;
  direction: CriterionDirection;
  weightPct: number | null;
  catalogKey?: string;
  origin: ContentOrigin;
  position: number;
}

export interface CriterionAssessment {
  id: string;
  alternativeId: string;
  criterionId: string;
  assessorUserId: string;
  /** 1–5, 5 = mais desejável */
  score: number;
  rationale?: string;
  submittedAt: IsoDate;
  origin: ContentOrigin;
}

export interface DecisionEvidence {
  id: string;
  nature: EvidenceNature;
  kind: EvidenceKind;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceUrl?: string;
  authorLabel?: string;
  observedAt?: IsoDate;
  retrievedAt?: IsoDate;
  sourceQuality: SourceQuality;
  relevance: RelevanceLevel;
  reliability: RelevanceLevel;
  origin: ContentOrigin;
  addedByUserId: string;
  addedAt: IsoDate;
  supersededAt?: IsoDate;
}

export interface EvidenceLink { id: string; evidenceId: string; targetType: EvidenceTargetType; targetId: string; stance: EvidenceStance; note?: string; createdAt?: IsoDate }

export interface DecisionAssumption {
  id: string;
  statement: string;
  importance: DecisionLevel;
  confidencePct?: number;
  validationStatus: AssumptionValidation;
  ownerUserId?: string;
  alternativeId?: string;
  validationNote?: string;
  validatedAt?: IsoDate;
  origin: ContentOrigin;
}

export interface DecisionRisk {
  id: string;
  title: string;
  description?: string;
  alternativeId?: string;
  likelihood: Likelihood;
  impact: DecisionLevel;
  mitigation?: string;
  ownerUserId?: string;
  source: RiskSource;
  status: RiskStatus;
  origin: ContentOrigin;
}

export interface DecisionScenario { id: string; alternativeId?: string; case: ScenarioCase; description: string; likelihood: Likelihood; assumptionIds: string[]; expectedResult: string }

export interface DecisionForecast {
  id: string;
  alternativeId?: string;
  statement: string;
  /** 5–95, passo 5 */
  probabilityPct: number;
  resolveBy: IsoDate;
  forecasterUserId: string;
  resolution: ForecastResolution;
  resolvedAt?: IsoDate;
}

export interface DecisionRecommendation {
  id: string;
  alternativeId?: string;
  source: RecommendationSource;
  reasoningMd: string;
  supporting: string[];
  contradicting: string[];
  criticalAssumptionIds: string[];
  limitationsMd: string;
  whatWouldChangeMd: string;
  modelVersion: string;
  aiInferenceId?: string;
  status: RecommendationStatus;
  createdAt: IsoDate;
}

export interface DecisionTrigger { id: string; conditionText: string; metricKey?: string; comparator?: string; threshold?: number; status: TriggerStatus; firedAt?: IsoDate }

export interface DecisionSnapshot {
  id: string;
  kind: SnapshotKind;
  versionNumber: number;
  takenAt: IsoDate;
  takenByUserId: string;
  /** JSON canônico (§6.12) */
  contentJson: string;
  contentSha256: string;
  rationale: string;
  confidencePct?: number;
  selectedAlternativeLabel: string;
  modelVersion: string;
}

export interface DecisionCheckpoint {
  id: string;
  dueAt: IsoDate;
  kind: CheckpointKind;
  status: CheckpointStatus;
  completedAt?: IsoDate;
  completedByUserId?: string;
  stillValid?: boolean;
  assumptionsChanged?: boolean;
  newEvidence?: boolean;
  confidencePctAfter?: number;
  action?: CheckpointAction;
  note?: string;
}

export interface DecisionOutcome { id: string; result: OutcomeResult; observedAt: IsoDate; summary: string; metrics?: Record<string, string>; recordedByUserId: string }

export interface DecisionRetrospective {
  id: string;
  outcomeId?: string;
  whatHappened: string;
  whatExpected: string;
  whatWasRight: string;
  whatWasWrong: string;
  failedAssumptionIds: string[];
  processQuality: ProcessQuality;
  lessonsMd: string;
  shareAsLesson: boolean;
  reviewedByUserId: string;
  reviewedAt: IsoDate;
}

export interface DecisionWorkLink { id: string; targetType: WorkLinkTarget; targetId: string; label: string; done?: boolean; createdByUserId: string; createdAt: IsoDate }

export interface DecisionEvent {
  id: string;
  /** nulo = IA/sistema */
  actorUserId: string | null;
  type: DecisionEventType;
  payload: Record<string, unknown>;
  at: IsoDate;
  correlationId?: string;
}

/** Agregado completo: a raiz `Decision` e todas as entidades-filhas. O card e o workspace só leem daqui. */
export interface DecisionAggregate {
  decision: Decision;
  participants: DecisionParticipant[];
  alternatives: DecisionAlternative[];
  criteria: DecisionCriterion[];
  assessments: CriterionAssessment[];
  evidence: DecisionEvidence[];
  evidenceLinks: EvidenceLink[];
  assumptions: DecisionAssumption[];
  risks: DecisionRisk[];
  scenarios: DecisionScenario[];
  forecasts: DecisionForecast[];
  recommendations: DecisionRecommendation[];
  triggers: DecisionTrigger[];
  snapshots: DecisionSnapshot[];
  checkpoints: DecisionCheckpoint[];
  outcome?: DecisionOutcome;
  retrospective?: DecisionRetrospective;
  workLinks: DecisionWorkLink[];
  events: DecisionEvent[];
}

/** Diretório mínimo de pessoas (nomes exibidos). Dados DEMO até existir a API de usuários. */
export type PeopleDirectory = Record<string, { name: string }>;
