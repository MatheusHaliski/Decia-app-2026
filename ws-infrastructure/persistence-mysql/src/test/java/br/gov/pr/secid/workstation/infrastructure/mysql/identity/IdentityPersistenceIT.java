package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RefreshTokenMirrorPort;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.VerificationCode;
import br.gov.pr.secid.workstation.application.identity.VerificationCodeRepositoryPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Adaptadores JPA contra um MySQL 8.4 real com o Flyway do zero (V1–V3): e-mail cifrado em repouso, hash de busca,
 * espelho de refresh, trilha de auditoria e contador de tentativas do código. Pulado sem Docker.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(classes = IdentityPersistenceIT.App.class)
@TestPropertySource(properties = {"ws.redis.enabled=false", "spring.jpa.hibernate.ddl-auto=none"})
class IdentityPersistenceIT {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({br.gov.pr.secid.workstation.infrastructure.mysql.MysqlPersistenceConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.crypto.DataEncryptionConfig.class,
            br.gov.pr.secid.workstation.infrastructure.mysql.audit.JpaAuditLog.class, JpaIdentityAdapters.class})
    static class App {
    }

    @Container
    @ServiceConnection
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4").withDatabaseName("workstation")
            .withUsername("workstation").withPassword("test-only-" + System.nanoTime());

    @Autowired
    UserRepositoryPort users;
    @Autowired
    UserPreferencesRepositoryPort preferences;
    @Autowired
    RefreshTokenMirrorPort mirror;
    @Autowired
    VerificationCodeRepositoryPort codes;
    @Autowired
    AuditLogPort audit;
    @Autowired
    EmailHasher emailHasher;
    @Autowired
    JdbcTemplate jdbc;

    private User newUser(String username, String email) {
        User u = new User();
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(email);
        u.setEmailHash(emailHasher.hash(EmailHasher.normalize(email)));
        u.setPhone("+5541999990000");
        u.setPasswordHash("argon2-placeholder-" + UUID.randomUUID());
        u.setProfileType(ProfileType.EMPREGADO);
        return users.save(u);
    }

    @Test
    void emailETelefoneFicamCifradosNoBancoEABuscaEPeloHash() {
        User u = newUser("ana.it", "Ana.IT@Exemplo.gov.br");
        assertThat(u.getId()).isNotNull();
        Map<String, Object> row = jdbc.queryForMap("SELECT email_enc, phone_enc, email_hash, test_account FROM users WHERE id = ?",
                uuidBytes(u.getId()));
        assertThat(row.get("email_enc").toString()).startsWith("enc:v1:").doesNotContainIgnoringCase("ana.it@");
        assertThat(row.get("phone_enc").toString()).startsWith("enc:v1:").doesNotContain("41999990000");
        assertThat(row.get("email_hash")).isEqualTo(emailHasher.hash("ana.it@exemplo.gov.br"));
        assertThat(((Number) row.get("test_account")).intValue()).isZero();
        User found = users.findByEmailHash(emailHasher.hash("ana.it@exemplo.gov.br")).orElseThrow();
        assertThat(found.getEmail()).isEqualTo("Ana.IT@Exemplo.gov.br");
        assertThat(found.getPhone()).isEqualTo("+5541999990000");
        assertThat(users.findByUsername("ana.it")).isPresent();
        assertThat(users.existsByEmailHash(found.getEmailHash())).isTrue();
        assertThat(users.countByRole(Role.ADMIN)).isZero();
        found.setDisplayName("Ana");
        User saved = users.save(found);
        assertThat(saved.getVersion()).isGreaterThan(found.getVersion() - 1);
        assertThat(users.findById(u.getId()).orElseThrow().getDisplayName()).isEqualTo("Ana");
    }

    @Test
    void preferenciasEspelhoDeRefreshCodigosEAuditoriaGravam() {
        User u = newUser("bia.it", "bia.it@exemplo.gov.br");
        UserPreferences p = new UserPreferences();
        p.setUserId(u.getId());
        preferences.save(p);
        assertThat(preferences.findByUserId(u.getId()).orElseThrow().getWipLimit()).isEqualTo(3);

        Instant now = Instant.now();
        RefreshRecord first = new RefreshRecord("hash-1-" + u.getId(), UUID.randomUUID(), u.getId(), now, now.plus(Duration.ofDays(1)),
                null, null, false, "Note");
        mirror.saved(first, new RequestContext("203.0.113.1", "IT"));
        mirror.revoked(first.tokenHash(), now);
        RefreshRecord second = new RefreshRecord("hash-2-" + u.getId(), first.familyId(), u.getId(), now, now.plus(Duration.ofDays(1)),
                null, first.tokenHash(), false, "Note");
        mirror.saved(second, new RequestContext("203.0.113.1", "IT"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", Integer.class,
                uuidBytes(u.getId()))).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE rotated_from_id IS NOT NULL AND user_id = ?",
                Integer.class, uuidBytes(u.getId()))).isEqualTo(1);
        mirror.familyRevoked(first.familyId(), now);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", Integer.class,
                uuidBytes(u.getId()))).isZero();

        VerificationCode code = VerificationCode.issue(u.getId(), VerificationPurpose.EMAIL_VERIFICATION, "code-hash-" + u.getId(), now,
                Duration.ofMinutes(10));
        codes.save(code);
        codes.save(code.failedAttempt(now));
        assertThat(codes.findByCodeHash(code.codeHash()).orElseThrow().attempts()).isEqualTo(1);
        assertThat(codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION)).hasSize(1);

        audit.record(AuditEvent.of(u.getId(), "LOGIN_OK", "auth", null, AuditEvent.OK, "203.0.113.1", "IT",
                Map.of("email", "b***@e***.br", "password", "deve-sumir")));
        Map<String, Object> row = jdbc.queryForMap("SELECT action, result, metadata_json FROM audit_log WHERE actor_id = ?", uuidBytes(u.getId()));
        assertThat(row.get("action")).isEqualTo("LOGIN_OK");
        assertThat(row.get("metadata_json").toString()).contains("b***@e***.br").doesNotContain("deve-sumir");
    }

    private static byte[] uuidBytes(UUID id) {
        java.nio.ByteBuffer bb = java.nio.ByteBuffer.allocate(16);
        bb.putLong(id.getMostSignificantBits());
        bb.putLong(id.getLeastSignificantBits());
        return bb.array();
    }
}
