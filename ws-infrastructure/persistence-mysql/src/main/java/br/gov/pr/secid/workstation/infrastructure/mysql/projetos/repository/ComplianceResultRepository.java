package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ComplianceResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code compliance_results} (RF32, RF11, RF39). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ComplianceResultRepository extends JpaRepository<ComplianceResultEntity, UUID> {
}
