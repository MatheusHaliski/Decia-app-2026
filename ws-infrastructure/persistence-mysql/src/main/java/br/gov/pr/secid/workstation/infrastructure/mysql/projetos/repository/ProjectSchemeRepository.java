package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProjectSchemeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code project_schemes} (RF21, RF22, RF23, RF24, RF25, RF29, RF30, RF31, RF32, RF43). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ProjectSchemeRepository extends JpaRepository<ProjectSchemeEntity, UUID> {
}
