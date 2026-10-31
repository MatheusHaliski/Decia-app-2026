package br.gov.pr.secid.workstation.infrastructure.mysql.institutional;

import br.gov.pr.secid.workstation.application.institutional.InstitutionDirectoryPort;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.CompanyEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity.DepartmentEntity;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Adaptador JPA da {@link InstitutionDirectoryPort} (RF14, RF15, RF6): só leitura de {@code companies}, {@code departments} e
 * {@code department_memberships} (V10) cruzados com {@code users.status}. A projeção de {@link Company} sai sem CNPJ nem políticas.
 * Consultas com {@code getResultList()} (seguras fora de transação).
 */
@Configuration
public class JpaInstitutionDirectoryAdapter {
    private static final Map<DeptRole, Integer> STRENGTH = new EnumMap<>(Map.of(DeptRole.MEMBRO, 0, DeptRole.CURADOR, 1, DeptRole.CHEFE, 2));
    private static final Comparator<Department> BY_LABEL = Comparator
            .comparing((Department d) -> (d.acronym() == null || d.acronym().isBlank() ? d.name() : d.acronym()).toLowerCase(Locale.ROOT))
            .thenComparing(d -> d.name().toLowerCase(Locale.ROOT));

    @Bean
    InstitutionDirectoryPort institutionDirectoryPort(EntityManager em) {
        return new InstitutionDirectoryPort() {
            @Override
            public List<Department> departmentsBySlug(String slug) {
                return em.createQuery("select d from DepartmentEntity d where d.slug = :s", DepartmentEntity.class)
                        .setParameter("s", slug).getResultList().stream().map(JpaInstitutionDirectoryAdapter::toDomain).toList();
            }

            @Override
            public Optional<Company> companyBySlug(String slug) {
                return em.createQuery("select c from CompanyEntity c where c.slug = :s", CompanyEntity.class)
                        .setParameter("s", slug).setMaxResults(1).getResultList().stream().findFirst()
                        .map(JpaInstitutionDirectoryAdapter::toDomain);
            }

            @Override
            public Optional<Company> company(UUID id) {
                return id == null ? Optional.empty() : Optional.ofNullable(em.find(CompanyEntity.class, id)).map(JpaInstitutionDirectoryAdapter::toDomain);
            }

            @Override
            public Optional<Company> companyOwnedBy(UUID ownerUserId) {
                return em.createQuery("select c from CompanyEntity c where c.ownerUserId = :u order by c.createdAt, c.slug", CompanyEntity.class)
                        .setParameter("u", ownerUserId).setMaxResults(1).getResultList().stream().findFirst()
                        .map(JpaInstitutionDirectoryAdapter::toDomain);
            }

            @Override
            public List<Department> activeDepartmentsOf(UUID companyId) {
                return em.createQuery("select d from DepartmentEntity d where d.companyId = :c and d.active = true", DepartmentEntity.class)
                        .setParameter("c", companyId).getResultList().stream().map(JpaInstitutionDirectoryAdapter::toDomain)
                        .sorted(BY_LABEL).toList();
            }

            @Override
            public Map<UUID, DeptRole> activeMembers(UUID departmentId, int limit) {
                List<Object[]> rows = em.createQuery("select m.userId, m.roleInDept from DepartmentMembershipEntity m, UserEntity u "
                                + "where u.id = m.userId and m.departmentId = :d and m.endedAt is null and u.status = :active "
                                + "order by m.startedAt, m.userId", Object[].class)
                        .setParameter("d", departmentId).setParameter("active", AccountStatus.ACTIVE).getResultList();
                Map<UUID, DeptRole> out = new LinkedHashMap<>();
                for (Object[] r : rows) {
                    if (r.length < 2 || !(r[0] instanceof UUID user) || !(r[1] instanceof DeptRole role)) {
                        continue;
                    }
                    if (!out.containsKey(user) && out.size() >= Math.max(1, limit)) {
                        continue;
                    }
                    out.merge(user, role, (a, b) -> STRENGTH.get(a) >= STRENGTH.get(b) ? a : b);
                }
                return out;
            }

            @Override
            public long countActiveMembers(UUID departmentId) {
                return em.createQuery("select count(distinct m.userId) from DepartmentMembershipEntity m, UserEntity u "
                                + "where u.id = m.userId and m.departmentId = :d and m.endedAt is null and u.status = :active", Long.class)
                        .setParameter("d", departmentId).setParameter("active", AccountStatus.ACTIVE).getSingleResult();
            }

            @Override
            public long countActivePeople(UUID companyId) {
                return em.createQuery("select count(u) from UserEntity u where u.companyId = :c and u.status = :active "
                                + "and u.profileType <> :empresa", Long.class)
                        .setParameter("c", companyId).setParameter("active", AccountStatus.ACTIVE)
                        .setParameter("empresa", ProfileType.EMPRESA).getSingleResult();
            }

            @Override
            public List<Department> activeDepartmentsOfMember(UUID userId) {
                return em.createQuery("select distinct d from DepartmentEntity d, DepartmentMembershipEntity m "
                                + "where m.departmentId = d.id and m.userId = :u and m.endedAt is null and d.active = true", DepartmentEntity.class)
                        .setParameter("u", userId).getResultList().stream().map(JpaInstitutionDirectoryAdapter::toDomain)
                        .sorted(BY_LABEL).toList();
            }
        };
    }

    static Department toDomain(DepartmentEntity e) {
        return new Department(e.getId(), e.getCompanyId(), e.getName(), e.getAcronym(), e.getSlug(), e.getColor(), e.getMonogram(),
                e.getHeadUserId(), e.getAbout(), e.getCoverUrl(), e.isActive());
    }

    /** Sem CNPJ (cifrado) nem políticas: a página pública não precisa deles. */
    static Company toDomain(CompanyEntity e) {
        return new Company(e.getId(), e.getOwnerUserId(), e.getLegalName(), e.getSlug(), null, e.getLogoUrl(), e.getCoatOfArmsUrl(),
                e.getAbout(), e.getWebsiteUrl(), e.getAccentColor(), null, null, null, null, null, e.getStatus());
    }
}
