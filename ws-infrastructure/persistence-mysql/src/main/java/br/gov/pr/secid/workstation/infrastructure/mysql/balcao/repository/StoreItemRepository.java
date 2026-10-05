package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity.StoreItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code store_items} (RF42, RF38, RF40). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface StoreItemRepository extends JpaRepository<StoreItemEntity, UUID> {
}
