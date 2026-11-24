package br.gov.pr.secid.workstation.infrastructure.mysql.acervo;

import br.gov.pr.secid.workstation.application.acervo.DeadlineReminderJob;
import br.gov.pr.secid.workstation.application.acervo.DeadlineReminderJob.Run;
import br.gov.pr.secid.workstation.application.acervo.DeadlineScanPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.jobs.JobLockPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort.StoredNotification;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.JpaJobLockAdapter;
import br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.JpaMediaAdapters;
import br.gov.pr.secid.workstation.infrastructure.mysql.social.JpaNotificationAdapter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Aviso diário de prazo (RF41.CA04) contra MySQL 8.4 real: a trava entre instâncias da V70 ({@code scheduled_job_locks}), a varredura das
 * tarefas abertas com prazo na janela (paginação por chave), a idempotência por {@code group_key} e o trabalho inteiro de ponta a ponta,
 * com as preferências gravadas. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = DeadlineReminderIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class DeadlineReminderIT {
    static final Instant NOW = Instant.parse("2026-11-24T12:00:00Z");   // 09:00 em São Paulo
    static final LocalDate TODAY = LocalDate.of(2026, 11, 24);

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaAcervoAdapters.class,
            JpaMediaAdapters.class, JpaNotificationAdapter.class, JpaJobLockAdapter.class})
    static class App {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4").withDatabaseName("workstation")
            .withUsername("workstation").withPassword("test-only-" + System.nanoTime());

    @Autowired
    TaskRepositoryPort tasks;
    @Autowired
    DeadlineScanPort scan;
    @Autowired
    JobLockPort locks;
    @Autowired
    NotificationRepositoryPort notifications;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    UserPreferencesRepositoryPort preferences;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;

    private User person(String username) {
        User u = new User();
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(username + "@exemplo.gov.br")));
        u.setPasswordHash("argon2-placeholder-" + UUID.randomUUID());
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(AccountStatus.ACTIVE);
        return users.save(u);
    }

    private TaskItem task(User owner, User responsible, String title, LocalDate due, TaskState... path) {
        TaskItem draft = TaskItem.create(owner.getId(), null, title, null, TaskType.DOCUMENTO, TaskCategory.OFICIO_MEMORANDO, Priority.ALTA, due,
                responsible == null ? null : responsible.getId(), AccessClassification.INTERNO, Visibility.PRIVADA);
        StoredTask s = tasks.insert(draft, null);
        for (TaskState next : path) {
            s = tasks.update(s.task().transition(next), s.brief(), s.version());
        }
        return s.task();
    }

    private DeadlineReminderJob job(Clock clock) {
        NotificationService service = new NotificationService(notifications, users, new ResourceAuthorizer(users, Optional.empty()), clock);
        return new DeadlineReminderJob(scan, locks, users, preferences, service, clock, "3,1", Duration.ofMinutes(10));
    }

    @Test
    void travaSoUmaInstanciaPorVezEExpiraSozinha() {
        assertThat(locks.tryAcquire("it-trava", "a", NOW, NOW.plusSeconds(600))).isTrue();
        assertThat(locks.tryAcquire("it-trava", "b", NOW.plusSeconds(1), NOW.plusSeconds(601))).as("segurada por a").isFalse();
        locks.release("it-trava", "b", NOW.plusSeconds(2));
        assertThat(locks.tryAcquire("it-trava", "b", NOW.plusSeconds(3), NOW.plusSeconds(603))).as("b não devolve a trava de a").isFalse();
        locks.release("it-trava", "a", NOW.plusSeconds(4));
        assertThat(locks.tryAcquire("it-trava", "b", NOW.plusSeconds(5), NOW.plusSeconds(10))).as("devolvida por a").isTrue();
        assertThat(locks.tryAcquire("it-trava", "c", NOW.plusSeconds(11), NOW.plusSeconds(20))).as("expirou sem release (instância caiu)").isTrue();
        assertThat(jdbc.queryForObject("SELECT locked_by FROM scheduled_job_locks WHERE name = 'it-trava'", String.class)).isEqualTo("c");
    }

    @Test
    void varreduraSoAbertasNaJanelaEPaginaPorChave() {
        User u = person("prazo.scan");
        LocalDate base = LocalDate.of(2031, 3, 10);   // longe das datas do outro teste
        List<UUID> inWindow = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            inWindow.add(task(u, null, "Aberta " + i, base.plusDays(i % 3)).id());
        }
        task(u, null, "Fora da janela", base.plusDays(30));
        task(u, null, "Concluída", base, TaskState.DISPONIVEL, TaskState.EM_USO, TaskState.CONCLUIDA);
        TaskItem legalOnly = task(u, null, "Só prazo legal", null);
        StoredTask s = tasks.findById(legalOnly.id()).orElseThrow();
        tasks.update(s.task().withLegalDeadline(UUID.fromString("6c0e0069-0000-4000-8000-000000000003"), base.minusDays(5), base.plusDays(1)),
                s.brief(), s.version());
        inWindow.add(legalOnly.id());

        List<UUID> all = new ArrayList<>();
        UUID after = null;
        int pages = 0;
        while (true) {
            List<TaskItem> page = scan.openWithDeadlineBetween(base, base.plusDays(3), after, 2);
            pages++;
            page.forEach(t -> all.add(t.id()));
            if (page.size() < 2) {
                break;
            }
            after = page.get(page.size() - 1).id();
        }
        assertThat(all).as("sem repetição, só abertas, inclui a do prazo legal").containsExactlyInAnyOrderElementsOf(inWindow).doesNotHaveDuplicates();
        assertThat(pages).isEqualTo(4);
    }

    @Test
    void trabalhoDePontaAPontaIdempotenteERespeitandoOInterruptor() {
        User ana = person("prazo.ana");
        User bruno = person("prazo.bruno");
        UserPreferences off = preferences.findByUserId(bruno.getId()).orElseGet(UserPreferences::new);
        off.setUserId(bruno.getId());
        off.setNotificationPrefsJson("{\"deadlines\":false}");
        preferences.save(off);
        TaskItem t = task(ana, bruno, "Resposta ao ofício 12/2026", TODAY.plusDays(1), TaskState.DISPONIVEL);

        Clock morning = Clock.fixed(NOW, ZoneOffset.UTC);
        Run first = job(morning).runOnce();
        assertThat(first.locked()).isTrue();
        assertThat(first.sent()).isEqualTo(1);
        Run again = job(Clock.fixed(NOW.plusSeconds(1800), ZoneOffset.UTC)).runOnce();
        assertThat(again.sent()).as("outra instância, mesmo dia: nada de repetido").isZero();

        List<StoredNotification> mine = notifications.findByRecipient(ana.getId(), 10);
        assertThat(mine).singleElement().satisfies(s2 -> {
            assertThat(s2.notification().type()).isEqualTo(NotificationType.PRAZO_PROXIMO);
            assertThat(s2.notification().category()).isEqualTo(NotificationCategory.PRAZO);
            assertThat(s2.notification().resourceId()).isEqualTo(t.id());
            assertThat(s2.notification().groupKey()).isEqualTo("prazo:" + t.id() + ":PRAZO_PROXIMO:2026-11-24");
            assertThat(s2.notification().payloadJson().replace(" ", "")).as("coluna JSON: o MySQL normaliza os espaços")
                    .contains("\"dueAt\":\"2026-11-25\"").contains("\"days\":\"1\"");
        });
        assertThat(notifications.existsByGroupKey(ana.getId(), "prazo:" + t.id() + ":PRAZO_PROXIMO:2026-11-24")).isTrue();
        assertThat(notifications.existsByGroupKey(bruno.getId(), "prazo:" + t.id() + ":PRAZO_PROXIMO:2026-11-24")).isFalse();
        assertThat(notifications.findByRecipient(bruno.getId(), 10)).as("interruptor de prazos desligado").isEmpty();

        Run overdue = job(Clock.fixed(NOW.plus(Duration.ofDays(2)), ZoneOffset.UTC)).runOnce();
        assertThat(overdue.sent()).isEqualTo(1);
        assertThat(notifications.findByRecipient(ana.getId(), 10).get(0).notification().type()).isEqualTo(NotificationType.PRAZO_VENCIDO);
    }
}
