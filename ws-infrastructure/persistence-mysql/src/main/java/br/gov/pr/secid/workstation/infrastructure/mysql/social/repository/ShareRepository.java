package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.ShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code shares} (RF26, RF27, RF29). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface ShareRepository extends JpaRepository<ShareEntity, UUID> {
}
