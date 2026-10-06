package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_events} (RF29, RF43). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DecisionEventRepository extends JpaRepository<DecisionEventEntity, UUID> {
}
