package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.SealEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code seals} (RF39, RF20, RF21, RF28, RF40, RF45). Gerado pelo SchemaGenerator; consultas
 * específicas entram por RF.
 */
public interface SealRepository extends JpaRepository<SealEntity, UUID> {
}
