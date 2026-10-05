package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskStateLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code task_state_log} (RF41, RF12, RF44, RF46). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface TaskStateLogRepository extends JpaRepository<TaskStateLogEntity, UUID> {
}
