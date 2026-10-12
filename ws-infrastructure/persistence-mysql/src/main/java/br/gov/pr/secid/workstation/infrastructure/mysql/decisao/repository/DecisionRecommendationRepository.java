package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionRecommendationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_recommendations} (RF29, RF43). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionRecommendationRepository extends JpaRepository<DecisionRecommendationEntity, UUID> {
}
