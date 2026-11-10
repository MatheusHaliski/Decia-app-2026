package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity.ConnectorAccountEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code connector_accounts} (RF20, RF4, RF23, RF34). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface ConnectorAccountRepository extends JpaRepository<ConnectorAccountEntity, UUID> {
}
