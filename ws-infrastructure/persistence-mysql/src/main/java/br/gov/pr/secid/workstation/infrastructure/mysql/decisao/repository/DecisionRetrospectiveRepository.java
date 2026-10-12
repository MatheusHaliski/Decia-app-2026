package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionRetrospectiveEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_retrospectives} (RF29, RF33). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionRetrospectiveRepository extends JpaRepository<DecisionRetrospectiveEntity, UUID> {
}
