package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ComplianceItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code compliance_items} (RF32). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface ComplianceItemRepository extends JpaRepository<ComplianceItemEntity, UUID> {
}
