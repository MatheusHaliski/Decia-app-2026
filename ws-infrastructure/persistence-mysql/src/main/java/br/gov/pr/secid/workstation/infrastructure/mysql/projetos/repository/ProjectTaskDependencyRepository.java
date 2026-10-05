package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectTaskDependencyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code project_task_dependencies} (RF21, RF43). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ProjectTaskDependencyRepository extends JpaRepository<ProjectTaskDependencyEntity, UUID> {
}
