package br.gov.pr.secid.workstation.application.institutional;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.application.social.FollowRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Páginas públicas de departamento (RF14) e empresa (RF15) e a parte institucional do próprio perfil (RF6) — auditoria Onda 1, 31/10/2026.
 * Visibilidade: qualquer conta autenticada (mesma regra do perfil público). Departamento inexistente, inativo, de empresa não visível ou
 * com slug ambíguo, e empresa inexistente, não ATIVA ou com a conta dona não ATIVA, respondem o MESMO 404 pelo {@link ResourceAuthorizer}.
 * Contadores só com fonte real: pessoas ativas com lotação vigente, departamentos ativos e seguidores ATIVOS. Pessoas saem na projeção
 * pública (nome, usuário, cargo, foto, papel na lotação), nunca com contato, e só quem o controle de publicação (RF3) deixa ver.
 */
@Service
public class InstitutionPageService {
    /** Teto da lista de equipe (página única por ora; paginação entra com as sub-abas do RF14.CA02). */
    public static final int MEMBERS_LIMIT = 200;
    private static final Pattern SLUG = Pattern.compile("[a-z0-9][a-z0-9-]{0,79}");
    private static final Map<DeptRole, Integer> ROLE_ORDER = Map.of(DeptRole.CHEFE, 0, DeptRole.CURADOR, 1, DeptRole.MEMBRO, 2);

    private final InstitutionDirectoryPort directory;
    private final UserRepositoryPort users;
    private final FollowRepositoryPort follows;
    private final ResourceAuthorizer authorizer;

    public InstitutionPageService(InstitutionDirectoryPort directory, UserRepositoryPort users, FollowRepositoryPort follows,
                                  ResourceAuthorizer authorizer) {
        this.directory = directory;
        this.users = users;
        this.follows = follows;
        this.authorizer = authorizer;
    }

    // ------------------------------------------------------------------------------------------------ projeções

    /** Pessoa na projeção pública (sem contato); {@code role} = papel na lotação quando a lista é de um departamento. */
    public record PersonCard(UUID id, String username, String name, String jobTitle, String avatarUrl, String role) {
        static PersonCard of(User u, DeptRole role) {
            String name = u.getDisplayName() == null || u.getDisplayName().isBlank() ? u.getFullName() : u.getDisplayName();
            return new PersonCard(u.getId(), u.getUsername(), name, u.getJobTitle(), u.getAvatarUrl(), role == null ? null : role.name());
        }
    }

    /** Empresa citada em outra página (link para {@code /companies/{slug}}). */
    public record CompanyRef(UUID id, String slug, String name, String accentColor) {
        static CompanyRef of(Company c) {
            return new CompanyRef(c.id(), c.slug(), c.legalName(), c.accentColor());
        }
    }

    /** RF14.CA01 — cabeçalho do departamento com contadores reais. */
    public record DepartmentPageView(UUID id, String slug, String acronym, String name, String color, String monogram, String about,
                                     String coverUrl, CompanyRef company, PersonCard head, long members, long followers, boolean member) {
    }

    /** Departamento numa lista (empresa, perfil empresarial). */
    public record DepartmentSummary(UUID id, String slug, String companySlug, String acronym, String name, String color, String monogram,
                                    long members) {
    }

    /** RF15.CA01 — cabeçalho da empresa com contadores reais. */
    public record CompanyPageView(UUID id, String slug, String name, String about, String websiteUrl, String accentColor,
                                  PersonCard account, long departments, long people, long followers, boolean owner) {
    }

    /**
     * RF6 — parte institucional do próprio perfil: a empresa da conta EMPRESA (dona) com os departamentos ativos e o total de pessoas,
     * ou, para as demais contas, a empresa e os departamentos da lotação vigente. {@code company} nulo = sem vínculo.
     */
    public record MyInstitutionView(CompanyRef company, String companyStatus, boolean owner, List<DepartmentSummary> departments,
                                    Long people) {
    }

    // ------------------------------------------------------------------------------------------------ departamento (RF14)

    public DepartmentPageView department(CurrentUser actor, String slug, String companySlug) {
        Viewer v = authorizer.viewer(actor);
        Department d = resolveDepartment(v, slug, companySlug);
        Company c = directory.company(d.companyId()).orElseThrow();
        PersonCard head = Optional.ofNullable(d.headUserId()).flatMap(users::findById)
                .filter(u -> u.getStatus() == AccountStatus.ACTIVE && ResourceAuthorizer.profileVisibleTo(v, u))
                .map(u -> PersonCard.of(u, DeptRole.CHEFE)).orElse(null);
        return new DepartmentPageView(d.id(), d.slug(), d.acronym(), d.name(), d.color(), d.monogram(), d.about(), safeUrl(d.coverUrl()),
                CompanyRef.of(c), head, directory.countActiveMembers(d.id()), follows.countFollowers(FollowTargetType.DEPARTMENT, d.id()),
                v.deptRoles().containsKey(d.id()));
    }

    /** RF14.CA02 (Equipe, modo público): pessoas ativas com lotação vigente que quem vê pode ver; chefia primeiro, depois por nome. */
    public List<PersonCard> members(CurrentUser actor, String slug, String companySlug) {
        Viewer v = authorizer.viewer(actor);
        Department d = resolveDepartment(v, slug, companySlug);
        List<PersonCard> out = new ArrayList<>();
        for (Map.Entry<UUID, DeptRole> m : directory.activeMembers(d.id(), MEMBERS_LIMIT).entrySet()) {
            users.findById(m.getKey())
                    .filter(u -> u.getStatus() == AccountStatus.ACTIVE && ResourceAuthorizer.profileVisibleTo(v, u))
                    .ifPresent(u -> out.add(PersonCard.of(u, m.getValue())));
        }
        out.sort(Comparator.<PersonCard>comparingInt(p -> ROLE_ORDER.getOrDefault(DeptRole.valueOf(p.role()), 9))
                .thenComparing(p -> p.name() == null ? "" : p.name().toLowerCase(Locale.ROOT)));
        return List.copyOf(out);
    }

    /** Departamento visível pelo slug (marca a trilha; 404 uniforme) — também usado por seguir. */
    public Department visibleDepartment(CurrentUser actor, String slug, String companySlug) {
        return resolveDepartment(authorizer.viewer(actor), slug, companySlug);
    }

    private Department resolveDepartment(Viewer v, String slug, String companySlug) {
        Map<UUID, Boolean> companyCache = new HashMap<>();
        String s = normalizeSlug(slug);
        String cs = companySlug == null || companySlug.isBlank() ? null : normalizeSlug(companySlug);
        List<Department> candidates = new ArrayList<>();
        if (s != null && (companySlug == null || companySlug.isBlank() || cs != null)) {
            for (Department d : directory.departmentsBySlug(s)) {
                if (d.active() && companyCache.computeIfAbsent(d.companyId(), this::companyVisible)
                        && (cs == null || directory.company(d.companyId()).map(c -> cs.equals(c.slug())).orElse(false))) {
                    candidates.add(d);
                }
            }
        }
        if (candidates.size() > 1) {
            // o slug só é único dentro da empresa: sem ?company=, vale o da empresa de quem vê; senão é ambíguo (404)
            candidates.removeIf(d -> !d.companyId().equals(v.companyId()));
        }
        Department found = candidates.size() == 1 ? candidates.get(0) : null;
        authorizer.requireDepartmentVisible(v, found != null);
        if (found == null) {
            // o autorizador já recusou com 404; a guarda deixa isso explícito para quem lê (e para a análise estática)
            throw ApiException.notFound("Departamento");
        }
        return found;
    }

    // ------------------------------------------------------------------------------------------------ empresa (RF15)

    public CompanyPageView company(CurrentUser actor, String slug) {
        Viewer v = authorizer.viewer(actor);
        Company c = resolveCompany(v, slug);
        PersonCard account = users.findById(c.ownerUserId()).filter(u -> ResourceAuthorizer.profileVisibleTo(v, u))
                .map(u -> PersonCard.of(u, null)).orElse(null);
        return new CompanyPageView(c.id(), c.slug(), c.legalName(), c.about(), safeUrl(c.websiteUrl()), c.accentColor(), account,
                directory.activeDepartmentsOf(c.id()).size(), directory.countActivePeople(c.id()),
                follows.countFollowers(FollowTargetType.COMPANY, c.id()), v.is(c.ownerUserId()));
    }

    /** RF15.CA02 (Departamentos): os ativos da empresa, com o total de pessoas de cada um. */
    public List<DepartmentSummary> departmentsOf(CurrentUser actor, String slug) {
        Company c = resolveCompany(authorizer.viewer(actor), slug);
        return summaries(c, directory.activeDepartmentsOf(c.id()));
    }

    /** Empresa visível pelo slug (marca a trilha; 404 uniforme) — também usado por seguir. */
    public Company visibleCompany(CurrentUser actor, String slug) {
        return resolveCompany(authorizer.viewer(actor), slug);
    }

    private Company resolveCompany(Viewer v, String slug) {
        String s = normalizeSlug(slug);
        Company c = s == null ? null : directory.companyBySlug(s).filter(x -> companyVisible(x.id())).orElse(null);
        authorizer.requireCompanyVisible(v, c != null);
        if (c == null) {
            throw ApiException.notFound("Empresa");
        }
        return c;
    }

    /** Empresa ATIVA cuja conta dona está ATIVA (RF15.CA01: dona pendente de validação → 404). */
    private boolean companyVisible(UUID companyId) {
        return directory.company(companyId)
                .filter(c -> c.status() == CompanyStatus.ATIVA)
                .flatMap(c -> users.findById(c.ownerUserId()))
                .map(owner -> owner.getStatus() == AccountStatus.ACTIVE).orElse(false);
    }

    // ------------------------------------------------------------------------------------------------ perfil empresarial (RF6)

    public MyInstitutionView mine(CurrentUser actor) {
        User me = authorizer.ownAccount(actor);
        if (me.getProfileType() == ProfileType.EMPRESA) {
            Optional<Company> owned = directory.companyOwnedBy(me.getId());
            if (owned.isPresent()) {
                Company c = owned.get();
                return new MyInstitutionView(CompanyRef.of(c), c.status() == null ? null : c.status().name(), true,
                        summaries(c, directory.activeDepartmentsOf(c.id())), directory.countActivePeople(c.id()));
            }
            return new MyInstitutionView(null, null, true, List.of(), null);
        }
        Optional<Company> company = Optional.ofNullable(me.getCompanyId()).filter(this::companyVisible).flatMap(directory::company);
        if (company.isEmpty()) {
            return new MyInstitutionView(null, null, false, List.of(), null);
        }
        Company c = company.get();
        List<Department> mine = directory.activeDepartmentsOfMember(me.getId()).stream().filter(d -> d.companyId().equals(c.id())).toList();
        return new MyInstitutionView(CompanyRef.of(c), c.status().name(), false, summaries(c, mine), null);
    }

    // ------------------------------------------------------------------------------------------------ apoio

    private List<DepartmentSummary> summaries(Company c, List<Department> departments) {
        return departments.stream().filter(Department::active)
                .map(d -> new DepartmentSummary(d.id(), d.slug(), c.slug(), d.acronym(), d.name(), d.color(), d.monogram(),
                        directory.countActiveMembers(d.id())))
                .toList();
    }

    static String normalizeSlug(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.strip().toLowerCase(Locale.ROOT);
        return SLUG.matcher(s).matches() ? s : null;
    }

    /** Só {@code https://} ou caminho interno vão para {@code href}/{@code src}; o resto é omitido. */
    static String safeUrl(String url) {
        if (url == null) {
            return null;
        }
        String u = url.strip();
        return u.startsWith("https://") || (u.startsWith("/") && !u.startsWith("//")) ? u : null;
    }
}
