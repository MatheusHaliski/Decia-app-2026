package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.DeadlineFilter;
import br.gov.pr.secid.workstation.application.acervo.AcervoQuery.SortOrder;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF41.CA01/CA09 — o Acervo lista só as tarefas de quem pede, na página e ordem pedidas, com "hoje" no fuso do produto. */
class AcervoServiceTest {
    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final AcervoFakes.Tasks tasks = new AcervoFakes.Tasks();
    // 02:30 UTC de 13/11 ainda é 12/11 em São Paulo
    final Clock clock = Clock.fixed(Instant.parse("2026-11-13T02:30:00Z"), ZoneOffset.UTC);
    final AcervoService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        TaskService taskService = new TaskService(tasks, users, authorizer, mock(AuditLogPort.class),
                new NotificationService(new MemoryNotifications(), users, authorizer, clock), clock);
        service = new AcervoService(tasks, taskService, authorizer, clock);
    }

    User person() {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    TaskItem put(User owner, String title, Priority p, LocalDate legal, int minute) {
        TaskItem t = AcervoFakes.task(owner.getId(), title, TaskState.EM_USO, p, TaskCategory.OUTRO, null, legal, AccessClassification.INTERNO,
                Visibility.PRIVADA, null);
        Instant at = AcervoFakes.T0.plusSeconds(minute * 60L);
        tasks.put(t, at, at);
        return t;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    @Test
    void listaSoAsMinhasNaPaginaEOrdemPedidas() {
        User me = person();
        User outro = person();
        put(me, "baixa", Priority.BAIXA, null, 1);
        put(me, "critica", Priority.CRITICA, LocalDate.of(2026, 11, 12), 2);
        put(me, "alta", Priority.ALTA, LocalDate.of(2026, 11, 30), 3);
        put(outro, "do outro", Priority.CRITICA, LocalDate.of(2026, 11, 12), 4);

        assertThat(service.list(cu(me), AcervoQuery.firstPage(50))).extracting(TaskView::title).containsExactly("alta", "critica", "baixa");
        AcervoQuery prioridade = new AcervoQuery(null, null, null, null, SortOrder.PRIORIDADE, 1, 2);
        assertThat(service.list(cu(me), prioridade)).extracting(TaskView::title).containsExactly("critica", "alta");
        AcervoQuery pagina2 = new AcervoQuery(null, null, null, null, SortOrder.PRIORIDADE, 2, 2);
        assertThat(service.list(cu(me), pagina2)).extracting(TaskView::title).containsExactly("baixa");
        assertThat(service.list(cu(me), new AcervoQuery(null, null, null, null, null, 5, 2))).isEmpty();

        // "hoje" é 12/11 em São Paulo: o prazo legal de 12/11 vence hoje, não está atrasado
        AcervoQuery atrasadas = new AcervoQuery(null, null, null, DeadlineFilter.ATRASADAS, null, 1, 20);
        assertThat(service.list(cu(me), atrasadas)).isEmpty();
        AcervoSummary s = service.summary(cu(me), atrasadas);
        assertThat(s.today()).isEqualTo(LocalDate.of(2026, 11, 12));
        assertThat(s.legalAlerts()).extracting(AcervoSummary.LegalAlert::title, AcervoSummary.LegalAlert::daysLeft)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("critica", 0L));
        assertThat(s.byDeadline()).containsEntry("VENCE_7_DIAS", 1).containsEntry("COM_PRAZO_LEGAL", 2);
        assertThat(s.truncated()).isFalse();
        assertThat(s.scanned()).isEqualTo(3);
        TaskView first = service.list(cu(me), AcervoQuery.firstPage(1)).get(0);
        assertThat(first.legalDueAt()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(first.editable()).isTrue();
    }
}
