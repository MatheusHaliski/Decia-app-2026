package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.repository;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.DepartmentMembershipEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/** Repositório Spring Data de {@code department_memberships} (RF28, RF21, RF36). Gerado pelo SchemaGenerator; consultas específicas entram por RF. */
public interface DepartmentMembershipRepository extends JpaRepository<DepartmentMembershipEntity, UUID> {
}
