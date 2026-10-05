package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity.HandoffDossierEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code handoff_dossiers} (RF36, RF25, RF28). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface HandoffDossierRepository extends JpaRepository<HandoffDossierEntity, UUID> {
}
