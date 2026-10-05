package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.WeekPlanDayEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code week_plan_days} (RF44). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface WeekPlanDayRepository extends JpaRepository<WeekPlanDayEntity, UUID> {
}
