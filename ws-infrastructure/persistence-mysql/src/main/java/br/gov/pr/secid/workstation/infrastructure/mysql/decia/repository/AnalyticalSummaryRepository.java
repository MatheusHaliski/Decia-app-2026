package br.gov.pr.secid.workstation.infrastructure.mysql.decia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity.AnalyticalSummaryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code analytical_summaries} (RF11, RF12, RF29, RF31, RF32, RF33). Gerado pelo
 * SchemaGenerator; consultas específicas entram por RF.
 */
public interface AnalyticalSummaryRepository extends JpaRepository<AnalyticalSummaryEntity, UUID> {
}
