package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.SealProposalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code seal_proposals} (RF39). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface SealProposalRepository extends JpaRepository<SealProposalEntity, UUID> {
}
