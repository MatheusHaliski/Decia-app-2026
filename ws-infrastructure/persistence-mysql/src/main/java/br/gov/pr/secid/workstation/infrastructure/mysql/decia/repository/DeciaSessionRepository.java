package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.DeciaSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decia_sessions} (RF4, RF5, RF9, RF6, RF11, RF12, RF14, RF15, RF17, RF29, RF33). Gerado
 * pelo SchemaGenerator; consultas específicas entram por RF.
 */
public interface DeciaSessionRepository extends JpaRepository<DeciaSessionEntity, UUID> {
}
