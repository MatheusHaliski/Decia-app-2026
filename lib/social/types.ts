/**
 * Rede social do Work Station — tipos espelhando o domínio Java (ws-domain `domain/social/*`, migration V16; `domain/common`
 * TargetType/Visibility/AccessClassification; `domain/mensageria/Assignment*`, V20; `domain/acervo` TaskItem/TaskType/
 * TaskState; `domain/projetos` ProjectScheme/ProjectStatus/ProjectPhase; `domain/identity` ProfileType/HypeVisibility).
 * Nomes e valores dos enums são os MESMOS do Java (teste lib/social/types.test.ts lê os .java e compara). Identificadores
 * UUID viram string; Instant/LocalDate viram ISO-8601. Só os campos que a UI usa saem dos records grandes (TaskItem,
 * ProjectScheme) — o subconjunto está documentado em cada interface.
 */

/* ── Enums (valores idênticos aos do Java) ─────────────────────────────────────────────────────────────────── */
export const TARGET_TYPES = ["TASK", "PROJECT", "PLAN", "KIT", "PROJECT_TASK", "MESSAGE", "RECOGNITION"] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const VISIBILITIES = ["PRIVADA", "DEPARTAMENTO", "EMPRESA", "PUBLICA"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const ACCESS_CLASSES = ["PUBLICO", "INTERNO", "RESTRITO", "SIGILOSO"] as const;
export type AccessClassification = (typeof ACCESS_CLASSES)[number];

export const REACTION_TYPES = ["CURTIR", "UTIL", "BEM_FUNDAMENTADO", "INOVADOR", "CONFORME"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];
/** Reações qualitativas (RF26.CA02) — tudo menos CURTIR. */
export type QualitativeReaction = Exclude<ReactionType, "CURTIR">;
export const QUALITATIVE_REACTIONS = REACTION_TYPES.filter((r): r is QualitativeReaction => r !== "CURTIR");

export const IGNORED_REASONS = ["NAO_VERIFICADO", "AUTO_INTERACAO", "ANTIFRAUDE"] as const;
export type IgnoredReason = (typeof IGNORED_REASONS)[number];

export const SHARE_CHANNELS = ["MURAL", "SESSAO_DECIA", "LINK_EXTERNO"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export const FOLLOW_TARGET_TYPES = ["USER", "DEPARTMENT", "COMPANY"] as const;
export type FollowTargetType = (typeof FOLLOW_TARGET_TYPES)[number];

export const FOLLOW_STATUSES = ["ATIVO", "REMOVIDO"] as const;
export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

export const MURAL_KINDS = ["COMPARTILHAMENTO", "DECISAO_VALIDADA", "PROJETO_PUBLICADO", "RECONHECIMENTO", "META", "DESTAQUE", "IMPULSO", "COMUNICADO"] as const;
export type MuralKind = (typeof MURAL_KINDS)[number];

export const NOTIFICATION_CATEGORIES = ["SOCIAL", "DECIA", "PRAZO", "CHANCELA", "PONTOS", "SISTEMA"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  "SESSAO_PROPOSTA", "SESSAO_INICIADA", "PARTICIPANTE_ADICIONADO", "PARTICIPANTE_REMOVIDO", "DIVERGENCIA_DETECTADA", "PERGUNTA_IA",
  "RESUMO_PUBLICADO", "DECISAO_PROPOSTA", "DECISAO_VALIDADA", "DECISAO_DEVOLVIDA", "REABERTURA", "ARTEFATO", "PRAZO_PROXIMO", "PRAZO_VENCIDO",
  "REACAO", "COMENTARIO", "MENCAO", "REMIX", "CHANCELA_ESTADO", "INDICACAO", "BENEFICIO", "PONTOS", "META", "RECONHECIMENTO", "TAREFA_DO_DIA",
  "TRANSICAO", "MENSAGEM_DIRETA", "ATRIBUICAO_PROPOSTA", "ATRIBUICAO_ACEITA", "ATRIBUICAO_RECUSADA", "ATRIBUICAO_DEVOLVIDA",
  "TAREFA_REUTILIZADA", "SISTEMA",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["PROPOSTA", "ACEITA", "RECUSADA", "DEVOLVIDA"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export const ASSIGNMENT_ORIGINS = ["CHAT_WS", "CHAT_DECIA", "BOTAO_ESQUEMA", "MINHA_EQUIPE"] as const;
export type AssignmentOrigin = (typeof ASSIGNMENT_ORIGINS)[number];
export const ASSIGNMENT_TARGET_TYPES = ["TASK", "PROJECT"] as const;
export type AssignmentTargetType = (typeof ASSIGNMENT_TARGET_TYPES)[number];

export const TASK_TYPES = [
  "TEXTO_MANUAL", "TEXTO_IA", "IMAGEM_WEB", "IMAGEM_EDITADA", "PLANILHA", "DOCUMENTO", "PASTA", "LINK", "DESENHO_TECNICO", "FORMULARIO",
  "ATA_REGISTRO", "EMAIL", "PROTOCOLO", "CRONOGRAMA", "ESTUDO_TECNICO_PRELIMINAR",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATES = ["RASCUNHO", "DISPONIVEL", "EM_USO", "BLOQUEADA", "CONCLUIDA", "ARQUIVADA", "MODELO_PUBLICO", "OFERECIDA"] as const;
export type TaskState = (typeof TASK_STATES)[number];

export const TASK_CATEGORIES = [
  "OFICIO_MEMORANDO", "PARECER_TECNICO", "ETP", "TERMO_REFERENCIA", "PLANILHA_ORCAMENTARIA", "PROJETO_BASICO_EXECUTIVO", "CRONOGRAMA", "ATA",
  "PORTARIA_RESOLUCAO", "CONTRATO_CONVENIO", "VISTORIA_RELATORIO_FOTOGRAFICO", "LICENCA_ANUENCIA", "MAPA_GEORREFERENCIA", "FORMULARIO", "OUTRO",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const COVER_MODES = ["AUTO", "MANUAL", "IA"] as const;
export type CoverMode = (typeof COVER_MODES)[number];

export const PROJECT_STATUSES = ["RASCUNHO", "PUBLICADO", "EM_DECISAO", "APROVADO", "EM_EXECUCAO", "CONCLUIDO", "ARQUIVADO", "DEVOLVIDO"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PHASES = ["DEMANDA", "PLANEJAMENTO", "ELABORACAO", "ANALISE", "APROVACAO", "EXECUCAO", "ENCERRAMENTO"] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const PROJECT_COVER_MODES = ["MOSAICO", "FOTO", "IA"] as const;
export type ProjectCoverMode = (typeof PROJECT_COVER_MODES)[number];

export const SCHEME_ORIGINS = ["CRIAR_PROJETO", "DECIA", "REMIX", "AUTOPILOTO", "MODELO", "CENARIO", "DOSSIE", "ATA_VIVA"] as const;
export type SchemeOrigin = (typeof SCHEME_ORIGINS)[number];

export const PROFILE_TYPES = ["EMPREGADO", "EMPRESA", "CHEFE_DEPARTAMENTO"] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export const HYPE_VISIBILITIES = ["PUBLICO", "EMPRESA", "SO_EU"] as const;
export type HypeVisibility = (typeof HYPE_VISIBILITIES)[number];

/* ── Pessoas e instituições (subconjunto de User / Company / Department / DepartmentMembership) ─────────────── */
export type NodeColor = "red" | "yellow" | "green" | "blue" | "brown" | "orange";

export interface SocialCompany {
  id: string;
  slug: string;
  legalName: string;
  /** conta EMPRESA dona (Company.ownerUserId) */
  ownerUserId: string;
}

export interface SocialDepartment {
  id: string;
  slug: string;
  companyId: string;
  acronym: string;
  name: string;
  color: NodeColor;
  /** chefe (Department.headUserId) */
  headUserId: string | null;
}

export interface SocialPerson {
  id: string;
  username: string;
  fullName: string;
  profileType: ProfileType;
  /** cargo (User.jobTitle) — EMPRESA não tem cargo */
  jobTitle: string | null;
  companyId: string | null;
  /** lotação vigente (DepartmentMembership); EMPRESA = null */
  departmentId: string | null;
  hypeVisibility: HypeVisibility;
  /** ProfileHypeScore.score (0–1000) — DEMO */
  hype: number | null;
  /** saldo de DECIA Points (só o dono vê, sub-aba 13) — DEMO; null = conta sem saldo (EMPRESA, §7.d) */
  points: number | null;
  /** decisões validadas (contador do cabeçalho; vem do DECIA) — DEMO */
  decisionsCount: number;
}

/* ── Itens (subconjunto de TaskItem / ProjectScheme lido pelo card, ANATOMIA_CARDS §7) ───────────────────── */
export interface SocialTask {
  id: string;
  ownerId: string;
  departmentId: string | null;
  title: string;
  /** resumo em 3 linhas */
  summary: string | null;
  type: TaskType;
  category: TaskCategory | null;
  accessClass: AccessClassification;
  /** formato (docx, xlsx, pdf, url…) */
  format: string | null;
  responsibleId: string | null;
  dueAt: string | null;
  legalDueAt: string | null;
  state: TaskState;
  blockReason: string | null;
  visibility: Visibility;
  favorite: boolean;
  aiGenerated: boolean;
  coverMode: CoverMode;
  cardSkin: string | null;
  /** tarefa original (crédito de remix) */
  originalTaskId: string | null;
  reuseCount: number;
  /** chancelas aprovadas (sealIdsJson) — rótulo do emissor para o lacre */
  seals: readonly { issuer: "EMPRESA" | "CHEFE"; label: string }[];
  /** auditoria (created_at) */
  createdAt: string;
}

export interface SocialProject {
  id: string;
  ownerId: string;
  companyId: string | null;
  departmentId: string | null;
  title: string;
  objective: string | null;
  origin: SchemeOrigin;
  originalProjectId: string | null;
  status: ProjectStatus;
  currentPhase: ProjectPhase;
  visibility: Visibility;
  coverMode: ProjectCoverMode;
  nextMilestoneAt: string | null;
  lastDeciaEventLabel: string | null;
  aiGenerated: boolean;
  /** tarefas do mosaico (ids de SocialTask, ≤ 6) */
  taskIds: readonly string[];
  peopleCount: number;
  responsibleId: string | null;
  seals: readonly { issuer: "EMPRESA" | "CHEFE"; label: string }[];
  createdAt: string;
}

/* ── Interações (records de domain/social) ───────────────────────────────────────────────────────────────── */
export interface Reaction {
  id: string;
  actorId: string;
  targetType: TargetType;
  targetId: string;
  reactionType: ReactionType;
  at: string;
  actorHypeAtTime: number | null;
  ignoredReason: IgnoredReason | null;
}

export interface Comment {
  id: string;
  authorId: string;
  targetType: TargetType;
  targetId: string;
  parentCommentId: string | null;
  contentMd: string;
  /** menções (@usuário) — mentionsJson */
  mentions: readonly string[];
  editedAt: string | null;
  deletedBy: string | null;
  active: boolean;
  /** auditoria (created_at) */
  createdAt: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  favorite: boolean;
  savedAt: string;
}

export interface Share {
  id: string;
  actorId: string;
  targetType: TargetType;
  targetId: string;
  channel: ShareChannel;
  sessionId: string | null;
  externalToken: string | null;
  expiresAt: string | null;
  imageMediaId: string | null;
  /** Audit.CREATED */
  createdAt: string;
}

export interface Remix {
  id: string;
  actorId: string;
  sourceType: TargetType;
  sourceId: string;
  resultType: TargetType;
  resultId: string;
  modelOfferId: string | null;
  ledgerEntryId: string | null;
  at: string;
}

export interface Follow {
  id: string;
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;
  status: FollowStatus;
  at: string;
}

export interface MuralEntry {
  id: string;
  companyId: string;
  departmentId: string | null;
  kind: MuralKind;
  targetType: TargetType | null;
  targetId: string | null;
  actorId: string;
  boostUntil: string | null;
  at: string;
}

export interface SocialNotification {
  id: string;
  recipientId: string;
  /** null = sistema */
  actorId: string | null;
  type: NotificationType;
  category: NotificationCategory;
  resourceType: string | null;
  resourceId: string | null;
  /** DEMO: chave i18n do título (a API devolverá o texto já resolvido) */
  title: string;
  body: string | null;
  /** payload: atores agregados, contagem, título do alvo */
  payload: { actors: readonly string[]; count: number; targetTitle: string };
  groupKey: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface Assignment {
  id: string;
  targetType: AssignmentTargetType;
  targetId: string;
  fromUserId: string;
  toUserId: string;
  origin: AssignmentOrigin;
  status: AssignmentStatus;
  dueAt: string | null;
  message: string | null;
  reason: string | null;
  previousResponsibleId: string | null;
  traceNodeId: string | null;
  respondedAt: string | null;
  /** auditoria (created_at, VersionedAuditableEntity) */
  createdAt: string;
}

/** Sessão DECIA de destino de um compartilhamento (Share.sessionId) — DEMO. */
export interface DemoSession { id: string; title: string }

/** Estado completo da rede social (o que a API devolveria em várias chamadas). */
export interface SocialState {
  companies: readonly SocialCompany[];
  departments: readonly SocialDepartment[];
  people: readonly SocialPerson[];
  tasks: readonly SocialTask[];
  projects: readonly SocialProject[];
  reactions: readonly Reaction[];
  comments: readonly Comment[];
  saved: readonly SavedItem[];
  shares: readonly Share[];
  remixes: readonly Remix[];
  follows: readonly Follow[];
  mural: readonly MuralEntry[];
  notifications: readonly SocialNotification[];
  assignments: readonly Assignment[];
  sessions: readonly DemoSession[];
}

/** Referência a um alvo (TaskItem ou ProjectScheme) das interações. */
export interface TargetRef { type: "TASK" | "PROJECT"; id: string }

/** Quem está olhando (perfil de visualização do lab → pessoa DEMO); null = visitante anônimo. */
export type ViewerId = string | null;
