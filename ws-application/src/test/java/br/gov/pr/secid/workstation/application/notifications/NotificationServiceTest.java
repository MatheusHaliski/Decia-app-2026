package br.gov.pr.secid.workstation.application.notifications;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationService.NotificationView;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF27 — notificações reais: só para quem pode ver, nunca para quem agiu, leitura e marcação só da própria pessoa (404 uniforme). */
class NotificationServiceTest {
    static final Instant NOW = Instant.parse("2026-10-17T12:00:00Z");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryNotifications repo = new MemoryNotifications();
    final UUID company = UUID.randomUUID();
    final NotificationService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        service = new NotificationService(repo, users, new ResourceAuthorizer(users, Optional.empty()), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(String name, AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(company);
        u.setFullName(name);
        u.setStatus(status);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    TaskItem task(User owner, UUID responsible, Visibility visibility, AccessClassification access) {
        return TaskItem.create(owner.getId(), null, "Parecer sobre o contrato", null, TaskType.DOCUMENTO, null, Priority.MEDIA, null, responsible,
                access, visibility);
    }

    ScopedResource scoped(TaskItem t) {
        return ScopedResource.of(t, company);
    }

    @Test
    void responsavelDefinidoPorOutraPessoaRecebeAvisoComNomeDeQuemAgiu() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        User resp = person("Bruno Costa", AccountStatus.ACTIVE);
        TaskItem t = task(owner, resp.getId(), Visibility.PRIVADA, AccessClassification.INTERNO);
        service.taskResponsibleSet(owner.getId(), scoped(t), t, null);
        service.taskResponsibleSet(owner.getId(), scoped(t), t, resp.getId());
        List<NotificationView> mine = service.list(cu(resp), 10);
        assertThat(mine).as("só uma: repetir o mesmo responsável não avisa de novo").hasSize(1);
        NotificationView n = mine.get(0);
        assertThat(n.type()).isEqualTo(NotificationType.ATRIBUICAO_PROPOSTA);
        assertThat(n.actorName()).isEqualTo("Ana Lima");
        assertThat(n.payload()).containsEntry("taskTitle", "Parecer sobre o contrato");
        assertThat(service.list(cu(owner), 10)).as("quem agiu não é avisado").isEmpty();
    }

    @Test
    void transicaoAvisaDonoEResponsavelMenosQuemFezEBloqueioLevaOMotivo() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        User resp = person("Bruno Costa", AccountStatus.ACTIVE);
        TaskItem t = task(owner, resp.getId(), Visibility.EMPRESA, AccessClassification.INTERNO).transition(TaskState.DISPONIVEL)
                .transition(TaskState.EM_USO).block(null, owner.getId(), "Aguardando a planilha de custos");
        service.taskStateChanged(resp.getId(), scoped(t), TaskState.EM_USO, t, "Aguardando a planilha de custos");
        assertThat(repo.of(resp.getId())).isEmpty();
        assertThat(repo.of(owner.getId())).singleElement().satisfies(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.TRANSICAO);
            assertThat(n.category()).isEqualTo(NotificationCategory.SOCIAL);
        });
        assertThat(service.list(cu(owner), 10).get(0).payload())
                .containsEntry("from", "EM_USO").containsEntry("to", "BLOQUEADA").containsEntry("reason", "Aguardando a planilha de custos");
    }

    @Test
    void contaNaoAtivaNaoRecebeNada() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        User gone = person("Carla Dias", AccountStatus.DELETION_SCHEDULED);
        TaskItem t = task(owner, gone.getId(), Visibility.EMPRESA, AccessClassification.INTERNO);
        service.taskResponsibleSet(owner.getId(), scoped(t), t, null);
        service.accountSecurity(gone.getId(), "TWO_FACTOR_ENABLED");
        assertThat(repo.rows).isEmpty();
    }

    @Test
    void lerEMarcarSoOQueEhSeuComMesmo404ParaAlheiaEInexistente() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        User other = person("Davi Rocha", AccountStatus.ACTIVE);
        service.accountSecurity(owner.getId(), "TWO_FACTOR_ENABLED");
        service.accountSecurity(owner.getId(), "TWO_FACTOR_DISABLED");
        assertThat(service.unreadCount(cu(owner)).count()).isEqualTo(2);
        assertThat(service.list(cu(other), 10)).isEmpty();
        UUID id = service.list(cu(owner), 10).get(0).id();
        for (UUID target : new UUID[] {id, UUID.randomUUID()}) {
            assertThatThrownBy(() -> service.markRead(cu(other), target)).isInstanceOfSatisfying(ApiException.class, e -> {
                assertThat(e.status()).isEqualTo(404);
                assertThat(e.getMessage()).isEqualTo("Notificação não encontrado(a)");
            });
        }
        assertThat(AuthorizationTrail.checked()).isTrue();
        service.markRead(cu(owner), id);
        assertThat(service.unreadCount(cu(owner)).count()).isEqualTo(1);
        assertThat(service.markAllRead(cu(owner)).updated()).isEqualTo(1);
        assertThat(service.unreadCount(cu(owner)).count()).isZero();
        assertThat(service.list(cu(owner), 10)).allSatisfy(n -> assertThat(n.readAt()).isEqualTo(NOW));
    }

    @Test
    void eventoDeSegurancaVaiSoParaAPropriaContaSemAtor() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        service.accountSecurity(owner.getId(), "TWO_FACTOR_DISABLED");
        NotificationView n = service.list(cu(owner), 10).get(0);
        assertThat(n.type()).isEqualTo(NotificationType.SISTEMA);
        assertThat(n.category()).isEqualTo(NotificationCategory.SISTEMA);
        assertThat(n.actorId()).isNull();
        assertThat(n.title()).isEqualTo("Verificação em duas etapas desativada");
        assertThat(n.payload()).containsEntry("event", "TWO_FACTOR_DISABLED");
    }

    @Test
    void produtorGenericoPulaQuemAgiuContaNaoAtivaEQuemNaoVeORecurso() {
        User owner = person("Ana Lima", AccountStatus.ACTIVE);
        User other = person("Bruno Costa", AccountStatus.ACTIVE);
        User gone = person("Carla Dias", AccountStatus.SUSPENDED);
        TaskItem privateTask = task(owner, null, Visibility.PRIVADA, AccessClassification.INTERNO);
        service.notifyAbout(java.util.Set.of(owner.getId(), other.getId(), gone.getId()), owner.getId(), scoped(privateTask),
                NotificationType.ATRIBUICAO_PROPOSTA, NotificationCategory.SOCIAL, "project", null, "Projeto", Map.of("k", "v"));
        assertThat(repo.rows).as("dono agiu; Bruno não vê a tarefa privada; Carla não está ativa").isEmpty();
        service.notifyAbout(java.util.Set.of(other.getId(), gone.getId()), owner.getId(), null, NotificationType.MENSAGEM_DIRETA,
                NotificationCategory.SOCIAL, "conversation", null, "Nova mensagem", Map.of("preview", "oi"));
        assertThat(repo.of(other.getId())).singleElement().satisfies(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.MENSAGEM_DIRETA);
            assertThat(n.groupKey()).isNull();
        });
        assertThat(repo.of(gone.getId())).isEmpty();
    }
}
