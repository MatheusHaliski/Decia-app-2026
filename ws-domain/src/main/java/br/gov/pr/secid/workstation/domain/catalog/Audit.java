package br.gov.pr.secid.workstation.domain.catalog;

/** Colunas de auditoria da tabela. */
public enum Audit {
    /** created_at + updated_at (AuditableEntity). */
    FULL,
    /** Só created_at: linha append-only (trilhas, extratos, logs). */
    CREATED,
    /** Nenhuma coluna de auditoria automática (o record declara os carimbos que precisa). */
    NONE
}
