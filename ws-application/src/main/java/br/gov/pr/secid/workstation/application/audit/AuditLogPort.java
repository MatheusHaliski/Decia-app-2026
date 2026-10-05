package br.gov.pr.secid.workstation.application.audit;

/** Escrita no {@code audit_log} (só INSERT). O adaptador JPA fica em persistence-mysql; os testes usam uma lista. */
public interface AuditLogPort {
    void record(AuditEvent event);
}
