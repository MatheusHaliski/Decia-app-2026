package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.DecisionReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_reviews} (RF15, RF29, RF42). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionReviewRepository extends JpaRepository<DecisionReviewEntity, UUID> {
}
