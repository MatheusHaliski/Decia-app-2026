/**
 * Filtros da trilha de auditoria (sessão, pessoa, tipo de intervenção, período) e a escolha da comparação padrão. Funções puras:
 * a tela só monta os controles.
 */
import type { AuditAction, AuditRecord } from "./types";

export interface AuditFilters {
  /** id da sessão; "DECISOES" = só as revisões das decisões estruturadas; "" = todas */
  session: string;
  actor: string;
  action: AuditAction | "";
  /** "AAAA-MM-DD" inclusive (data do registro em UTC) */
  from: string;
  to: string;
}

export const NO_AUDIT_FILTERS: AuditFilters = { session: "", actor: "", action: "", from: "", to: "" };

export function filterAudit(records: readonly AuditRecord[], f: AuditFilters): AuditRecord[] {
  return records.filter((r) => {
    if (f.session === "DECISOES" ? r.source !== "DECISAO" : f.session && r.sessionId !== f.session) return false;
    if (f.actor && r.actorId !== f.actor) return false;
    if (f.action && r.action !== f.action) return false;
    const day = r.at.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
}

/** Mais recente primeiro; empate pela ordem de gravação. */
export const sortAudit = (records: readonly AuditRecord[]) =>
  [...records].sort((a, b) => (a.at === b.at ? b.seq - a.seq : a.at < b.at ? 1 : -1));

export type CompareMode = "PROPOSTA_APROVADO" | "ANTES_DEPOIS";
/** Comparação padrão: quando a pessoa editou a proposta da IA, mostra proposta × aprovado; senão, antes × depois. */
export function defaultCompare(r: Pick<AuditRecord, "action" | "proposed" | "before" | "after">): CompareMode {
  if (r.proposed !== null && (r.action === "EDITOU_E_ACEITOU" || r.action === "REJEITOU" || !r.before)) return "PROPOSTA_APROVADO";
  return "ANTES_DEPOIS";
}

export function compareTexts(r: Pick<AuditRecord, "proposed" | "before" | "after">, mode: CompareMode): { left: string; right: string } {
  return mode === "PROPOSTA_APROVADO" && r.proposed !== null ? { left: r.proposed, right: r.after } : { left: r.before, right: r.after };
}
