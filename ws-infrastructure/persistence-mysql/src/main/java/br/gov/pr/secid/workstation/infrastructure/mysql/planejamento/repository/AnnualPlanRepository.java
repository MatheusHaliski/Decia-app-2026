package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity.AnnualPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code annual_plans} (RF24, RF11, RF21, RF39, RF44). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface AnnualPlanRepository extends JpaRepository<AnnualPlanEntity, UUID> {
}
