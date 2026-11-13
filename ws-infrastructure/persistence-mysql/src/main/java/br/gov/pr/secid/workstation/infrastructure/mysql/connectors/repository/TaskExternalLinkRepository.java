package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.TaskExternalLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code task_external_links} (RF20, RF8, RF23). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface TaskExternalLinkRepository extends JpaRepository<TaskExternalLinkEntity, UUID> {
}
