package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.SealBondEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code seal_bonds} (RF39, RF20, RF21, RF40, RF42, RF45). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface SealBondRepository extends JpaRepository<SealBondEntity, UUID> {
}
