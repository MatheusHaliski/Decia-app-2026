package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity.DecisionTraceNodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code decision_trace_nodes} (RF29, RF22, RF38, RF41, RF45). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DecisionTraceNodeRepository extends JpaRepository<DecisionTraceNodeEntity, UUID> {
}
