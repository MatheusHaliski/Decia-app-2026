package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity.AssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code assignments} (RF46, RF10, RF18, RF19, RF44). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface AssignmentRepository extends JpaRepository<AssignmentEntity, UUID> {
}
