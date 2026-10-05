package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.RankingWeightsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code ranking_weights} (RF43, RF28). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface RankingWeightsRepository extends JpaRepository<RankingWeightsEntity, UUID> {
}
