package br.gov.pr.secid.workstation.application.audit;

/**
 * Porta da trilha de auditoria. O adaptador (persistence-mysql) grava em transação própria ({@code REQUIRES_NEW}),
 * para a linha sobreviver ao rollback do caso de uso que falhou (login errado, acesso negado) e levar o
 * {@code correlationId} do MDC.
 */
public interface AuditPort {
    void record(AuditEntry entry);
}
