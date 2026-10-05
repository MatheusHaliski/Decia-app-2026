package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code project_tasks} (RF21, RF22, RF23, RF29, RF43, RF44). Gerado pelo SchemaGenerator;
 * consultas específicas entram por RF.
 */
public interface ProjectTaskRepository extends JpaRepository<ProjectTaskEntity, UUID> {
}
