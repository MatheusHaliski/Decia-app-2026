package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.ReactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code reactions} (RF26, RF27, RF42, RF45). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ReactionRepository extends JpaRepository<ReactionEntity, UUID> {
}
