package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.CollectiveGoalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code collective_goals} (RF35, RF21, RF27, RF39, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface CollectiveGoalRepository extends JpaRepository<CollectiveGoalEntity, UUID> {
}
