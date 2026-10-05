package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity.PlanAxisEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code plan_axes} (RF24, RF21, RF31, RF32). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface PlanAxisRepository extends JpaRepository<PlanAxisEntity, UUID> {
}
