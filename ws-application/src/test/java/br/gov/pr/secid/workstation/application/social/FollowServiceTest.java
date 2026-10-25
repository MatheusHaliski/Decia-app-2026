package br.gov.pr.secid.workstation.application.social;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.application.social.FollowService.FollowView;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
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

/** RF16.CA01 — seguir pessoas: idempotente, reativável, nunca a si mesmo, só conta ativa (404 uniforme), contadores só do ATIVO. */
class FollowServiceTest {
    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryFollows repo = new MemoryFollows();
    final FollowService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        service = new FollowService(repo, users, new ResourceAuthorizer(users, Optional.empty()),
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
}
