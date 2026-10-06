package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionSnapshotEntity;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_snapshots} (RF29, RF33). Gerado pelo SchemaGenerator; append-only: só insere
 * e lê — nenhum update/delete exposto (a entidade é @Immutable).
 */
public interface DecisionSnapshotRepository extends Repository<DecisionSnapshotEntity, UUID> {

    DecisionSnapshotEntity save(DecisionSnapshotEntity entity);

    Optional<DecisionSnapshotEntity> findById(UUID id);

    long count();
}
