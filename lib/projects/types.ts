/**
 * Mesa de Trabalho do projeto (RF21/RF22) — um ÚNICO modelo que alimenta todas as áreas: quadro por fases, canvas, linha do
 * tempo, EAP, rastreabilidade, riscos, RACI, valor agregado, mudanças, governança e encerramento. Toda edição (inclusive no
 * canvas) é um comando sobre este modelo (`commands.ts`); as áreas são projeções dele (`views.ts`). Nada é cópia.
 *
 * Os enums de fase, dependência e MoSCoW espelham os do Java (`domain/projetos`: ProjectPhase, DependencyType, Moscow).
 * Dados DEMO em memória até existir a API de projetos (mesmo padrão do DECIA, `lib/decia/repository.ts`).
 */
import type { DependencyType } from "./engine/schedule";
import type { OpportunityResponse, OrgStructure, RaciLetter, RiskKind, ThreatResponse } from "./engine/methods";

export type { DependencyType } from "./engine/schedule";
export type { RaciLetter, RiskKind, OrgStructure } from "./engine/methods";

/** Fases do ciclo de vida institucional (SECID) — cópia do enum Java `ProjectPhase`, mesma ordem. */
export const PROJECT_PHASES = ["DEMANDA", "PLANEJAMENTO", "ELABORACAO", "ANALISE", "APROVACAO", "EXECUCAO", "ENCERRAMENTO"] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const FLOW_STATUSES = ["A_FAZER", "EM_ANDAMENTO", "EM_REVISAO", "CONCLUIDA"] as const;
export type FlowStatus = (typeof FLOW_STATUSES)[number];

export const MOSCOW = ["MUST", "SHOULD", "COULD", "WONT"] as const;
export type Moscow = (typeof MOSCOW)[number];

/** Abordagem do ciclo de vida (aula "Fundamentos" §1.4). */
export const APPROACHES = ["PREDITIVO", "ITERATIVO", "AGIL", "HIBRIDO"] as const;
export type Approach = (typeof APPROACHES)[number];

/** Modelo de quadro: as 7 fases institucionais, as fases clássicas do PMBOK ou o fluxo do Scrum. */
export const BOARD_MODELS = ["INSTITUCIONAL", "PMBOK", "SCRUM"] as const;
export type BoardModel = (typeof BOARD_MODELS)[number];

export type ProjectRole = "PATROCINADOR" | "GERENTE" | "PRODUCT_OWNER" | "SCRUM_MASTER" | "EQUIPE" | "CONSULTOR";
export type IsoDate = string;

export interface TeamMember { userId: string; role: ProjectRole }

export interface Task {
  id: string;
  code: string;
  title: string;
  phase: ProjectPhase;
  status: FlowStatus;
  /** pacote de trabalho da EAP a que a atividade pertence */
  wbsId?: string;
  responsibleId?: string;
  /** quem revisou a entrega ("quatro olhos") — diferente do responsável */
  reviewerId?: string;
  /** duração planejada em dias; com `pert`, a duração usada no cronograma é o TE */
  durationDays: number;
  pert?: { o: number; m: number; p: number };
  percentComplete: number;
  budget: number;
  actualCost: number;
  moscow?: Moscow;
  sprint?: number;
  milestone?: boolean;
  /** criada por uma mudança aprovada (controle integrado de mudanças) */
  changeId?: string;
  /** criada depois da linha de base — sem `changeId` é trabalho fora do escopo aprovado (scope creep) */
  addedAfterBaseline?: boolean;
  createdBy: string;
  /** quando entrou no projeto (lead time) */
  createdAt?: IsoDate;
  /** quando o trabalho começou (cycle time; preenchido ao sair de "A fazer") */
  startedAt?: IsoDate;
  doneAt?: IsoDate;
}

/** Sprint do Scrum: timebox com início, fim e a META DA SPRINT (compromisso do backlog da sprint, Scrum Guide). */
export interface Sprint { number: number; start: IsoDate; end: IsoDate; goal?: string }

export interface Dependency { id: string; from: string; to: string; type: DependencyType; lagDays: number }

/** Nó da EAP: entrega (substantivo) decomposta até o pacote de trabalho (folha). Regra dos 100 %. */
export interface WbsNode {
  id: string;
  parentId?: string;
  title: string;
  /** orçamento declarado (opcional); quando há filhos, deve ser a soma deles */
  budget?: number;
  /** dicionário da EAP: critério de aceite e responsável */
  acceptance?: string;
  ownerId?: string;
}

export interface Requirement {
  id: string;
  code: string;
  text: string;
  /** origem: necessidade do cliente / objetivo de negócio */
  origin?: string;
  originStakeholderId?: string;
  deliverableIds: string[];
  /** verificação: caso de teste ou critério */
  test?: string;
}

export interface Stakeholder { id: string; name: string; role?: string; power: number; interest: number }

/** Plano de comunicação (PMBOK, gerenciamento das comunicações): o quê, para quem, por qual canal, com que frequência, quem envia. */
export const COMM_CHANNELS = ["REUNIAO", "EMAIL", "RELATORIO", "PAINEL", "MENSAGEM", "APRESENTACAO"] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];
export const COMM_FREQUENCIES = ["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL", "POR_MARCO", "SOB_DEMANDA"] as const;
export type CommFrequency = (typeof COMM_FREQUENCIES)[number];
export interface CommItem { id: string; info: string; audienceIds: string[]; channel: CommChannel; frequency: CommFrequency; ownerId?: string }

export interface Risk {
  id: string;
  title: string;
  kind: RiskKind;
  probability: number;
  /** impacto financeiro (R$) para o VME */
  impact: number;
  /** impacto qualitativo 1–5 para a matriz P × I */
  impactLevel: number;
  response?: ThreatResponse | OpportunityResponse;
  ownerId?: string;
  taskIds: string[];
  status: "ABERTO" | "MITIGADO" | "OCORREU" | "ENCERRADO";
}

export interface RaciEntry { taskId: string; userId: string; letters: RaciLetter[] }

export type ChangeType = "PADRAO" | "NORMAL" | "EMERGENCIAL";
export type ChangeStatus = "SOLICITADA" | "EM_ANALISE" | "APROVADA" | "REJEITADA" | "IMPLEMENTADA";
/** As seis restrições concorrentes (restrição tripla ampliada, PMBOK 6). */
export interface ChangeImpact { scope: number; scheduleDays: number; cost: number; quality: number; resources: number; risk: number }
/** Os 7 Rs da avaliação de mudança (ITIL). */
export interface SevenRs { raised?: string; reason?: string; returnExpected?: string; risks?: string; resources?: string; responsible?: string; relationship?: string }
export interface ChangeRequest {
  id: string;
  code: string;
  title: string;
  requesterId: string;
  type: ChangeType;
  status: ChangeStatus;
  impact: ChangeImpact;
  sevenRs: SevenRs;
  /** decisão do comitê (CCB/CAB) registrada no DECIA */
  decisionId?: string;
  createdAt: IsoDate;
  decidedAt?: IsoDate;
}

export interface Lesson { id: string; phase: ProjectPhase; text: string; kind: "POSITIVA" | "NEGATIVA"; authorId: string; at: IsoDate }

export type GateOutcome = "PENDENTE" | "APROVADO" | "APROVADO_COM_RESSALVAS" | "SUSPENSO" | "ENCERRADO";
export interface Gate { phase: ProjectPhase; outcome: GateOutcome; decisionId?: string; decidedAt?: IsoDate; notes?: string }

/** Termo de Abertura do Projeto (TAP) — alto nível; autoriza o projeto e nomeia o GP; quem aprova é o patrocinador. */
export interface Charter {
  justification: string[];
  objectives: { id: string; text: string; smart: boolean; goalId?: string }[];
  product: string;
  highLevelRequirements: string[];
  premises: string[];
  constraints: string[];
  highLevelRisks: string[];
  /** papéis de equipe necessários (bloco "Equipe" do Project Model Canvas) */
  teamRoles: string[];
  milestones: { id: string; title: string; date?: IsoDate }[];
  summaryBudget: number;
  managerId?: string;
  sponsorId?: string;
  approvedBySponsorAt?: IsoDate;
  /** quem registrou a aprovação na Mesa (auditoria: o GP pode lançar a aprovação que o patrocinador assinou) */
  approvedBy?: string;
}

export interface BusinessCase { rate: number; cashflows: number[]; benefits: string[] }

export interface BudgetLine { id: string; title: string; amount: number; spend: "RUN" | "GROW" | "TRANSFORM" }

/** Governança: cascata de objetivos (PEI/PDTIC/BSC → objetivos de TI → projeto), GUT da demanda, Run/Grow/Transform, ISO 38500. */
export interface Governance {
  goals: { id: string; code: string; text: string; source: "PEI" | "PDTIC" | "BSC" }[];
  gut?: { g: number; u: number; t: number };
  need?: "INFORMACAO" | "SERVICO" | "INFRAESTRUTURA" | "CONTRATACAO" | "PESSOAL";
  spend: "RUN" | "GROW" | "TRANSFORM";
  orgStructure: OrgStructure;
  iso38500: Partial<Record<"RESPONSABILIDADE" | "ESTRATEGIA" | "AQUISICAO" | "DESEMPENHO" | "CONFORMIDADE" | "COMPORTAMENTO_HUMANO", boolean>>;
}

/** Encerramento formal (inclusive de projeto cancelado) e transição para a operação (ITIL). */
export interface Closure {
  acceptance: boolean;
  contractsClosed: boolean;
  resourcesReleased: boolean;
  finalReport: boolean;
  archived: boolean;
  cancelledReason?: string;
  service?: { slaHours?: number; olaHours?: number; ucHours?: number; catalogEntry: boolean; knowledgeBase: boolean; cmdbUpdated: boolean };
}

/** Linha de base aprovada: cronograma e orçamento congelados para o valor agregado e para medir mudanças. */
export interface Baseline { setAt: IsoDate; finish: number; bac: number; tasks: Record<string, { es: number; ef: number; duration: number; budget: number }> }

export type CanvasRef = `${"TASK" | "WBS" | "REQ" | "RISK" | "STK" | "NOTE"}:${string}`;
export interface CanvasNote { id: string; text: string; color?: "AMARELO" | "AZUL" | "VERDE" | "ROSA" }
export interface ProjectCanvas { positions: Partial<Record<CanvasRef, { x: number; y: number }>>; notes: CanvasNote[] }

/** Versão gerada por alteração estrutural (RF22.CA02); `key`/`vars` = resumo legível traduzível (`pm.v.<key>`). */
export interface ProjectVersion { number: number; at: IsoDate; actorId: string; key: string; vars?: Record<string, string | number> }

export interface ProjectModel {
  id: string;
  title: string;
  /** início do projeto (offset 0 do cronograma) */
  startDate: IsoDate;
  /** data de status para o valor agregado */
  statusDate: IsoDate;
  approach: Approach;
  boardModel: BoardModel;
  currentPhase: ProjectPhase;
  currentSprint?: number;
  /** calendário das sprints (abordagens ágil, iterativa e híbrida) */
  sprints?: Sprint[];
  team: TeamMember[];
  charter: Charter;
  businessCase: BusinessCase;
  stakeholders: Stakeholder[];
  /** plano de comunicação ligado às partes interessadas */
  communications?: CommItem[];
  requirements: Requirement[];
  wbs: WbsNode[];
  tasks: Task[];
  dependencies: Dependency[];
  raci: RaciEntry[];
  risks: Risk[];
  changes: ChangeRequest[];
  lessons: Lesson[];
  gates: Gate[];
  budgetLines: BudgetLine[];
  /** reserva de contingência (riscos conhecidos, dentro da linha de base) e gerencial (fora dela) */
  reserves: { contingency: number; management: number };
  governance: Governance;
  closure: Closure;
  baseline?: Baseline;
  canvas: ProjectCanvas;
  /** decisões do DECIA ligadas a este projeto (portões, mudanças, seleção) */
  decisionIds: string[];
  versions: ProjectVersion[];
  version: number;
}
