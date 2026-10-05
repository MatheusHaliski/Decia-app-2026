package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import org.springframework.data.repository.Repository;

import java.util.UUID;

/** Só {@code save}: a trilha é append-only (nenhum método de UPDATE/DELETE exposto). */
public interface AuditLogJpaRepository extends Repository<AuditLogEntity, UUID> {
    AuditLogEntity save(AuditLogEntity entity);

    long count();
}
