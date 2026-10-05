package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.ChefeProfileExtensionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code user_chefe_ext} (RF1, RF28). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ChefeProfileExtensionRepository extends JpaRepository<ChefeProfileExtensionEntity, UUID> {
}
