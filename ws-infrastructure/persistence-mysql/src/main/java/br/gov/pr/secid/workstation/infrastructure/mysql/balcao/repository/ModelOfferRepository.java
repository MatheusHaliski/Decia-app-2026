package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity.ModelOfferEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code model_offers} (RF40, RF19, RF21, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ModelOfferRepository extends JpaRepository<ModelOfferEntity, UUID> {
}
