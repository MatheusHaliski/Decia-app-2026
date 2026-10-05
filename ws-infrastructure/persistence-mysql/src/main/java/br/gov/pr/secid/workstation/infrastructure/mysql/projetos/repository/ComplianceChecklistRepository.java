package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ComplianceChecklistEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code compliance_checklists} (RF32, RF11, RF39, RF45). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ComplianceChecklistRepository extends JpaRepository<ComplianceChecklistEntity, UUID> {
}
