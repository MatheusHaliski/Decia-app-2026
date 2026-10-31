package br.gov.pr.secid.workstation.infrastructure.mysql.social;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.social.FollowRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import br.gov.pr.secid.workstation.infrastructure.mysql.identity.JpaIdentityAdapters;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Seguir (V16 follows, RF16) contra MySQL 8.4 real: gravar, achar o par, reativar a mesma linha, unicidade do par no banco, contar só
 * ATIVO e desligar os vínculos de uma conta (anonimização). Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = FollowPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class FollowPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaFollowAdapter.class})
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
    FollowRepositoryPort follows;
    @Autowired
    UserRepositoryPort users;
    @Autowired
    EmailHasher emailHasher;

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

    @Test
    void parUnicoReativavelContagemDoAtivoEDesligarAConta() {
        User ana = person("seg.ana");
        User bruno = person("seg.bruno");
        User carla = person("seg.carla");
        Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
        Follow f = follows.save(new Follow(UUID.randomUUID(), ana.getId(), FollowTargetType.USER, bruno.getId(), FollowStatus.ATIVO, now));
        follows.save(new Follow(UUID.randomUUID(), carla.getId(), FollowTargetType.USER, bruno.getId(), FollowStatus.ATIVO, now));
        follows.save(new Follow(UUID.randomUUID(), carla.getId(), FollowTargetType.USER, ana.getId(), FollowStatus.ATIVO, now));
        assertThat(follows.find(ana.getId(), FollowTargetType.USER, bruno.getId())).map(Follow::id).contains(f.id());
        assertThat(follows.countFollowers(FollowTargetType.USER, bruno.getId())).isEqualTo(2);
        assertThat(follows.countFollowing(carla.getId(), FollowTargetType.USER)).isEqualTo(2);

        assertThatThrownBy(() -> follows.save(new Follow(UUID.randomUUID(), ana.getId(), FollowTargetType.USER, bruno.getId(),
                FollowStatus.ATIVO, now))).as("o banco não aceita o mesmo par duas vezes").isInstanceOf(DataIntegrityViolationException.class);

        follows.save(new Follow(f.id(), ana.getId(), FollowTargetType.USER, bruno.getId(), FollowStatus.REMOVIDO, now));
        assertThat(follows.countFollowers(FollowTargetType.USER, bruno.getId())).as("só ATIVO conta").isEqualTo(1);
        follows.save(new Follow(f.id(), ana.getId(), FollowTargetType.USER, bruno.getId(), FollowStatus.ATIVO, now));
        assertThat(follows.countFollowers(FollowTargetType.USER, bruno.getId())).isEqualTo(2);

        assertThat(follows.removeAllOf(ana.getId())).as("Ana seguia Bruno e era seguida por Carla").isEqualTo(2);
        assertThat(follows.countFollowers(FollowTargetType.USER, ana.getId())).isZero();
        assertThat(follows.countFollowers(FollowTargetType.USER, bruno.getId())).isEqualTo(1);
        assertThat(follows.countFollowing(carla.getId(), FollowTargetType.USER)).isEqualTo(1);
    }
}
