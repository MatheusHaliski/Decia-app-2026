package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity.DecisionForecastEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code decision_forecasts} (RF29). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface DecisionForecastRepository extends JpaRepository<DecisionForecastEntity, UUID> {
}
