/**
 * Trilha de auditoria das intervenções humanas sobre o que a IA produziu (RF29 Rastro de Decisão, RF43 autoridade humana,
 * RF51.CA02/CA05). Cada registro diz QUEM fez O QUÊ, QUANDO, sob QUAL política de IA e POR QUÊ, com o conteúdo ANTES, a proposta
 * da IA (quando houver) e o DEPOIS — para comparar as versões antes e depois da aprovação humana. Somente acréscimo: não existe
 * operação de edição nem de exclusão; cada registro carrega o hash do anterior (adulteração aparece na verificação).
 */
import type { AutonomyMode } from "@/lib/ai/autonomy";

export const AUDIT_ACTIONS = ["ACEITOU", "EDITOU_E_ACEITOU", "REJEITOU", "REVERTEU"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGETS = ["PROPOSTA_MINUTA", "ATA", "ENCAMINHAMENTO", "RECOMENDACAO_IA", "RECOMENDACAO_MODELO", "DECISAO"] as const;
export type AuditTargetKind = (typeof AUDIT_TARGETS)[number];

export type AuditSource = "SESSAO" | "DECISAO";

export interface AuditInput {
  at: string;
  actorId: string;
  action: AuditAction;
  source: AuditSource;
  sessionId: string | null;
  decisionId: string | null;
  /** título da sessão/decisão no momento do registro (o registro não muda se o título mudar depois) */
  contextTitle: string | null;
  target: { kind: AuditTargetKind; id: string; label: string };
  /** política de IA vigente na intervenção; null quando a origem não registra (decisão estruturada) */
  policy: { mode: AutonomyMode; version: number } | null;
  reason: string | null;
  /** conteúdo antes da intervenção */
  before: string;
  /** o que a IA propôs (null quando não se aplica, ex.: reversão) */
  proposed: string | null;
  /** conteúdo depois da intervenção */
  after: string;
}

export interface AuditRecord extends AuditInput {
  id: string;
  seq: number;
  /** hash do registro anterior da cadeia ("0"×64 no primeiro) e o deste (SHA-256 do JSON canônico + anterior) */
  prevHash: string;
  hash: string;
  /** true = gravado no livro somente-acréscimo; false = derivado das versões de uma decisão (lib/decia) */
  chained: boolean;
}
