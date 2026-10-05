package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity.StorePurchaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code store_purchases} (RF42, RF38). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface StorePurchaseRepository extends JpaRepository<StorePurchaseEntity, UUID> {
}
