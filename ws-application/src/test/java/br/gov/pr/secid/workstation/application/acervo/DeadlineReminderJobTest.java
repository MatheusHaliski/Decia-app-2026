package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.DeadlineReminderJob.Run;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.jobs.JobLockPort;
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
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RF41.CA04 — trabalho diário de prazos: horário e fuso da pessoa, interruptor, idempotência por tarefa+tipo+dia, dono e responsável,
 * conta inativa, trava entre instâncias e payload só com título e datas.
 */
class DeadlineReminderJobTest {
    /** 24/11/2026 09:00 em São Paulo (12:00 UTC). */
    static final Instant MORNING = Instant.parse("2026-11-24T12:00:00Z");
    static final LocalDate TODAY = LocalDate.of(2026, 11, 24);

    final AtomicReference<Instant> now = new AtomicReference<>(MORNING);
    final Clock clock = new Clock() {
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }
    };
    final Map<UUID, User> people = new HashMap<>();
    final Map<UUID, UserPreferences> prefs = new HashMap<>();
    final List<TaskItem> tasks = new ArrayList<>();
    final List<LocalDate[]> windows = new ArrayList<>();
    final MemoryNotifications repo = new MemoryNotifications();
    final MemoryLock lock = new MemoryLock();
    final UUID company = UUID.randomUUID();
    final DeadlineReminderJob job;

    {
        UserRepositoryPort users = mock(UserRepositoryPort.class);
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        UserPreferencesRepositoryPort prefRepo = mock(UserPreferencesRepositoryPort.class);
        when(prefRepo.findByUserId(any())).thenAnswer(inv -> Optional.ofNullable(prefs.get(inv.<UUID>getArgument(0))));
        DeadlineScanPort scan = (from, to, after, limit) -> {
            windows.add(new LocalDate[] {from, to});
            return tasks.stream().filter(t -> AcervoQueries.open(t.state()))
                    .filter(t -> in(t.dueAt(), from, to) || in(t.legalDueAt(), from, to))
                    .sorted(Comparator.comparing(TaskItem::id)).filter(t -> after == null || t.id().compareTo(after) > 0).limit(limit).toList();
        };
        NotificationService notifications = new NotificationService(repo, users, new ResourceAuthorizer(users, Optional.empty()), clock);
        job = new DeadlineReminderJob(scan, lock, users, prefRepo, notifications, clock, "3,1", Duration.ofMinutes(10));
    }

    static boolean in(LocalDate d, LocalDate from, LocalDate to) {
        return d != null && !d.isBefore(from) && !d.isAfter(to);
    }

    static final class MemoryLock implements JobLockPort {
        String holder;
        Instant until = Instant.EPOCH;

        @Override
        public boolean tryAcquire(String name, String who, Instant at, Instant lockedUntil) {
            if (until.isAfter(at)) {
                return false;
            }
            holder = who;
            until = lockedUntil;
            return true;
        }

        @Override
        public void release(String name, String who, Instant at) {
            if (who.equals(holder)) {
                until = at;
            }
        }
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

    void prefs(User u, String json, String zone) {
        UserPreferences p = new UserPreferences();
        p.setUserId(u.getId());
        p.setNotificationPrefsJson(json);
        if (zone != null) {
            p.setTimezone(zone);
        }
        prefs.put(u.getId(), p);
    }

    TaskItem task(User owner, User responsible, TaskState state, LocalDate due, LocalDate legal) {
        TaskItem t = AcervoFakes.task(owner.getId(), "Resposta ao ofício 12/2026", state, Priority.ALTA, TaskCategory.OFICIO_MEMORANDO, due, legal,
                AccessClassification.INTERNO, Visibility.PRIVADA, responsible == null ? null : responsible.getId());
        tasks.add(t);
        return t;
    }

    List<Notification> of(User u) {
        return repo.of(u.getId());
    }

    @Test
    void avisaDonoEResponsavelUmaVezPorDiaNoHorarioDaPessoa() {
        User ana = person("Ana Lima", AccountStatus.ACTIVE);
        User bruno = person("Bruno Costa", AccountStatus.ACTIVE);
        TaskItem t = task(ana, bruno, TaskState.EM_USO, TODAY.plusDays(3), null);

        now.set(Instant.parse("2026-11-24T10:30:00Z"));   // 07:30 em São Paulo: antes das 08:00 padrão
        assertThat(job.runOnce().sent()).isZero();

        now.set(MORNING);
        Run r = job.runOnce();
        assertThat(r.locked()).isTrue();
        assertThat(r.sent()).isEqualTo(2);
        assertThat(of(ana)).singleElement().satisfies(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.PRAZO_PROXIMO);
            assertThat(n.category()).isEqualTo(NotificationCategory.PRAZO);
            assertThat(n.actorId()).as("é o sistema").isNull();
            assertThat(n.resourceType()).isEqualTo("task");
            assertThat(n.resourceId()).isEqualTo(t.id());
            assertThat(n.title()).isEqualTo("Prazo próximo: \"Resposta ao ofício 12/2026\" vence em 3 dias (27/11/2026)");
            assertThat(n.payloadJson()).isEqualTo("{\"taskTitle\":\"Resposta ao ofício 12/2026\",\"dueAt\":\"2026-11-27\",\"days\":\"3\","
                    + "\"source\":\"TAREFA\"}");
        });
        assertThat(of(bruno)).hasSize(1);

        now.set(MORNING.plus(Duration.ofHours(3)));
        assertThat(job.runOnce().sent()).as("mesmo dia: idempotente").isZero();

        now.set(MORNING.plus(Duration.ofDays(1)));        // faltam 2: fora da lista 3,1
        assertThat(job.runOnce().sent()).isZero();
        now.set(MORNING.plus(Duration.ofDays(2)));        // falta 1
        assertThat(job.runOnce().sent()).isEqualTo(2);
        now.set(MORNING.plus(Duration.ofDays(3)));        // vence hoje
        assertThat(job.runOnce().sent()).isEqualTo(2);
        assertThat(of(ana)).extracting(Notification::title).last().isEqualTo("Prazo vence hoje: \"Resposta ao ofício 12/2026\" (27/11/2026)");
        now.set(MORNING.plus(Duration.ofDays(4)));        // venceu ontem
        assertThat(job.runOnce().sent()).isEqualTo(2);
        now.set(MORNING.plus(Duration.ofDays(5)));
        assertThat(job.runOnce().sent()).as("vencida avisa uma vez por vencimento").isZero();
        assertThat(of(ana)).extracting(Notification::type).containsExactly(NotificationType.PRAZO_PROXIMO, NotificationType.PRAZO_PROXIMO,
                NotificationType.PRAZO_PROXIMO, NotificationType.PRAZO_VENCIDO);
        assertThat(of(ana).get(3).title()).isEqualTo("Prazo vencido: \"Resposta ao ofício 12/2026\" venceu em 27/11/2026");
    }

    @Test
    void interruptorDesligadoNaoAvisaEHorarioEFusoSaoDaPessoa() {
        User ana = person("Ana Lima", AccountStatus.ACTIVE);
        User bruno = person("Bruno Costa", AccountStatus.ACTIVE);
        prefs(ana, "{\"deadlines\":false,\"dailyTaskAt\":\"06:00\"}", null);
        prefs(bruno, "{\"dailyTaskAt\":\"10:00\"}", "Europe/Lisbon");   // 12:00 UTC = 12:00 em Lisboa (inverno)
        task(ana, bruno, TaskState.DISPONIVEL, null, TODAY.plusDays(1));
        assertThat(job.runOnce().sent()).isEqualTo(1);
        assertThat(of(ana)).as("interruptor de prazos desligado").isEmpty();
        assertThat(of(bruno)).singleElement().satisfies(n -> {
            assertThat(n.payloadJson()).contains("\"source\":\"LEGAL\"").contains("\"days\":\"1\"");
            assertThat(n.title()).startsWith("Prazo legal próximo:").contains("vence em 1 dia (25/11/2026)");
        });
    }

    @Test
    void contaInativaTarefaFechadaETarefaSemPrazoNaJanelaNaoAvisam() {
        User ana = person("Ana Lima", AccountStatus.ACTIVE);
        User gone = person("Carla Dias", AccountStatus.DELETION_SCHEDULED);
        task(gone, null, TaskState.EM_USO, TODAY, null);
        task(ana, null, TaskState.CONCLUIDA, TODAY, null);
        task(ana, null, TaskState.EM_USO, TODAY.plusDays(30), null);
        Run r = job.runOnce();
        assertThat(r.tasks()).as("a varredura só traz o que está na janela").isEqualTo(1);
        assertThat(r.sent()).isZero();
        assertThat(repo.rows).isEmpty();
        assertThat(windows.get(0)).containsExactly(TODAY.minusDays(8), TODAY.plusDays(4));
    }

    @Test
    void travaSeguraPorOutraInstanciaPulaARodada() {
        User ana = person("Ana Lima", AccountStatus.ACTIVE);
        task(ana, null, TaskState.EM_USO, TODAY, null);
        lock.until = MORNING.plusSeconds(60);
        lock.holder = "outra-instancia";
        assertThat(job.runOnce()).isEqualTo(new Run(false, 0, 0));
        assertThat(repo.rows).isEmpty();
        now.set(MORNING.plusSeconds(61));
        assertThat(job.runOnce().sent()).as("trava expirada: roda").isEqualTo(1);
        assertThat(lock.until).as("devolvida ao terminar").isEqualTo(MORNING.plusSeconds(61));
    }

    @Test
    void paginaPorChaveAteOFim() {
        User ana = person("Ana Lima", AccountStatus.ACTIVE);
        for (int i = 0; i < DeadlineReminderJob.PAGE + 3; i++) {
            task(ana, null, TaskState.EM_USO, TODAY.plusDays(1), null);
        }
        Run r = job.runOnce();
        assertThat(r.tasks()).isEqualTo(DeadlineReminderJob.PAGE + 3);
        assertThat(r.sent()).isEqualTo(DeadlineReminderJob.PAGE + 3);
        assertThat(windows).hasSize(2);
    }
}
