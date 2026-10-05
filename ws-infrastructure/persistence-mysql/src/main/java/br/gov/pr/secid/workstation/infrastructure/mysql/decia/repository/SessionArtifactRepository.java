package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.SessionArtifactEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code session_artifacts} (RF13, RF29, RF33). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface SessionArtifactRepository extends JpaRepository<SessionArtifactEntity, UUID> {
}
