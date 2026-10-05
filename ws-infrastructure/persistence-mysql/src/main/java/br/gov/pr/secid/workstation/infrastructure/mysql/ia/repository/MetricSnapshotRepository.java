package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.MetricSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code metric_snapshots} (RF18, RF43). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface MetricSnapshotRepository extends JpaRepository<MetricSnapshotEntity, UUID> {
}
