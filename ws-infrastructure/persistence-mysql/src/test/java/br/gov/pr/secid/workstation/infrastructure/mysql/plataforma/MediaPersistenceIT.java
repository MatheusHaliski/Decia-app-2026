package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.media.MediaObjectRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScan;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Metadados de mídia (V2 media_objects + V24 media_scans) contra MySQL 8.4 real: gravar, achar por id e por dono+SHA-256 (dedupe só do
 * mesmo dono), varredura única por objeto e remoção que leva a varredura junto (CASCADE). Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = MediaPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class MediaPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class, JpaMediaAdapters.class})
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
    MediaObjectRepositoryPort media;
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

    @Test
    void gravaAchaPorDonoEShaEApagarLevaAVarredura() {
        User ana = person("midia.ana");
        User bruno = person("midia.bruno");
        String sha = "a".repeat(64);
        MediaObject obj = media.save(new MediaObject(UUID.randomUUID(), ana.getId(), "ws-media", "public/" + ana.getId() + "/" + sha + ".jpg",
                "image/jpeg", 1234, sha, MediaAccessClass.PUBLIC, null));
        Instant at = Instant.now().truncatedTo(ChronoUnit.MICROS);
        media.saveScan(new MediaScan(UUID.randomUUID(), obj.id(), MediaScanStatus.NAO_VERIFICADO, "JPEG", "no-op", null, at));

        MediaObject back = media.findById(obj.id()).orElseThrow();
        assertThat(back.accessClass()).isEqualTo(MediaAccessClass.PUBLIC);
        assertThat(back.sizeBytes()).isEqualTo(1234);
        assertThat(media.findByOwnerAndSha256(ana.getId(), sha)).map(MediaObject::id).contains(obj.id());
        assertThat(media.findByOwnerAndSha256(bruno.getId(), sha)).as("dedupe nunca cruza donos").isEmpty();
        assertThat(media.findScan(obj.id())).map(MediaScan::status).contains(MediaScanStatus.NAO_VERIFICADO);

        media.saveScan(new MediaScan(UUID.randomUUID(), obj.id(), MediaScanStatus.LIMPO, "JPEG", "clamav", null, at));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM media_scans WHERE media_id = ?", Integer.class, bytes(obj.id())))
                .as("uma varredura por objeto").isEqualTo(1);
        assertThat(media.findScan(obj.id())).map(MediaScan::status).contains(MediaScanStatus.LIMPO);

        media.delete(obj.id());
        assertThat(media.findById(obj.id())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM media_scans WHERE media_id = ?", Integer.class, bytes(obj.id())))
                .as("CASCADE").isZero();
    }

    private static byte[] bytes(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
}
