package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity.EfficiencyScoreSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code hse_snapshots} (RF44, RF43, RF45, RF3). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface EfficiencyScoreSnapshotRepository extends JpaRepository<EfficiencyScoreSnapshotEntity, UUID> {
}
