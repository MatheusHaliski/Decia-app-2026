package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity.SessionArchiveEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code session_archives} (RF17, RF18, RF33). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface SessionArchiveRepository extends JpaRepository<SessionArchiveEntity, UUID> {
}
