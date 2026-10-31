package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.account.PublicationService.PublicationUpdate;
import br.gov.pr.secid.workstation.application.account.PublicationService.PublicationView;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF3 — especialidades (normalizadas, até 10, sem repetir) e controle de publicação do perfil, só pela própria conta e com auditoria. */
class PublicationServiceTest {
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final List<AuditEvent> audit = new ArrayList<>();
    final AuditLogPort auditPort = audit::add;
    final PublicationService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service = new PublicationService(users, new ResourceAuthorizer(users, Optional.empty()), auditPort);
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User me(AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername("eu");
        u.setFullName("Eu Mesma");
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
    void padraoEhSemEspecialidadesEVisivelParaQualquerContaAutenticada() {
        User u = me(AccountStatus.ACTIVE);
        assertThat(service.mine(cu(u))).isEqualTo(new PublicationView(List.of(), "AUTENTICADOS"));
        assertThat(AuthorizationTrail.last()).isEqualTo("SELF");
    }

    @Test
    void normalizaRemoveRepetidosSemCaixaNemAcentoEAuditaSoOsNomesDosCampos() {
        User u = me(AccountStatus.ACTIVE);
        PublicationView v = service.update(cu(u), new PublicationUpdate(
                Arrays.asList("  Gestão   de contratos ", "gestao DE contratos", "BIM", "", null, "C++", "Node.js", "P&D"), "empresa"), CTX);
        assertThat(v.specialties()).containsExactly("Gestão de contratos", "BIM", "C++", "Node.js", "P&D");
        assertThat(v.profileVisibility()).isEqualTo("EMPRESA");
        assertThat(u.getProfileVisibility()).isEqualTo(ProfileVisibility.EMPRESA);
        assertThat(audit).singleElement().satisfies(e -> {
            assertThat(e.action()).isEqualTo(AuditActions.PROFILE_UPDATED);
            assertThat(e.toString()).contains("specialties").contains("profileVisibility").doesNotContain("BIM");
        });

        assertThat(service.update(cu(u), new PublicationUpdate(null, null), CTX)).isEqualTo(v);
        assertThat(service.update(cu(u), new PublicationUpdate(List.of("BIM", "Gestão de contratos", "C++", "Node.js", "P&D"), null), CTX)
                .specialties()).as("reordenar é mudança").startsWith("BIM");
        assertThat(service.update(cu(u), new PublicationUpdate(List.of(), "AUTENTICADOS"), CTX))
                .isEqualTo(new PublicationView(List.of(), "AUTENTICADOS"));
        audit.clear();
        service.update(cu(u), new PublicationUpdate(List.of(), "AUTENTICADOS"), CTX);
        assertThat(audit).as("nada mudou, nada a auditar").isEmpty();
    }

    @Test
    void recusaMaisDeDezCurtaLongaOuComMarcacaoSemGravarNada() {
        User u = me(AccountStatus.ACTIVE);
        u.setSpecialties(List.of("Antes"));
        List<List<String>> invalid = List.of(
                IntStream.range(0, 11).mapToObj(i -> "Área " + i).toList(),
                List.of("x"),
                List.of("y".repeat(41)),
                List.of("<script>"),
                List.of("linha\u0000nula"));
        for (List<String> bad : invalid) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> service.update(cu(u), new PublicationUpdate(bad, null), CTX));
            assertThat(e.status()).as(bad.toString()).isEqualTo(422);
            assertThat(e.code()).isEqualTo(ApiException.VALIDACAO);
            assertThat(e.details().toString()).contains("specialties");
        }
        ApiException vis = catchThrowableOfType(ApiException.class, () -> service.update(cu(u), new PublicationUpdate(null, "TODOS"), CTX));
        assertThat(vis.details().toString()).contains("profileVisibility");
        assertThat(u.getSpecialties()).containsExactly("Antes");
        assertThat(audit).isEmpty();
        assertThat(service.update(cu(u), new PublicationUpdate(IntStream.range(0, 12).mapToObj(i -> "Área " + (i % 10)).toList(), null), CTX)
                .specialties()).as("12 com 2 repetidas = 10").hasSize(10);
    }

    @Test
    void contaComExclusaoAgendadaNaoAltera() {
        User u = me(AccountStatus.DELETION_SCHEDULED);
        ApiException e = catchThrowableOfType(ApiException.class, () -> service.update(cu(u), new PublicationUpdate(List.of("BIM"), null), CTX));
        assertThat(e.status()).isEqualTo(403);
        assertThat(e.code()).isEqualTo(AuthCodes.EXCLUSAO_AGENDADA);
    }

    @Test
    void chaveDeComparacaoIgnoraAcentoECaixa() {
        assertThat(Specialties.key("Gestão Pública")).isEqualTo(Specialties.key("GESTAO publica"));
        assertThat(Specialties.normalize(null).values()).isEmpty();
    }
}
