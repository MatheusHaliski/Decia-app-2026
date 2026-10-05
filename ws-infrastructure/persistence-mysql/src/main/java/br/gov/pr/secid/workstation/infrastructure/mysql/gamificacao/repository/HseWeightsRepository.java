package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.HseWeightsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code hse_weights} (RF44, RF43). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface HseWeightsRepository extends JpaRepository<HseWeightsEntity, UUID> {
}
