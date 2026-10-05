package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.SessionParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code session_participants} (RF5, RF9, RF10, RF42). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface SessionParticipantRepository extends JpaRepository<SessionParticipantEntity, UUID> {
}
