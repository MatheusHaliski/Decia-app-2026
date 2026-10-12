package br.gov.pr.secid.workstation.infrastructure.mysql.security;

import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.DepartmentMembershipEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Consulta de lotações vigentes para o {@code Viewer} (D-66). Fica fora do repositório gerado pelo SchemaGenerator (que é reescrito a
 * cada mudança de domínio) e só lê.
 */
public interface ActiveMembershipQueries extends Repository<DepartmentMembershipEntity, UUID> {

    /** Linhas {@code [departmentId, roleInDept]} das lotações com {@code ended_at} nulo. */
    @Query("select m.departmentId, m.roleInDept from DepartmentMembershipEntity m where m.userId = :userId and m.endedAt is null")
    List<Object[]> activeRoles(@Param("userId") UUID userId);
}
