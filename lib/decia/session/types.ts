/**
 * Sessão do DECIA (docs/produto/DECIA_SESSAO_E_MESA.md §A–§E; RF29 ponte, RF37 Ata Viva, RF51 autonomia da IA, RF42 pontos).
 * Tipos do domínio da sessão deliberativa: estados (§A.1, 12 valores), fases (§A.3), papéis de quem participa (os de
 * `lib/ai/autonomy.ts`: PROPRIETARIO · EDITOR · COMENTADOR · LEITOR), mensagens do chat classificado, propostas da IA ✦ sobre a
 * minuta, reuniões da Ata Viva e encaminhamentos. A API da sessão ainda não existe: estes tipos alimentam só o repositório DEMO
 * (repository.ts); o cliente HTTP real implementará o mesmo contrato.
 */
import type { AgentCharter, AiPolicy, AiProposal, AutonomyDenial, AutonomyMode, SessionRole } from "@/lib/ai/autonomy";
import type { EarnEvent } from "@/lib/points/ledger";
import type { MemoryKind } from "@/lib/memory/search";

export type { AgentCharter, AiPolicy, AutonomyMode, SessionRole };

/** Datas ISO-8601 (UTC) para instantes; `DateOnly` = "AAAA-MM-DD" (data de calendário, sem fuso). */
export type IsoDate = string;
export type DateOnly = string;

/* ── Estados e fases ──────────────────────────────────────────────────────────────────────────────────────── */

export const SESSION_STATUSES = [
  "RASCUNHO", "AGENDADA", "ABERTA", "CONVERGINDO", "DECISAO_PROPOSTA", "EM_REVISAO", "VALIDADA", "DEVOLVIDA", "REABERTA",
  "ENCERRADA", "ARQUIVADA", "CANCELADA",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const DELIBERATION_PHASES = ["CONTEXTO", "DIVERGIR", "ESCLARECER", "CONVERGIR", "DECIDIR"] as const;
export type DeliberationPhase = (typeof DELIBERATION_PHASES)[number];

export const SESSION_ROLES: readonly SessionRole[] = ["PROPRIETARIO", "EDITOR", "COMENTADOR", "LEITOR"];

export type AccessClass = "PUBLICO" | "INTERNO" | "RESTRITO" | "SIGILOSO";

export interface SessionParticipant { userId: string; role: SessionRole; joinedAt: IsoDate }

/* ── Mensagens ───────────────────────────────────────────────────────────────────────────────────────────── */

export const MESSAGE_KINDS = ["MENSAGEM", "EVIDENCIA", "PERGUNTA", "RESPOSTA", "PROPOSTA_IA", "SISTEMA", "ATA"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];
/** O que uma pessoa pode enviar pelo compositor (o resto é da IA ou do sistema). */
export const HUMAN_MESSAGE_KINDS = ["MENSAGEM", "EVIDENCIA", "PERGUNTA", "RESPOSTA"] as const;
export type HumanMessageKind = (typeof HUMAN_MESSAGE_KINDS)[number];

export type MessageAuthor = { kind: "PESSOA"; userId: string } | { kind: "IA" } | { kind: "SISTEMA" };

export const REFERENCE_KINDS = ["LINK", "ARQUIVO", "TAREFA", "DOCUMENTO"] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];
/** Anexo/referência de uma evidência (RF29.CA03): rótulo sempre; endereço só http(s) ou caminho interno do app. */
export interface EvidenceReference { kind: ReferenceKind; label: string; href: string | null }

/** Reações de qualidade: sinal para o grupo, nunca pontos (DECIA_SESSAO_E_MESA §E.3 "Nada por: reagir"). */
export const QUALITY_REACTIONS = ["UTIL", "BEM_FUNDAMENTADO", "ESCLARECEDOR", "PRECISA_DE_FONTE"] as const;
export type QualityReaction = (typeof QUALITY_REACTIONS)[number];

/** Trecho EXATO da Memória Institucional citado pela IA (`body.slice(start, end) === passage`), numerado na resposta. */
export interface MemoryCitation { n: number; docId: string; kind: MemoryKind; title: string; citation: string; passage: string; href: string | null }

/** Fatos calculados pelo sistema (D-12): a IA só repete o que veio daqui, nunca um número próprio. */
export type SessionFact =
  | { key: "PERGUNTAS_ABERTAS"; n: number; items: string[] }
  | { key: "EVIDENCIAS"; n: number; items: string[] }
  | { key: "ENCAMINHAMENTOS"; open: number; done: number; items: string[] }
  | { key: "DECISOES_EM_ATA"; n: number; items: string[] };

/** Resposta da IA do DECIA: só citações da Memória e fatos do sistema; sem nenhum dos dois, "não encontrei fonte". */
export interface AiAnswer { query: string; citations: MemoryCitation[]; facts: SessionFact[] }

export type SystemNotice =
  | { kind: "MODO_ALTERADO"; from: AutonomyMode; to: AutonomyMode; by: string; policyVersion: number; invalidated: number }
  | { kind: "TETO_ALTERADO"; ceiling: AutonomyMode; before: AutonomyMode; after: AutonomyMode; by: string; policyVersion: number; invalidated: number }
  | { kind: "ESTADO_ALTERADO"; from: SessionStatus; to: SessionStatus; by: string; reason: string | null }
  | { kind: "REUNIAO_INICIADA"; meetingId: string; title: string; by: string }
  | { kind: "ATA_CONTESTADA"; meetingId: string; title: string; by: string; reason: string }
  | { kind: "ENCAMINHAMENTO_CUMPRIDO"; followUpId: string; action: string; by: string; responsibleId: string };

/** Ganho (ou não) de DECIA Points mostrado com discrição só a quem recebe (sem ranking, sem contador público). */
export interface PointsNote {
  event: EarnEvent;
  userId: string;
  delta: number | null;
  status: "CREDITADO" | "TETO_ATINGIDO" | "DUPLICADO" | "NAO_CONFIRMADO" | "REGRA_INATIVA";
  /** motivo de não ter sido confirmado (ex.: SEM_REFERENCIA, REPETIDA) */
  reason?: string;
}

export interface SessionMessage {
  id: string;
  kind: MessageKind;
  author: MessageAuthor;
  at: IsoDate;
  /** texto escrito pela pessoa (dados do usuário, exibidos como estão); vazio nas mensagens estruturadas */
  text: string;
  reference?: EvidenceReference | null;
  /** RESPOSTA → PERGUNTA respondida */
  replyTo?: string | null;
  /** PERGUNTA: resposta aceita por quem perguntou (ou pelo proprietário) */
  acceptedAnswerId?: string | null;
  /** PERGUNTA dirigida à IA (o compositor "Perguntar à IA ✦") */
  toAi?: boolean;
  /** RESPOSTA da IA */
  ai?: AiAnswer;
  /** IA: quem pediu (null = sugestão espontânea, só nos modos que permitem) */
  requestedBy?: string | null;
  notice?: SystemNotice;
  proposalId?: string;
  meetingId?: string;
  /** ATA: versão publicada (1, 2… depois de correção) e o retrato do que foi ratificado (a mensagem não muda depois) */
  minutesVersion?: number;
  minutes?: MinutesDraft;
  meetingTitle?: string;
  reactions: Partial<Record<QualityReaction, string[]>>;
  points?: PointsNote[];
}

/* ── Minuta e propostas da IA (RF51) ─────────────────────────────────────────────────────────────────────── */

export type MinutaOrigin = "HUMANO" | "PROPOSTA_IA" | "PROPOSTA_IA_EDITADA" | "REVERSAO";
export interface MinutaRevision { revision: number; text: string; by: string; at: IsoDate; origin: MinutaOrigin; proposalId?: string; revertedFrom?: number }
/** Texto coletivo da sessão (§D "Minuta Coletiva", versão mínima): cada mudança é uma revisão nova; nada é apagado. */
export interface Minuta { revision: number; text: string; history: MinutaRevision[] }

export type ProposalStatus = "PENDENTE" | "ACEITA" | "EDITADA_E_ACEITA" | "REJEITADA";
/** Proposta da IA ✦ sobre a minuta: carrega a versão da política e a revisão-base (`AiProposal` de lib/ai/autonomy). */
export interface SessionProposal extends AiProposal {
  kind: "MINUTA";
  createdAt: IsoDate;
  /** modo efetivo da sessão quando a IA propôs */
  mode: AutonomyMode;
  requestedBy: string | null;
  /** texto da minuta quando a proposta foi calculada e o texto proposto (diff antes × depois) */
  baseText: string;
  text: string;
  status: ProposalStatus;
  resolvedBy?: string;
  resolvedAt?: IsoDate;
  reason?: string | null;
  appliedRevision?: number;
  revertedAt?: IsoDate;
}

/* ── Ata Viva (RF37) ─────────────────────────────────────────────────────────────────────────────────────── */

export const MEETING_SOURCES = ["TRANSCRICAO_COLADA", "ARQUIVO", "GRAVACAO_NAVEGADOR"] as const;
export type MeetingSource = (typeof MEETING_SOURCES)[number];
export type MeetingStatus = "GRAVANDO" | "TRANSCREVENDO" | "ATA_PROPOSTA" | "CONFIRMADA" | "CONTESTADA";

/** Trecho de origem de um item da ata: a frase exata e onde estava na transcrição. */
export interface SourceSpan { segment: number; line: number; speaker: string | null; text: string }

export interface MinutesItem { id: string; text: string; source: SourceSpan | null }

export type PersonMatch =
  | { status: "CASADO"; userId: string; raw: string }
  | { status: "AMBIGUO"; candidates: string[]; raw: string }
  | { status: "A_DEFINIR"; raw: string | null };

export interface DueDate { date: DateOnly; raw: string; kind: "ABSOLUTA" | "RELATIVA" }

export interface FollowUpDraft {
  id: string;
  action: string;
  /** responsável: casado com um membro, ambíguo ou "a definir" */
  responsible: PersonMatch;
  /** prazo calculado a partir da data-base da reunião (null = não encontrado) */
  due: DueDate | null;
  source: SourceSpan | null;
  /** revisão humana: aceito, recusado ou ainda sem decisão */
  accepted: boolean | null;
}

export interface SpeakerSummary { name: string; userId: string | null; utterances: { line: number; text: string }[] }

export interface MinutesDraft {
  baseDate: DateOnly;
  participants: { name: string; userId: string | null }[];
  agenda: MinutesItem[];
  speeches: SpeakerSummary[];
  decisions: MinutesItem[];
  followUps: FollowUpDraft[];
  pending: MinutesItem[];
  stats: { segments: number; speakers: number; words: number };
}

export interface Meeting {
  id: string;
  title: string;
  organizerId: string;
  createdAt: IsoDate;
  baseDate: DateOnly;
  source: MeetingSource;
  status: MeetingStatus;
  participantIds: string[];
  /** consentimento de gravação por participante (RF37.CA05; só GRAVACAO_NAVEGADOR) */
  consents: string[];
  transcript: string;
  fileName: string | null;
  /** compilação original da IA ✦ (imutável: base do "antes" na auditoria) */
  compiled: MinutesDraft | null;
  /** rascunho em revisão humana */
  draft: MinutesDraft | null;
  version: number;
  ratifiedAt?: IsoDate;
  ratifiedBy?: string;
  ratificationDeadlineAt?: IsoDate;
  ratifications: { userId: string; at: IsoDate; points?: PointsNote }[];
  contests: { userId: string; at: IsoDate; reason: string }[];
  minutesMessageId?: string;
}

export type FollowUpStatus = "ABERTO" | "CUMPRIDO";
export interface FollowUpTask {
  id: string;
  meetingId: string;
  /** id do encaminhamento no rascunho de origem (evita duplicar ao ratificar de novo) */
  draftId: string;
  action: string;
  responsibleId: string;
  dueDate: DateOnly;
  status: FollowUpStatus;
  createdAt: IsoDate;
  completedAt?: IsoDate;
  completedBy?: string;
  sourceText: string | null;
  points?: PointsNote;
}

/* ── Sessão e política da organização ────────────────────────────────────────────────────────────────────── */

export interface StatusChange { from: SessionStatus; to: SessionStatus; by: string; at: IsoDate; reason: string | null }

export interface DeciaSession {
  id: string;
  title: string;
  /** objetivo em 1 frase (Faixa de Objetivo, §B.2) */
  objective: string;
  status: SessionStatus;
  phase: DeliberationPhase;
  decisionId: string | null;
  projectId: string | null;
  accessClass: AccessClass;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  scheduledAt: IsoDate | null;
  participants: SessionParticipant[];
  /** política configurada pelo PROPRIETARIO (o modo efetivo também respeita o teto da organização) */
  policy: AiPolicy;
  messages: SessionMessage[];
  proposals: SessionProposal[];
  minuta: Minuta;
  meetings: Meeting[];
  followUps: FollowUpTask[];
  /** avisos ainda não lidos por pessoa (ids de mensagens SISTEMA) */
  unread: Record<string, string[]>;
  statusLog: StatusChange[];
}

export interface OrgPolicyVersion { ceiling: AutonomyMode; defaultMode: AutonomyMode; version: number; changedBy: string; changedAt: IsoDate }
/** Política de IA da organização (RF51 + D-156): teto de autonomia de todas as sessões e o padrão das novas. */
export interface OrgAiPolicy extends OrgPolicyVersion { history: OrgPolicyVersion[] }

/** Diretório mínimo de pessoas (nomes exibidos), o mesmo formato do DECIA. */
export type PeopleDirectory = Record<string, { name: string }>;

/* ── Resultado dos comandos ─────────────────────────────────────────────────────────────────────────────── */

export type SessionDenial =
  | AutonomyDenial
  | "SESSAO_NAO_ATIVA" | "NAO_PARTICIPA" | "TEXTO_VAZIO" | "TEXTO_LONGO" | "REFERENCIA_OBRIGATORIA" | "REFERENCIA_INVALIDA"
  | "RESPOSTA_SEM_PERGUNTA" | "AUTO_REACAO" | "MENSAGEM_INEXISTENTE" | "JA_RESPONDIDA" | "NAO_E_RESPOSTA_DA_PERGUNTA"
  | "TRANSICAO_INVALIDA" | "MOTIVO_OBRIGATORIO" | "ACIMA_DO_TETO" | "PADRAO_ACIMA_DO_TETO" | "PADRAO_AGENTE_PROIBIDO"
  | "PROPOSTA_INEXISTENTE" | "PROPOSTA_JA_RESOLVIDA" | "REVISAO_INEXISTENTE" | "NADA_A_REVERTER" | "MINUTA_MUDOU_DEPOIS" | "SEM_ALTERACAO"
  | "FONTE_NAO_PERMITIDA" | "REUNIAO_INEXISTENTE" | "ESTADO_DA_REUNIAO" | "CONSENTIMENTO_PENDENTE" | "TRANSCRICAO_VAZIA"
  | "ATA_INVALIDA" | "NAO_PARTICIPOU" | "JA_RATIFICOU" | "PRAZO_ENCERRADO" | "ENCAMINHAMENTO_INEXISTENTE" | "JA_CUMPRIDO"
  | "DATA_INVALIDA" | "TITULO_VAZIO";

export type CommandResult<T> = ({ ok: true } & T) | { ok: false; reason: SessionDenial };
