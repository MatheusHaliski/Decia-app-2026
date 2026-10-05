package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.MetricDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repositório Spring Data de {@code metric_definitions} (RF43, RF18). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MetricDefinitionRepository extends JpaRepository<MetricDefinitionEntity, String> {
}
