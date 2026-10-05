package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity.HandoffItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code handoff_items} (RF36). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface HandoffItemRepository extends JpaRepository<HandoffItemEntity, UUID> {
}
