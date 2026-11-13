/**
 * Dossiê de Transição de Gestão / Handoff (RF36) — tipos do front, espelhando o diagrama de classes do README do RF36
 * (`HandoffDossier`, `HandoffItem`, `HandoffStatus`, `HandoffReason`). O dossiê reúne, de uma pessoa que muda de setor, sai ou
 * encerra uma gestão: projetos, tarefas, decisões, pendências, riscos, contatos e fontes de conhecimento; cada item transferível
 * ganha um sucessor; o sucessor dá ciência. Só dado de trabalho: nome e papel das pessoas, nunca contato pessoal (LGPD).
 */
import type { ViewerProfile } from "@/lib/viewer/profiles";

/** Motivos: os três do pedido (mudança de setor = TRANSFERENCIA, saída, fim de gestão) e a troca de chefia do RF28.CA07. */
export const HANDOFF_REASONS = ["TRANSFERENCIA", "SAIDA", "FIM_GESTAO", "TROCA_CHEFE"] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

/** Máquina de estados do RF36 §4. */
export const HANDOFF_STATUSES = ["GERADO", "AGUARDANDO_SUCESSOR", "TRANSFERIDO", "RECUSADO", "CANCELADO"] as const;
export type HandoffStatus = (typeof HANDOFF_STATUSES)[number];

export const HANDOFF_SECTIONS = ["PROJETOS", "TAREFAS", "DECISOES", "PENDENCIAS", "RISCOS", "CONTATOS", "FONTES"] as const;
export type HandoffSection = (typeof HANDOFF_SECTIONS)[number];

/** De onde veio o item: API real (Acervo logado), repositório DEMO (Mesa, DECIA, exemplo do laboratório) ou Memória Institucional. */
export type ItemSource = "API" | "DEMO" | "MEMORIA";

/** Pendências, da mais grave para a menos grave (a ordem é usada para escolher a marca de um item e para ordenar a lista). */
export const PENDENCY_KINDS = ["PRAZO_LEGAL", "VENCIDA", "DECISAO_ATRASADA", "BLOQUEADA", "REVISAO_PROXIMA", "MUDANCA_PENDENTE"] as const;
export type PendencyKind = (typeof PENDENCY_KINDS)[number];

/** Fato curto e já calculado sobre um item: chave i18n + variáveis (a tela e a exportação traduzem). */
export interface Fact {
  key: string;
  vars?: Record<string, string | number>;
}

export interface HandoffItem {
  /** estável dentro do dossiê: `projeto:<id>`, `tarefa:<id>`, `decisao:<id>`, `risco:<id>`, `mudanca:<id>`, `contato:<id>`, `fonte:<n>` */
  id: string;
  section: HandoffSection;
  title: string;
  facts: Fact[];
  href: string | null;
  source: ItemSource;
  /** tem responsabilidade a passar (projeto, tarefa, decisão, risco, mudança, comunicação); contatos e fontes são leitura */
  transferable: boolean;
  successorId: string | null;
  note: string;
  /** marca de pendência (o item aparece também na lista de pendências) */
  pendency?: PendencyKind;
  /** prazo (AAAA-MM-DD) para ordenar pendências */
  due?: string | null;
  /** fonte de conhecimento com trecho exato (Memória Institucional): texto e referência para citar */
  citation?: { text: string; ref: string };
  /** item SIGILOSO: entra só por referência, sem título nem conteúdo */
  restricted?: boolean;
}

export const CHECK_IDS = ["SUCESSORES", "PENDENCIAS", "PRIVADOS", "CONTATOS", "FONTES", "PRESERVACAO", "CIENCIA"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export interface HandoffEvent {
  at: string;
  actorId: string;
  /** chave curta do que aconteceu (`gerado`, `sucessor`, `enviado`, `ciencia`, `recusa`, `cancelado`) */
  kind: "GERADO" | "SUCESSOR" | "ENVIADO" | "CIENCIA" | "RECUSA" | "CANCELADO" | "CHECK";
  vars?: Record<string, string | number>;
}

export interface HandoffDossier {
  id: string;
  version: number;
  subjectId: string;
  subjectName: string;
  reason: HandoffReason;
  /** data em que a transição vale (AAAA-MM-DD) */
  effectiveDate: string;
  /** data de referência da coleta (AAAA-MM-DD): vencidas e prazos legais são contados a partir dela */
  collectedOn: string;
  requestedById: string;
  requestedByName: string;
  requestedByProfile: ViewerProfile;
  createdAt: string;
  updatedAt: string;
  status: HandoffStatus;
  defaultSuccessorId: string | null;
  /** RF36.CA05: itens PRIVADOS só com o consentimento do titular; sem ele, ficam de fora e só a contagem aparece */
  consentForPrivateItems: boolean;
  privateExcluded: number;
  items: HandoffItem[];
  /** itens marcados à mão no checklist (os automáticos são calculados) */
  manualChecks: Partial<Record<CheckId, boolean>>;
  /** ciência de cada sucessor (o dossiê fica TRANSFERIDO quando todos deram ciência) */
  acknowledgments: { successorId: string; at: string }[];
  refusal: { successorId: string; at: string; reason: string } | null;
  cancellation: { at: string; reason: string } | null;
  /** fontes de dados usadas na coleta (para o selo DEMO e para a exportação) */
  sources: ItemSource[];
  history: HandoffEvent[];
}

/** Pessoa do diretório (só nome; nada de contato pessoal). */
export interface HandoffPerson {
  id: string;
  name: string;
}
