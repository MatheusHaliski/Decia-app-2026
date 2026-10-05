package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.OrgEntityEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code org_entities} (RF20, RF41). Gerado pelo SchemaGenerator; consultas específicas entram
 * por RF.
 */
public interface OrgEntityRepository extends JpaRepository<OrgEntityEntity, UUID> {
}
