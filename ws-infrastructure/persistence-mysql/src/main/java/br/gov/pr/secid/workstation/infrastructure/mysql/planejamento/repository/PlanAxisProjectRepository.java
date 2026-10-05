package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity.PlanAxisProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code plan_axis_projects} (RF24, RF21). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface PlanAxisProjectRepository extends JpaRepository<PlanAxisProjectEntity, UUID> {
}
