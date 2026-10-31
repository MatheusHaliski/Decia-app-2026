package br.gov.pr.secid.workstation.application.institutional;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.CompanyPageView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.DepartmentPageView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.MyInstitutionView;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService.PersonCard;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.application.social.MemoryFollows;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RF14/RF15/RF6 (auditoria Onda 1): páginas de departamento e empresa com contadores reais, 404 uniforme para inexistente/inativo/
 * ambíguo/empresa não visível, equipe sem contas não ativas nem perfis que o controle de publicação (RF3) esconde, e a parte
 * institucional do próprio perfil.
 */
class InstitutionPageServiceTest {
    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryInstitutions directory = new MemoryInstitutions(id -> Optional.ofNullable(people.get(id)));
    final MemoryFollows follows = new MemoryFollows();
    final InstitutionPageService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        service = new InstitutionPageService(directory, users, follows, new ResourceAuthorizer(users, Optional.empty()));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(String name, ProfileType type, AccountStatus status, UUID companyId) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(name.toLowerCase(java.util.Locale.ROOT));
        u.setFullName(name);
        u.setJobTitle("Cargo de " + name);
        u.setEmail(name + "@exemplo.gov.br");
        u.setPhone("+5541999990000");
        u.setRole(Role.USER);
        u.setProfileType(type);
        u.setStatus(status);
        u.setCompanyId(companyId);
        people.put(u.getId(), u);
        directory.people.add(u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    /** Empresa ATIVA com a dona ATIVA e um departamento com chefe, duas pessoas ativas, uma suspensa e uma com lotação encerrada. */
    final class Cenario {
        final User dona = person("Dona", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        final Company secid = directory.company(dona.getId(), "secid", "Secretaria das Cidades", CompanyStatus.ATIVA);
        final User chefe = person("Chefe", ProfileType.CHEFE_DEPARTAMENTO, AccountStatus.ACTIVE, secid.id());
        final User ana = person("Ana", ProfileType.EMPREGADO, AccountStatus.ACTIVE, secid.id());
        final User bruno = person("Bruno", ProfileType.EMPREGADO, AccountStatus.SUSPENDED, secid.id());
        final User carla = person("Carla", ProfileType.EMPREGADO, AccountStatus.ACTIVE, secid.id());
        final User visitante = person("Visitante", ProfileType.EMPREGADO, AccountStatus.ACTIVE, null);
        final Department uts = directory.department(secid, "uts", "UTS", chefe.getId(), true);
        final Department antigo = directory.department(secid, "antigo", "ANT", null, false);

        Cenario() {
            directory.lota(chefe.getId(), uts, DeptRole.MEMBRO);
            directory.lota(chefe.getId(), uts, DeptRole.CHEFE);
            directory.lota(ana.getId(), uts, DeptRole.MEMBRO);
            directory.lota(bruno.getId(), uts, DeptRole.MEMBRO);
            directory.lota(carla.getId(), uts, DeptRole.MEMBRO);
            directory.encerra(carla.getId(), uts);
        }
    }

    private void seguir(User who, FollowTargetType type, UUID target, FollowStatus status) {
        follows.save(new Follow(UUID.randomUUID(), who.getId(), type, target, status, Instant.now()));
    }

    @Test
    void cabecalhoDoDepartamentoComContadoresReaisEChefeSemContato() {
        Cenario c = new Cenario();
        seguir(c.ana, FollowTargetType.DEPARTMENT, c.uts.id(), FollowStatus.ATIVO);
        seguir(c.visitante, FollowTargetType.DEPARTMENT, c.uts.id(), FollowStatus.ATIVO);
        seguir(c.carla, FollowTargetType.DEPARTMENT, c.uts.id(), FollowStatus.REMOVIDO);

        DepartmentPageView v = service.department(cu(c.visitante), "UTS", null);
        assertThat(AuthorizationTrail.last()).isEqualTo("DEPARTMENT");
        assertThat(v.acronym()).isEqualTo("UTS");
        assertThat(v.color()).isEqualTo("blue");
        assertThat(v.company().slug()).isEqualTo("secid");
        assertThat(v.members()).as("chefe + Ana; Bruno suspenso e Carla com lotação encerrada não contam").isEqualTo(2);
        assertThat(v.followers()).as("só seguidores ATIVOS").isEqualTo(2);
        assertThat(v.head().username()).isEqualTo("chefe");
        assertThat(v.head().role()).isEqualTo("CHEFE");
        assertThat(v.toString()).doesNotContain("exemplo.gov.br").doesNotContain("+5541");
        assertThat(v.member()).isFalse();
    }

    @Test
    void departamentoInexistenteInativoOuDeEmpresaNaoVisivelResponde404Uniforme() {
        Cenario c = new Cenario();
        User donaPendente = person("Pendente", ProfileType.EMPRESA, AccountStatus.PENDING_VALIDATION, null);
        Company pendente = directory.company(donaPendente.getId(), "pendente", "Órgão pendente", CompanyStatus.ATIVA);
        directory.department(pendente, "dp", "DP", null, true);
        Company suspensa = directory.company(c.dona.getId(), "suspensa", "Suspensa", CompanyStatus.SUSPENSA);
        directory.department(suspensa, "ds", "DS", null, true);
        for (String slug : new String[] {"nao-existe", "antigo", "dp", "ds", "../uts", "", "x".repeat(81)}) {
            AuthorizationTrail.clear();
            ApiException e = catchThrowableOfType(ApiException.class, () -> service.department(cu(c.ana), slug, null));
            assertThat(e.status()).as(slug).isEqualTo(404);
            assertThat(e.getMessage()).isEqualTo("Departamento não encontrado(a)");
            assertThat(AuthorizationTrail.checked()).as("a trilha é marcada também na recusa").isTrue();
        }
        ApiException members = catchThrowableOfType(ApiException.class, () -> service.members(cu(c.ana), "antigo", null));
        assertThat(members.status()).isEqualTo(404);
    }

    @Test
    void slugRepetidoEmDuasEmpresasUsaAEmpresaDeQuemVeOuOParametroCompany() {
        Cenario c = new Cenario();
        User outraDona = person("Outra", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        Company outra = directory.company(outraDona.getId(), "outra", "Outra empresa", CompanyStatus.ATIVA);
        Department utsOutra = directory.department(outra, "uts", "UTS2", null, true);
        User daOutra = person("Daniel", ProfileType.EMPREGADO, AccountStatus.ACTIVE, outra.id());

        assertThat(service.department(cu(c.ana), "uts", null).id()).isEqualTo(c.uts.id());
        assertThat(service.department(cu(daOutra), "uts", null).id()).isEqualTo(utsOutra.id());
        assertThat(service.department(cu(c.ana), "uts", "outra").id()).isEqualTo(utsOutra.id());
        ApiException ambiguo = catchThrowableOfType(ApiException.class, () -> service.department(cu(c.visitante), "uts", null));
        assertThat(ambiguo.status()).as("sem empresa e sem ?company= é ambíguo").isEqualTo(404);
        ApiException errada = catchThrowableOfType(ApiException.class, () -> service.department(cu(c.ana), "uts", "nao-existe"));
        assertThat(errada.status()).isEqualTo(404);
    }

    @Test
    void equipeTemSoContasAtivasComLotacaoVigenteChefiaPrimeiroERespeitaOControleDePublicacao() {
        Cenario c = new Cenario();
        c.ana.setProfileVisibility(ProfileVisibility.EMPRESA);

        assertThat(service.members(cu(c.chefe), "uts", null)).extracting(PersonCard::username).containsExactly("chefe", "ana");
        assertThat(service.members(cu(c.visitante), "uts", null)).as("Ana só aparece para a mesma empresa")
                .extracting(PersonCard::username).containsExactly("chefe");
        assertThat(service.department(cu(c.visitante), "uts", null).members()).as("o total é agregado, não nominal").isEqualTo(2);

        c.chefe.setProfileVisibility(ProfileVisibility.EMPRESA);
        assertThat(service.department(cu(c.visitante), "uts", null).head()).as("chefe escondido para quem é de fora").isNull();
        assertThat(service.department(cu(c.ana), "uts", null).head()).isNotNull();
    }

    @Test
    void empresaComContadoresReaisSiteSeguroEDonaPendenteOuInativaDao404() {
        Cenario c = new Cenario();
        directory.department(c.secid, "uap", "UAP", null, true);
        seguir(c.ana, FollowTargetType.COMPANY, c.secid.id(), FollowStatus.ATIVO);
        seguir(c.carla, FollowTargetType.COMPANY, c.secid.id(), FollowStatus.REMOVIDO);

        CompanyPageView v = service.company(cu(c.visitante), "secid");
        assertThat(AuthorizationTrail.last()).isEqualTo("COMPANY");
        assertThat(v.name()).isEqualTo("Secretaria das Cidades");
        assertThat(v.departments()).as("UTS e UAP ativos; ANT inativo").isEqualTo(2);
        assertThat(v.people()).as("chefe, Ana e Carla ativos; Bruno suspenso; a conta EMPRESA não conta").isEqualTo(3);
        assertThat(v.followers()).isEqualTo(1);
        assertThat(v.websiteUrl()).isEqualTo("https://secid.gov.br");
        assertThat(v.owner()).isFalse();
        assertThat(v.account().username()).isEqualTo("dona");
        assertThat(service.company(cu(c.dona), "secid").owner()).isTrue();
        assertThat(service.departmentsOf(cu(c.visitante), "secid")).extracting(InstitutionPageService.DepartmentSummary::acronym)
                .containsExactly("UAP", "UTS");

        User insegura = person("Insegura", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        Company link = new Company(UUID.randomUUID(), insegura.getId(), "Insegura", "insegura", null, null, null, null, "javascript:alert(1)",
                null, null, null, null, null, null, CompanyStatus.ATIVA);
        directory.companies.put(link.id(), link);
        assertThat(service.company(cu(c.ana), "insegura").websiteUrl()).as("só https:// vai para o href").isNull();

        c.dona.setStatus(AccountStatus.PENDING_VALIDATION);
        ApiException pendente = catchThrowableOfType(ApiException.class, () -> service.company(cu(c.ana), "secid"));
        assertThat(pendente.status()).isEqualTo(404);
        assertThat(pendente.getMessage()).isEqualTo("Empresa não encontrado(a)");
        ApiException nada = catchThrowableOfType(ApiException.class, () -> service.company(cu(c.ana), "nao-existe"));
        assertThat(nada.getMessage()).isEqualTo(pendente.getMessage());
        ApiException deptDaPendente = catchThrowableOfType(ApiException.class, () -> service.department(cu(c.ana), "uts", null));
        assertThat(deptDaPendente.status()).as("departamento de empresa não visível some junto").isEqualTo(404);
    }

    @Test
    void perfilEmpresarialMostraEmpresaDaDonaELotacaoDasDemaisContas() {
        Cenario c = new Cenario();
        MyInstitutionView dona = service.mine(cu(c.dona));
        assertThat(AuthorizationTrail.last()).isEqualTo("SELF");
        assertThat(dona.owner()).isTrue();
        assertThat(dona.company().slug()).isEqualTo("secid");
        assertThat(dona.companyStatus()).isEqualTo("ATIVA");
        assertThat(dona.departments()).extracting(InstitutionPageService.DepartmentSummary::slug).containsExactly("uts");
        assertThat(dona.departments().get(0).members()).isEqualTo(2);
        assertThat(dona.people()).isEqualTo(3);

        MyInstitutionView ana = service.mine(cu(c.ana));
        assertThat(ana.owner()).isFalse();
        assertThat(ana.company().slug()).isEqualTo("secid");
        assertThat(ana.departments()).extracting(InstitutionPageService.DepartmentSummary::acronym).containsExactly("UTS");
        assertThat(ana.people()).as("o total da empresa é só para a dona").isNull();

        assertThat(service.mine(cu(c.carla)).departments()).as("lotação encerrada não aparece").isEmpty();
        assertThat(service.mine(cu(c.visitante)).company()).isNull();
        User semEmpresa = person("Nova", ProfileType.EMPRESA, AccountStatus.ACTIVE, null);
        assertThat(service.mine(cu(semEmpresa))).satisfies(v -> {
            assertThat(v.company()).isNull();
            assertThat(v.owner()).isTrue();
            assertThat(v.departments()).isEmpty();
        });
    }
}
