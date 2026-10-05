package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity.GroupingItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code grouping_items} (RF25). Gerado pelo SchemaGenerator; consultas específicas entram por
 * RF.
 */
public interface GroupingItemRepository extends JpaRepository<GroupingItemEntity, UUID> {
}
