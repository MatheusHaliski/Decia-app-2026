package br.gov.pr.secid.workstation.infrastructure.mysql.ia.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity.InsightEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code insights} (RF43, RF19, RF21). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface InsightRepository extends JpaRepository<InsightEntity, UUID> {
}
