package br.gov.pr.secid.workstation.infrastructure.mysql.social;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.NotificationRepositoryPort.StoredNotification;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.social.Notification;
import br.gov.pr.secid.workstation.domain.social.NotificationCategory;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
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

import java.nio.ByteBuffer;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Notificações (V16, RF27) contra MySQL 8.4 real: gravar, listar do destinatário mais recentes primeiro, contar não lidas, marcar uma (só
 * do destinatário) e todas, e CASCADE ao apagar a conta. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = NotificationPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class NotificationPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaNotificationAdapter.class})
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
    NotificationRepositoryPort notifications;
    @Autowired
    UserRepositoryPort users;
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
        return users.save(u);
    }

    private static Notification note(UUID recipient, UUID actor, String title) {
        return new Notification(UUID.randomUUID(), recipient, actor, NotificationType.TRANSICAO, NotificationCategory.SOCIAL, "task",
                UUID.randomUUID(), title, null, "{\"taskTitle\":\"" + title + "\",\"to\":\"EM_USO\"}", "task:x", false, null, null);
    }

    @Test
    void gravaListaContaEMarcaSoDoDestinatario() {
        User ana = person("notif.ana");
        User bruno = person("notif.bruno");
        Instant t0 = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Notification first = note(ana.getId(), bruno.getId(), "Primeira");
        Notification second = note(ana.getId(), bruno.getId(), "Segunda");
        notifications.insert(first, t0);
        notifications.insert(second, t0.plusSeconds(1));
        Notification fromAna = note(bruno.getId(), ana.getId(), "Da Ana");
        notifications.insert(fromAna, t0);

        List<StoredNotification> mine = notifications.findByRecipient(ana.getId(), 10);
        assertThat(mine).extracting(s -> s.notification().title()).containsExactly("Segunda", "Primeira");
        assertThat(mine.get(0).notification().payloadJson()).contains("\"to\"").contains("EM_USO");
        assertThat(mine.get(0).createdAt()).isEqualTo(t0.plusSeconds(1));
        assertThat(notifications.countUnread(ana.getId())).isEqualTo(2);

        assertThat(notifications.markRead(bruno.getId(), first.id(), t0)).as("a de outra pessoa não muda").isFalse();
        assertThat(notifications.markRead(ana.getId(), first.id(), t0)).isTrue();
        assertThat(notifications.markRead(ana.getId(), first.id(), t0)).as("já lida").isFalse();
        assertThat(notifications.countUnread(ana.getId())).isEqualTo(1);
        assertThat(notifications.findById(first.id()).orElseThrow().notification().readAt()).isEqualTo(t0);

        assertThat(notifications.markAllRead(ana.getId(), t0)).isEqualTo(1);
        assertThat(notifications.countUnread(ana.getId())).isZero();
        assertThat(notifications.countUnread(bruno.getId())).as("as do Bruno ficam como estão").isEqualTo(1);

        jdbc.update("DELETE FROM users WHERE id = ?", (Object) bytes(ana.getId()));
        assertThat(notifications.findByRecipient(ana.getId(), 10)).as("CASCADE com a conta do destinatário").isEmpty();
        assertThat(notifications.findById(fromAna.id()).orElseThrow().notification().actorId())
                .as("ator removido não apaga a notificação de outra pessoa, só o vínculo (SET NULL)").isNull();
    }

    private static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
}
