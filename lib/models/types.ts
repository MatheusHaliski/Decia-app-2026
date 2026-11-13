/**
 * Balcão de Modelos (RF40): ofertas de tarefas, projetos e kits como modelos reutilizáveis entre departamentos, com preço opcional em
 * DECIA Points (0 = grátis), licença e prateleira (Chancelados · Comunidade). Vocabulário do README do RF40 (`ModelOffer`,
 * `ModelLicense`, `Shelf`, `OfferStatus`). Quem reutilizou fica só nos registros internos (licença e contagem): as telas mostram a
 * quantidade, nunca as pessoas.
 */
import type { WorkArea } from "@/lib/tasks/client";

export const MODEL_KINDS = ["TAREFA", "PROJETO", "KIT"] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

/** SOMENTE_LEITURA: consulta como referência · ATRIBUICAO: cópia com crédito imutável ao autor · COPIA_LIVRE: cópia editável. */
export const MODEL_LICENSES = ["COPIA_LIVRE", "ATRIBUICAO", "SOMENTE_LEITURA"] as const;
export type ModelLicense = (typeof MODEL_LICENSES)[number];

export const SHELVES = ["CHANCELADO", "COMUNIDADE"] as const;
export type Shelf = (typeof SHELVES)[number];

export const OFFER_STATUSES = ["ATIVA", "RETIRADA", "ESGOTADA"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export type ModelSource =
  | { type: "TASK_TEMPLATE"; templateId: string }
  | { type: "PROJECT"; projectId: string }
  | { type: "KIT"; templateIds: readonly string[] };

export interface ModelOffer {
  id: string;
  kind: ModelKind;
  title: string;
  /** como usar o modelo (texto do autor) */
  usageDescription: string;
  area: WorkArea;
  /** sigla do departamento de origem (null = conta institucional) */
  department: string | null;
  authorId: string;
  authorName: string;
  license: ModelLicense;
  /** preço em DECIA Points; 0 = grátis */
  pricePoints: number;
  shelf: Shelf;
  /** nome da chancela que pôs o modelo na prateleira Chancelados (RF39) */
  sealName: string | null;
  status: OfferStatus;
  createdAt: string;
  source: ModelSource;
  /** reutilizações por outras pessoas (o autor usando o próprio modelo não conta) */
  reuseCount: number;
  viewsCount: number;
  /** DECIA Points recebidos pelo autor com este modelo */
  pointsEarned: number;
}

/** Licença de uso comprada: uma por oferta e pessoa (`idempotencyKey` = REMIX + oferta + comprador, README do RF40). */
export interface LicenseGrant {
  offerId: string;
  userId: string;
  pricePaid: number;
  at: string;
  debitEntryId: string | null;
  creditEntryId: string | null;
}
