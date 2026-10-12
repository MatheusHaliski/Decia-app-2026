package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_participants} (RF29, RF5). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DecisionParticipantRepository extends JpaRepository<DecisionParticipantEntity, UUID> {
}
