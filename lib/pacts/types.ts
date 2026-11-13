/**
 * Pactos de Desbloqueio (RF49) — tipos do domínio, espelhando o modelo proposto no README do RF49 e no estudo de 12/10/2026
 * (`CooperationPact`, `PactEvent`, `PactDelivery`, `PactAcknowledgement`, `TeamCommitmentLimit`), com a mediação em rodadas
 * pedida pelo dono do produto: cada lado propõe compromissos de PRAZO, SUPORTE ou RECURSO, a outra parte contrapropõe e o acordo
 * só nasce com aceite BILATERAL (solicitante + destinatário, pessoas diferentes) e o aceite explícito de quem executa.
 * Datas: instantes em ISO-8601 (UTC); prazos em AAAA-MM-DD.
 */

export const PACT_STATES = ["SOLICITADO", "EM_NEGOCIACAO", "COMPROMETIDO", "ENTREGUE", "VALIDADO", "RECUSADO", "CANCELADO"] as const;
export type PactStatus = (typeof PACT_STATES)[number];
export const OPEN_PACT_STATES: readonly PactStatus[] = ["SOLICITADO", "EM_NEGOCIACAO", "COMPROMETIDO", "ENTREGUE"];
export const CLOSED_PACT_STATES: readonly PactStatus[] = ["VALIDADO", "RECUSADO", "CANCELADO"];
/** Contam no limite de compromissos simultâneos da equipe destinatária (RF49.CA04). */
export const ACTIVE_COMMITMENT_STATES: readonly PactStatus[] = ["COMPROMETIDO", "ENTREGUE"];

export type Side = "SOLICITANTE" | "DESTINATARIO";
export const SIDES: readonly Side[] = ["SOLICITANTE", "DESTINATARIO"];
export const otherSide = (s: Side): Side => (s === "SOLICITANTE" ? "DESTINATARIO" : "SOLICITANTE");

/** Quem está de cada lado: uma pessoa, a equipe (membros da unidade), a chefia ou o departamento (representado pela chefia). */
export const PARTY_KINDS = ["PESSOA", "EQUIPE", "CHEFIA", "DEPARTAMENTO"] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];
export interface PactParty {
  kind: PartyKind;
  departmentId: string;
  /** só para PESSOA */
  userId: string | null;
}

export type AccessClass = "PUBLICO" | "INTERNO" | "RESTRITO" | "SIGILOSO";

export const COMMITMENT_KINDS = ["PRAZO", "SUPORTE", "RECURSO"] as const;
export type CommitmentKind = (typeof COMMITMENT_KINDS)[number];
export type CommitmentStatus = "PENDENTE" | "CUMPRIDO" | "DESCUMPRIDO";

export interface Commitment {
  id: string;
  kind: CommitmentKind;
  /** lado que se compromete */
  side: Side;
  description: string;
  /** obrigatório para PRAZO (AAAA-MM-DD) */
  dueDate: string | null;
  status: CommitmentStatus;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface CommitmentDraft {
  kind: CommitmentKind;
  side: Side;
  description: string;
  dueDate: string | null;
}

export interface Acceptance {
  userId: string;
  at: string;
}

export type ProposalKind = "PROPOSTA" | "CONTRAPROPOSTA" | "RENEGOCIACAO";
export type ProposalStatus = "ABERTA" | "SUBSTITUIDA" | "ACEITA";

export interface Proposal {
  id: string;
  /** rodada da mediação (1, 2, 3…) */
  round: number;
  kind: ProposalKind;
  side: Side;
  authorId: string;
  at: string;
  commitments: Commitment[];
  /** quem executa do lado destinatário (precisa aceitar pessoalmente) */
  executorId: string | null;
  note: string;
  /** motivo (obrigatório na renegociação) */
  reason: string | null;
  acceptances: { SOLICITANTE: Acceptance | null; DESTINATARIO: Acceptance | null; EXECUTOR: Acceptance | null };
  status: ProposalStatus;
}

export interface Agreement {
  version: number;
  proposalId: string;
  agreedAt: string;
  executorId: string;
  /** maior PRAZO do lado destinatário (a "data acordada") */
  agreedDueDate: string;
  commitments: Commitment[];
  supersededAt: string | null;
  supersededBy: string | null;
  supersedeReason: string | null;
}

export interface Delivery {
  attempt: number;
  at: string;
  by: string;
  /** referência à evidência (link, número de processo, id da tarefa) — o pacto não copia anexos */
  evidence: string;
  evidenceClass: AccessClass;
  resourceVersion: string;
  returned: { at: string; by: string; unmetCriterion: string; reason: string } | null;
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  doneAt: string | null;
  doneBy: string | null;
}

export interface CheckIn {
  id: string;
  at: string;
  by: string;
  note: string;
  updates: { commitmentId: string; status: "CUMPRIDO" | "DESCUMPRIDO" }[];
}

export interface Escalation {
  id: string;
  at: string;
  by: string;
  reason: string;
  /** chefias acima (ou a conta da empresa, quando as partes já são chefias) */
  targets: string[];
  status: "ABERTA" | "RESOLVIDA";
  resolution: { at: string; by: string; text: string } | null;
}

export interface Clarification {
  id: string;
  at: string;
  by: string;
  question: string;
  answer: { at: string; by: string; text: string } | null;
}

export const PACT_EVENT_KINDS = [
  "SOLICITAR", "PROPOR", "CONTRAPROPOR", "ACEITAR", "PEDIR_ESCLARECIMENTO", "ESCLARECER", "RECUSAR", "COMPROMETER", "EXCECAO_LIMITE",
  "ENTREGAR", "DEVOLVER", "VALIDAR", "CONFIRMAR_DESBLOQUEIO", "RECONHECER", "RENEGOCIAR", "CHECKIN", "MARCO", "MARCO_CONCLUIDO",
  "ESCALAR", "RESOLVER_ESCALONAMENTO", "CANCELAR", "LEMBRAR",
] as const;
export type PactEventKind = (typeof PACT_EVENT_KINDS)[number];

export interface PactEvent {
  id: string;
  at: string;
  actorId: string;
  kind: PactEventKind;
  from: PactStatus | null;
  to: PactStatus;
  reason: string | null;
  idempotencyKey: string | null;
}

export interface CooperationPact {
  id: string;
  version: number;
  companyId: string;
  impedimentId: string | null;
  /** tarefa travada de quem pede (recurso dependente) */
  dependentTaskId: string | null;
  /** tarefa que produz a entrega do lado destinatário (para detectar dependência circular) */
  deliverableTaskId: string | null;
  requester: PactParty;
  target: PactParty;
  /** quem abriu (identidade derivada da sessão) */
  requesterId: string;
  expectedDelivery: string;
  justification: string;
  acceptanceCriterion: string;
  requestedDueDate: string;
  accessClass: AccessClass;
  /** concessões explícitas do proprietário (obrigatórias em SIGILOSO, inclusive para chefias e administração) */
  grants: string[];
  status: PactStatus;
  /** nunca muda: a idade do pedido não é "zerada" por renegociação (RF49.CA07) */
  createdAt: string;
  updatedAt: string;
  proposals: Proposal[];
  agreements: Agreement[];
  deliveries: Delivery[];
  milestones: Milestone[];
  checkins: CheckIn[];
  escalations: Escalation[];
  clarifications: Clarification[];
  limitException: { by: string; at: string; reason: string } | null;
  validation: { by: string; at: string } | null;
  unblock: { by: string; at: string } | null;
  recognition: { by: string; at: string; text: string } | null;
  closure: { by: string; at: string; reason: string } | null;
  /** sessão DECIA de mediação, quando aberta por lá */
  sessionId: string | null;
  events: PactEvent[];
}

export type ImpedimentSource = "ACERVO" | "MESA" | "MANUAL";

export interface Impediment {
  id: string;
  source: ImpedimentSource;
  taskId: string | null;
  /** o trabalho que está travado */
  title: string;
  /** o que trava */
  blockedBy: string;
  /** desde quando (AAAA-MM-DD) */
  since: string;
  /** quem depende do desbloqueio */
  dependents: { label: string; userId: string | null }[];
  /** dono do trabalho travado */
  ownerId: string;
  departmentId: string;
  accessClass: AccessClass;
  /** sugestão de com quem pactuar (quando a origem indica) */
  suggestedTarget: PactParty | null;
  /** quem mais acompanha (ex.: gerente do projeto na Mesa) */
  watchers: string[];
  createdAt: string;
}

export interface PactNotification {
  id: string;
  recipientId: string;
  pactId: string;
  /** agrupamento: uma notificação não lida por pacto e pessoa (RF49.CA14) */
  groupKey: string;
  kinds: PactEventKind[];
  count: number;
  firstAt: string;
  lastAt: string;
  read: boolean;
}

export interface PactsState {
  pacts: CooperationPact[];
  impediments: Impediment[];
  notifications: PactNotification[];
  /** limite de compromissos simultâneos por unidade destinatária (TeamCommitmentLimit) */
  limits: Record<string, number>;
  /** sequência para ids gerados na aba */
  seq: number;
}
