package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskBriefEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code task_briefs} (RF4, RF12, RF41). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface TaskBriefRepository extends JpaRepository<TaskBriefEntity, UUID> {
}
