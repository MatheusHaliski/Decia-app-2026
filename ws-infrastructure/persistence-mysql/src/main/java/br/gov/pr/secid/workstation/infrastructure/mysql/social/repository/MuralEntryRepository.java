package br.gov.pr.secid.workstation.infrastructure.mysql.social.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.social.entity.MuralEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code mural_entries} (RF27, RF15, RF35, RF42). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface MuralEntryRepository extends JpaRepository<MuralEntryEntity, UUID> {
}
