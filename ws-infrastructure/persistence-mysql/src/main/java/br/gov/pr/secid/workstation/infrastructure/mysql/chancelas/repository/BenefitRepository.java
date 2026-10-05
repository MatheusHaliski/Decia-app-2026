package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity.BenefitEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code benefits} (RF39, RF35, RF19, RF42). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface BenefitRepository extends JpaRepository<BenefitEntity, UUID> {
}
