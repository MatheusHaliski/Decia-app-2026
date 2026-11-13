package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.ConnectorOAuthStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code connector_oauth_states} (RF20, RF4). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ConnectorOAuthStateRepository extends JpaRepository<ConnectorOAuthStateEntity, UUID> {
}
