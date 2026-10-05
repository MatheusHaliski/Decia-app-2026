package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.PendingUploadEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code pending_uploads} (RF1, RF3). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface PendingUploadRepository extends JpaRepository<PendingUploadEntity, UUID> {
}
