package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.DepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code departments} (RF28, RF14, RF19, RF24, RF25, RF35, RF39). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DepartmentRepository extends JpaRepository<DepartmentEntity, UUID> {
}
