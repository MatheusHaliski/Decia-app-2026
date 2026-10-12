package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectScenarioEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code project_scenarios} (RF31, RF11, RF29). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ProjectScenarioRepository extends JpaRepository<ProjectScenarioEntity, UUID> {
}
