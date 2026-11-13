/**
 * Exportação da trilha (CSV e JSON) — o que está filtrado na tela, com os textos completos (antes, proposta, depois) e o hash de
 * cada registro. Colunas com nomes estáveis (para planilhas e ferramentas de auditoria). Células que começam com = + - @ ou
 * tabulação recebem um apóstrofo (injeção de fórmula em planilha, OWASP CSV Injection).
 */
import type { AuditRecord } from "./types";

export const CSV_COLUMNS = [
  "id", "seq", "data_hora", "pessoa_id", "pessoa", "acao", "origem", "sessao_id", "decisao_id", "contexto", "alvo_tipo", "alvo_id", "alvo",
  "politica_modo", "politica_versao", "motivo", "antes", "proposta_ia", "depois", "hash", "hash_anterior", "encadeado",
] as const;

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function auditToCsv(records: readonly AuditRecord[], nameOf: (id: string) => string): string {
  const rows = records.map((r) => [
    r.id, r.seq, r.at, r.actorId, nameOf(r.actorId), r.action, r.source, r.sessionId, r.decisionId, r.contextTitle, r.target.kind, r.target.id, r.target.label,
    r.policy?.mode ?? null, r.policy?.version ?? null, r.reason, r.before, r.proposed, r.after, r.hash, r.prevHash, r.chained,
  ].map(csvCell).join(","));
  // BOM: planilhas abrem o UTF-8 com acentos corretos
  return `﻿${[CSV_COLUMNS.join(","), ...rows].join("\r\n")}\r\n`;
}

export function auditToJson(records: readonly AuditRecord[], meta: { exportedAt: string; source: string; filters: Record<string, string>; chainOk: boolean }): string {
  return JSON.stringify({ ...meta, count: records.length, records }, null, 2);
}

export const exportFileName = (ext: "csv" | "json", now: Date) => `auditoria-decia-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
