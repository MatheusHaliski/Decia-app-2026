package br.gov.pr.secid.workstation.application.people;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF4/RF10/RF16: busca restrita à empresa e a contas ativas; perfil público sem contato; 404 uniforme. */
class PeopleServiceTest {
    final Map<UUID, User> rows = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final UUID company = UUID.randomUUID();
    final UUID other = UUID.randomUUID();
    final PeopleService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(rows.get(inv.<UUID>getArgument(0))));
        when(users.findByUsername(anyString())).thenAnswer(inv -> rows.values().stream()
                .filter(u -> u.getUsername().equals(inv.<String>getArgument(0))).findFirst());
        when(users.searchInCompany(any(), anyString(), anyInt())).thenAnswer(inv -> {
            UUID c = inv.getArgument(0);
            String q = inv.<String>getArgument(1).toLowerCase(Locale.ROOT);
            return rows.values().stream().filter(u -> c.equals(u.getCompanyId()) && u.getStatus() == AccountStatus.ACTIVE
                    && (u.getUsername() + " " + u.getFullName()).toLowerCase(Locale.ROOT).contains(q)).limit(inv.<Integer>getArgument(2)).toList();
        });
        service = new PeopleService(users, new ResourceAuthorizer(users, Optional.empty()));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(String username, UUID companyId, AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setDisplayName(null);
        u.setJobTitle("Analista");
        u.setBio("bio");
        u.setEmail(username + "@exemplo.gov.br");
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(status);
        u.setCompanyId(companyId);
        rows.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    @Test
    void buscaSoNaPropriaEmpresaSemEuMesmoESoAtivas() {
        User me = person("ana.silva", company, AccountStatus.ACTIVE);
        person("bruno.ana", company, AccountStatus.ACTIVE);
        person("carla.ana", company, AccountStatus.PENDING_EMAIL_VERIFICATION);
        person("diego.ana", other, AccountStatus.ACTIVE);
        assertThat(service.search(cu(me), "ana", 10)).extracting(PeopleService.PersonView::username).containsExactly("bruno.ana");
        assertThat(service.search(cu(me), "a", 10)).as("consulta curta não lista a empresa").isEmpty();
        assertThat(service.search(cu(me), "ana", 0)).hasSize(1);
    }

    @Test
    void semEmpresaNaoHaBusca() {
        User solo = person("solo", null, AccountStatus.ACTIVE);
        person("solo.dois", null, AccountStatus.ACTIVE);
        assertThat(service.search(cu(solo), "solo", 10)).isEmpty();
    }

    @Test
    void perfilPublicoNaoExpoeContatoE404UniformeParaNaoAtivos() {
        User me = person("ana.silva", company, AccountStatus.ACTIVE);
        User third = person("bruno.lima", other, AccountStatus.ACTIVE);
        person("pendente", company, AccountStatus.PENDING_VALIDATION);
        PeopleService.PublicProfileView v = service.byUsername(cu(me), "Bruno.Lima");
        assertThat(v.username()).isEqualTo("bruno.lima");
        assertThat(v.name()).isEqualTo("Pessoa bruno.lima");
        assertThat(v.self()).isFalse();
        assertThat(v.toString()).doesNotContain("@exemplo.gov.br");
        assertThat(service.byUsername(cu(me), "ana.silva").self()).isTrue();
        for (String u : new String[] {"pendente", "nao-existe"}) {
            assertThatThrownBy(() -> service.byUsername(cu(me), u)).isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.status()).isEqualTo(404);
                assertThat(e.getMessage()).isEqualTo("Perfil não encontrado(a)");
            });
        }
        assertThat(service.visibleById(cu(me), third.getId()).getUsername()).isEqualTo("bruno.lima");
        assertThatThrownBy(() -> service.visibleById(cu(me), UUID.randomUUID())).isInstanceOf(ApiException.class);
        assertThat(AuthorizationTrail.checked()).isTrue();
    }

    @Test
    void perfilSoDaEmpresaResponde404DeForaEMostraEspecialidadesParaQuemPodeVer() {
        User ana = person("ana.silva", company, AccountStatus.ACTIVE);
        ana.setProfileVisibility(br.gov.pr.secid.workstation.domain.identity.ProfileVisibility.EMPRESA);
        ana.setSpecialties(java.util.List.of("Licitações", "BIM"));
        User colega = person("bruno.lima", company, AccountStatus.ACTIVE);
        User fora = person("carla.fora", other, AccountStatus.ACTIVE);
        User semEmpresa = person("diego.solo", null, AccountStatus.ACTIVE);

        assertThat(service.byUsername(cu(colega), "ana.silva").specialties()).containsExactly("Licitações", "BIM");
        assertThat(service.byUsername(cu(ana), "ana.silva").self()).as("a própria pessoa sempre se vê").isTrue();
        for (User viewer : new User[] {fora, semEmpresa}) {
            ApiException byName = org.assertj.core.api.Assertions.catchThrowableOfType(ApiException.class,
                    () -> service.byUsername(cu(viewer), "ana.silva"));
            ApiException byId = org.assertj.core.api.Assertions.catchThrowableOfType(ApiException.class,
                    () -> service.visibleById(cu(viewer), ana.getId()));
            ApiException ghost = org.assertj.core.api.Assertions.catchThrowableOfType(ApiException.class,
                    () -> service.byUsername(cu(viewer), "nao-existe"));
            assertThat(byName.status()).isEqualTo(404);
            assertThat(byId.status()).isEqualTo(404);
            assertThat(byName.getMessage()).as("mesma recusa de uma conta inexistente").isEqualTo(ghost.getMessage()).isEqualTo(byId.getMessage());
            assertThat(byName.code()).isEqualTo(ghost.code());
        }
    }
}
