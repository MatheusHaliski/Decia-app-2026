package br.gov.pr.secid.workstation.domain.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Só inserção e leitura: a trilha é append-only (nenhum método de update/delete é usado pela aplicação). */
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
}
