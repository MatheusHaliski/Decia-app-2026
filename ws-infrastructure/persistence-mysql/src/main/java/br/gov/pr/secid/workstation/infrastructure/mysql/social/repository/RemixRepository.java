package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.RemixEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code remixes} (RF26, RF23, RF40, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface RemixRepository extends JpaRepository<RemixEntity, UUID> {
}
