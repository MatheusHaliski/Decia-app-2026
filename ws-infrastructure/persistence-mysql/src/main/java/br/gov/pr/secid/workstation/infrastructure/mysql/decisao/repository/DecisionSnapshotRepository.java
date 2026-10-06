package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_snapshots} (RF29, RF33). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface DecisionSnapshotRepository extends JpaRepository<DecisionSnapshotEntity, UUID> {
}
