package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code project_versions} (RF22, RF31). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ProjectVersionRepository extends JpaRepository<ProjectVersionEntity, UUID> {
}
