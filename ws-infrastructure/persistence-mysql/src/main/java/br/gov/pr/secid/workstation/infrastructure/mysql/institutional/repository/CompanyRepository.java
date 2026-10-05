package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.CompanyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code companies} (RF28, RF19, RF24, RF25, RF35, RF39, RF42, RF45). Gerado pelo
 * SchemaGenerator; consultas específicas entram por RF.
 */
public interface CompanyRepository extends JpaRepository<CompanyEntity, UUID> {
}
