package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.ExtractionCorrectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code extraction_corrections} (RF34). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface ExtractionCorrectionRepository extends JpaRepository<ExtractionCorrectionEntity, UUID> {
}
