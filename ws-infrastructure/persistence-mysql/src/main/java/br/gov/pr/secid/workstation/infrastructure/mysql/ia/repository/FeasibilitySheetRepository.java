package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.FeasibilitySheetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code feasibility_sheets} (RF43, RF30, RF21). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface FeasibilitySheetRepository extends JpaRepository<FeasibilitySheetEntity, UUID> {
}
