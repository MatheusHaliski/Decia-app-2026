package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.KitItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code kit_items} (RF21, RF40). Gerado pelo SchemaGenerator; consultas específicas entram por
 * RF.
 */
public interface KitItemRepository extends JpaRepository<KitItemEntity, UUID> {
}
