package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.WeekPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code week_plans} (RF44, RF19). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface WeekPlanRepository extends JpaRepository<WeekPlanEntity, UUID> {
}
