package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.DeciaPointsRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code decia_points_rules} (RF42, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DeciaPointsRuleRepository extends JpaRepository<DeciaPointsRuleEntity, UUID> {
}
