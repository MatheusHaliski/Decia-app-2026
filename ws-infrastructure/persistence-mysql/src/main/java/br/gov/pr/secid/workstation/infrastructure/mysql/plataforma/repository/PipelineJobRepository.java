package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity.PipelineJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code pipeline_jobs} (RF3, RF20, RF33, RF37, RF38, RF43, RF44, RF45). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface PipelineJobRepository extends JpaRepository<PipelineJobEntity, UUID> {
}
