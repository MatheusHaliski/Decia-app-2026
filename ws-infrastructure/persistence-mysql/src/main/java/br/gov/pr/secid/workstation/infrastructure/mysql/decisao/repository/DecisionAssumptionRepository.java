package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionAssumptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_assumptions} (RF29, RF31). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DecisionAssumptionRepository extends JpaRepository<DecisionAssumptionEntity, UUID> {
}
