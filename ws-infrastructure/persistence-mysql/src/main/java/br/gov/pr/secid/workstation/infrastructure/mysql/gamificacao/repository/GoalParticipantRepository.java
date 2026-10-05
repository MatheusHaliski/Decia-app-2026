package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.GoalParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code goal_participants} (RF35). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface GoalParticipantRepository extends JpaRepository<GoalParticipantEntity, UUID> {
}
