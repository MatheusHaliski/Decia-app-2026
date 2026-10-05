package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity.ProcessKitEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Repositório Spring Data de {@code process_kits} (RF21, RF40, RF43). Gerado pelo SchemaGenerator; consultas específicas
 * entram por RF.
 */
public interface ProcessKitRepository extends JpaRepository<ProcessKitEntity, UUID> {
}
