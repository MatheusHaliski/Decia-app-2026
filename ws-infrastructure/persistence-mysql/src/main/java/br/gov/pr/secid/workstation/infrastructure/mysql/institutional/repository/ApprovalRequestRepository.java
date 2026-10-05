package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.ApprovalRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code approval_requests} (RF1, RF28, RF3, RF18). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequestEntity, UUID> {
}
