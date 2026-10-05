package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.ExtractionResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code extraction_results} (RF34, RF20, RF21). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ExtractionResultRepository extends JpaRepository<ExtractionResultEntity, UUID> {
}
