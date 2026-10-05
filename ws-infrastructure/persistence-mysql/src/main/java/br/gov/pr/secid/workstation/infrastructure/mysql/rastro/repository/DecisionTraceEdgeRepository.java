package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity.DecisionTraceEdgeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_trace_edges} (RF29, RF22, RF41). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DecisionTraceEdgeRepository extends JpaRepository<DecisionTraceEdgeEntity, UUID> {
}
