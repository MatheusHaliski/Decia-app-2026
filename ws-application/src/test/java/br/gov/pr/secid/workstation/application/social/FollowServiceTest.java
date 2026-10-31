package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService;
import br.gov.pr.secid.workstation.application.institutional.MemoryInstitutions;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.application.social.FollowService.FollowView;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
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
 * RF16.CA01/RF14.CA04/RF15.CA05 — seguir pessoas, departamentos e empresas: idempotente, reativável, nunca a si mesmo, só alvo visível
 * (404 uniforme, inclusive pelo controle de publicação do RF3), contadores só do ATIVO.
 */
class FollowServiceTest {
    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryFollows repo = new MemoryFollows();
    final MemoryInstitutions directory = new MemoryInstitutions(id -> Optional.ofNullable(people.get(id)));
    final FollowService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        service = new FollowService(repo, users, authorizer, new InstitutionPageService(directory, users, repo, authorizer),
                Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername("p" + people.size());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(status);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    @Test
    void seguirEhIdempotenteEReativavelComUmaLinhaPorPar() {
        User ana = person(AccountStatus.ACTIVE);
        User bruno = person(AccountStatus.ACTIVE);
        assertThat(service.status(cu(ana), bruno.getId())).isEqualTo(new FollowView(false, false, 0, 0));
        assertThat(service.follow(cu(ana), bruno.getId()).following()).isTrue();
        FollowView twice = service.follow(cu(ana), bruno.getId());
        assertThat(twice.followers()).as("seguir de novo não duplica").isEqualTo(1);
        assertThat(service.unfollow(cu(ana), bruno.getId())).isEqualTo(new FollowView(false, false, 0, 0));
        assertThat(service.unfollow(cu(ana), bruno.getId()).followers()).isZero();
        assertThat(service.follow(cu(ana), bruno.getId()).followers()).isEqualTo(1);
        assertThat(repo.rows).as("reativa a mesma linha").hasSize(1);
        assertThat(service.status(cu(bruno), ana.getId()).followingCount()).as("Ana segue 1").isEqualTo(1);
        assertThat(service.status(cu(bruno), bruno.getId())).isEqualTo(new FollowView(false, true, 1, 0));
        assertThat(AuthorizationTrail.checked()).isTrue();
    }

    @Test
    void naoSegueASiMesmoNemContaNaoAtivaOuInexistente() {
        User ana = person(AccountStatus.ACTIVE);
        User gone = person(AccountStatus.DELETION_SCHEDULED);
        ApiException self = catchThrowableOfType(ApiException.class, () -> service.follow(cu(ana), ana.getId()));
        assertThat(self.status()).isEqualTo(422);
        assertThat(self.code()).isEqualTo(FollowService.A_SI_MESMO);
        for (UUID id : new UUID[] {gone.getId(), UUID.randomUUID()}) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> service.follow(cu(ana), id));
            assertThat(e.status()).isEqualTo(404);
            assertThat(e.getMessage()).isEqualTo("Perfil não encontrado(a)");
        }
        assertThat(repo.rows).isEmpty();
    }

    @Test
    void anonimizarDesligaOsVinculosDaConta() {
        User ana = person(AccountStatus.ACTIVE);
        User bruno = person(AccountStatus.ACTIVE);
        User carla = person(AccountStatus.ACTIVE);
        service.follow(cu(ana), bruno.getId());
        service.follow(cu(carla), ana.getId());
        service.follow(cu(carla), bruno.getId());
        assertThat(service.purge(ana.getId())).isEqualTo(2);
        assertThat(repo.rows.values()).filteredOn(f -> f.status() == FollowStatus.ATIVO).singleElement()
                .satisfies(f -> assertThat(f.followerId()).isEqualTo(carla.getId()));
        assertThat(service.status(cu(carla), bruno.getId()).followers()).isEqualTo(1);
    }

    @Test
    void perfilSoDaEmpresaNaoPodeSerSeguidoDeForaMasPodeDeDentro() {
        UUID secid = UUID.randomUUID();
        User ana = person(AccountStatus.ACTIVE);
        ana.setCompanyId(secid);
        ana.setProfileVisibility(ProfileVisibility.EMPRESA);
        User colega = person(AccountStatus.ACTIVE);
        colega.setCompanyId(secid);
        User fora = person(AccountStatus.ACTIVE);
        for (java.util.function.Supplier<FollowView> call : java.util.List.<java.util.function.Supplier<FollowView>>of(
                () -> service.status(cu(fora), ana.getId()), () -> service.follow(cu(fora), ana.getId()),
                () -> service.unfollow(cu(fora), ana.getId()))) {
            ApiException e = catchThrowableOfType(ApiException.class, call::get);
            assertThat(e.status()).isEqualTo(404);
            assertThat(e.getMessage()).isEqualTo("Perfil não encontrado(a)");
        }
        assertThat(service.follow(cu(colega), ana.getId()).followers()).isEqualTo(1);
        assertThat(service.status(cu(ana), ana.getId()).self()).as("a própria pessoa sempre se vê").isTrue();
    }

    @Test
    void segueDepartamentoEEmpresaVisiveisComAsMesmasRegras() {
        User dona = person(AccountStatus.ACTIVE);
        dona.setProfileType(ProfileType.EMPRESA);
        Company c = directory.company(dona.getId(), "secid", "Secretaria", CompanyStatus.ATIVA);
        Department uts = directory.department(c, "uts", "UTS", null, true);
        directory.department(c, "antigo", "ANT", null, false);
        User ana = person(AccountStatus.ACTIVE);
        ana.setCompanyId(c.id());

        assertThat(service.departmentStatus(cu(ana), "uts", null)).isEqualTo(new FollowView(false, false, 0, 0));
        assertThat(service.followDepartment(cu(ana), "uts", null)).isEqualTo(new FollowView(true, false, 1, 0));
        assertThat(service.followDepartment(cu(ana), "uts", null).followers()).as("idempotente").isEqualTo(1);
        assertThat(service.unfollowDepartment(cu(ana), "uts", null)).isEqualTo(new FollowView(false, false, 0, 0));
        assertThat(service.followDepartment(cu(ana), "uts", "secid").followers()).isEqualTo(1);
        assertThat(repo.rows.values()).filteredOn(f -> f.targetType() == FollowTargetType.DEPARTMENT).singleElement()
                .satisfies(f -> assertThat(f.targetId()).isEqualTo(uts.id()));

        assertThat(service.followCompany(cu(ana), "secid")).isEqualTo(new FollowView(true, false, 1, 0));
        assertThat(service.companyStatus(cu(dona), "secid")).as("a dona vê o total; empresa não é 'a si mesmo'")
                .isEqualTo(new FollowView(false, false, 1, 0));
        assertThat(service.unfollowCompany(cu(ana), "secid").followers()).isZero();
        assertThat(service.followCompany(cu(ana), "secid").followers()).isEqualTo(1);
        assertThat(repo.rows.values()).filteredOn(f -> f.targetType() == FollowTargetType.COMPANY).hasSize(1);
        assertThat(service.status(cu(dona), ana.getId()).followingCount()).as("seguir pessoa conta só pessoas").isZero();

        for (Runnable call : java.util.List.<Runnable>of(() -> service.followDepartment(cu(ana), "antigo", null),
                () -> service.followDepartment(cu(ana), "nao-existe", null), () -> service.followCompany(cu(ana), "nao-existe"))) {
            ApiException e = catchThrowableOfType(ApiException.class, call::run);
            assertThat(e.status()).isEqualTo(404);
        }
        dona.setStatus(AccountStatus.SUSPENDED);
        assertThat(catchThrowableOfType(ApiException.class, () -> service.companyStatus(cu(ana), "secid")).status()).isEqualTo(404);
        assertThat(catchThrowableOfType(ApiException.class, () -> service.departmentStatus(cu(ana), "uts", null)).status()).isEqualTo(404);
    }
}
