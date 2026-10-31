package br.gov.pr.secid.workstation.application.institutional;

import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Leitura do catálogo institucional para as páginas públicas (RF14, RF15, RF6; auditoria Onda 1): {@code companies}, {@code departments}
 * e {@code department_memberships} (V10). Só lê; quem cria e lota é o RF28. Adaptador JPA em persistence-mysql. As projeções de
 * {@link Company} nunca carregam o CNPJ nem as políticas (JSON).
 */
public interface InstitutionDirectoryPort {

    /** Departamentos com este slug (o slug é único só dentro da empresa), ativos ou não. */
    List<Department> departmentsBySlug(String slug);

    Optional<Company> companyBySlug(String slug);

    Optional<Company> company(UUID id);

    /** Empresa cuja conta dona ({@code owner_user_id}) é a pessoa. */
    Optional<Company> companyOwnedBy(UUID ownerUserId);

    /** Departamentos ATIVOS da empresa, por sigla/nome. */
    List<Department> activeDepartmentsOf(UUID companyId);

    /**
     * Pessoas com conta ATIVA e lotação vigente ({@code ended_at} nulo) no departamento → papel mais forte (CHEFE &gt; CURADOR &gt; MEMBRO),
     * até {@code limit}, em ordem estável.
     */
    Map<UUID, DeptRole> activeMembers(UUID departmentId, int limit);

    /** Quantas pessoas com conta ATIVA têm lotação vigente no departamento (cada pessoa conta uma vez). */
    long countActiveMembers(UUID departmentId);

    /** Pessoas com conta ATIVA da empresa ({@code users.company_id}), sem a conta institucional EMPRESA. */
    long countActivePeople(UUID companyId);

    /** Departamentos ATIVOS em que a pessoa tem lotação vigente. */
    List<Department> activeDepartmentsOfMember(UUID userId);
}
