package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.EvidenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code evidences} (RF41, RF20, RF29). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface EvidenceRepository extends JpaRepository<EvidenceEntity, UUID> {
}
