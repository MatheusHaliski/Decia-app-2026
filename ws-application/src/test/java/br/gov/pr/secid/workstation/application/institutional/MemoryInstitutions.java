package br.gov.pr.secid.workstation.application.institutional;

import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

/**
 * {@link InstitutionDirectoryPort} em memória, com as mesmas regras do adaptador JPA: lotação vigente = {@code endedAt} nulo, só contas
 * ATIVAS contam, papel mais forte por pessoa, departamentos por sigla/nome. As contas vêm de uma função (o mapa do teste).
 */
public class MemoryInstitutions implements InstitutionDirectoryPort {
    public final Map<UUID, Company> companies = new LinkedHashMap<>();
    public final Map<UUID, Department> departments = new LinkedHashMap<>();
    public final List<Membership> memberships = new ArrayList<>();
    private final Function<UUID, Optional<User>> users;

    public record Membership(UUID userId, UUID departmentId, DeptRole role, Instant startedAt, Instant endedAt) {
    }

    public MemoryInstitutions(Function<UUID, Optional<User>> users) {
        this.users = users;
    }

    public Company company(UUID owner, String slug, String name, CompanyStatus status) {
        Company c = new Company(UUID.randomUUID(), owner, name, slug, null, null, null, "Sobre " + name, "https://" + slug + ".gov.br", "orange",
                null, null, null, null, null, status);
        companies.put(c.id(), c);
        return c;
    }

    public Department department(Company c, String slug, String acronym, UUID head, boolean active) {
        Department d = new Department(UUID.randomUUID(), c.id(), "Departamento " + acronym, acronym, slug, "blue", acronym.substring(0, 1), head,
                "Sobre " + acronym, null, active);
        departments.put(d.id(), d);
        return d;
    }

    public void lota(UUID user, Department d, DeptRole role) {
        memberships.add(new Membership(user, d.id(), role, Instant.parse("2026-01-01T00:00:00Z"), null));
    }

    public void encerra(UUID user, Department d) {
        memberships.replaceAll(m -> m.userId().equals(user) && m.departmentId().equals(d.id()) && m.endedAt() == null
                ? new Membership(m.userId(), m.departmentId(), m.role(), m.startedAt(), Instant.parse("2026-10-01T00:00:00Z")) : m);
    }

    private boolean active(UUID user) {
        return users.apply(user).map(u -> u.getStatus() == AccountStatus.ACTIVE).orElse(false);
    }

    private static final Comparator<Department> BY_LABEL = Comparator.comparing(d -> d.acronym() == null ? d.name() : d.acronym());

    @Override
    public List<Department> departmentsBySlug(String slug) {
        return departments.values().stream().filter(d -> d.slug().equals(slug)).toList();
    }

    @Override
    public Optional<Company> companyBySlug(String slug) {
        return companies.values().stream().filter(c -> c.slug().equals(slug)).findFirst();
    }

    @Override
    public Optional<Company> company(UUID id) {
        return Optional.ofNullable(companies.get(id));
    }

    @Override
    public Optional<Company> companyOwnedBy(UUID ownerUserId) {
        return companies.values().stream().filter(c -> c.ownerUserId().equals(ownerUserId)).findFirst();
    }

    @Override
    public List<Department> activeDepartmentsOf(UUID companyId) {
        return departments.values().stream().filter(d -> d.companyId().equals(companyId) && d.active()).sorted(BY_LABEL).toList();
    }

    @Override
    public Map<UUID, DeptRole> activeMembers(UUID departmentId, int limit) {
        Map<UUID, DeptRole> out = new LinkedHashMap<>();
        for (Membership m : memberships) {
            if (!m.departmentId().equals(departmentId) || m.endedAt() != null || !active(m.userId())) {
                continue;
            }
            if (!out.containsKey(m.userId()) && out.size() >= limit) {
                continue;
            }
            out.merge(m.userId(), m.role(), (a, b) -> strength(a) >= strength(b) ? a : b);
        }
        return out;
    }

    private static int strength(DeptRole r) {
        return switch (r) {
            case CHEFE -> 2;
            case CURADOR -> 1;
            default -> 0;
        };
    }

    @Override
    public long countActiveMembers(UUID departmentId) {
        return memberships.stream().filter(m -> m.departmentId().equals(departmentId) && m.endedAt() == null && active(m.userId()))
                .map(Membership::userId).distinct().count();
    }

    /** No fake, "pessoas da empresa" vem da lista {@code people} informada pelo teste. */
    public final List<User> people = new ArrayList<>();

    @Override
    public long countActivePeople(UUID companyId) {
        return people.stream().filter(u -> companyId.equals(u.getCompanyId()) && u.getStatus() == AccountStatus.ACTIVE
                && u.getProfileType() != ProfileType.EMPRESA).count();
    }

    @Override
    public List<Department> activeDepartmentsOfMember(UUID userId) {
        return memberships.stream().filter(m -> m.userId().equals(userId) && m.endedAt() == null).map(m -> departments.get(m.departmentId()))
                .filter(d -> d != null && d.active()).distinct().sorted(BY_LABEL).toList();
    }
}
