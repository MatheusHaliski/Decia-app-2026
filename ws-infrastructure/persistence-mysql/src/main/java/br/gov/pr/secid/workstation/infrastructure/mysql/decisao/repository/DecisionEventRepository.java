package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionEventEntity;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_events} (RF29, RF43). Gerado pelo SchemaGenerator; append-only: só insere e
 * lê — nenhum update/delete exposto (a entidade é @Immutable).
 */
public interface DecisionEventRepository extends Repository<DecisionEventEntity, UUID> {

    DecisionEventEntity save(DecisionEventEntity entity);

    Optional<DecisionEventEntity> findById(UUID id);

    long count();
}
