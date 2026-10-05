package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.DailyTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code daily_tasks} (RF44, RF19, RF43, RF45, RF46). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface DailyTaskRepository extends JpaRepository<DailyTaskEntity, UUID> {
}
