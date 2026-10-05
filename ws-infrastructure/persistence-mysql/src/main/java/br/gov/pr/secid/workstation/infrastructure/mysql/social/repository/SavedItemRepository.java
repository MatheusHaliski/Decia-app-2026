package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.SavedItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code saved_items} (RF26, RF27, RF19). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface SavedItemRepository extends JpaRepository<SavedItemEntity, UUID> {
}
