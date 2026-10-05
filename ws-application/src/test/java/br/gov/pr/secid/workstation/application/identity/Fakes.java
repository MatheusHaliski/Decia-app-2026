package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/** Fakes em memória das portas — os testes de serviço rodam sem Spring, banco ou Docker. */
final class Fakes {
    private Fakes() {
    }

    static class Users implements UserRepositoryPort {
        final Map<UUID, User> rows = new ConcurrentHashMap<>();

        User add(User u) {
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            rows.put(u.getId(), u);
            return u;
        }

        @Override
        public Optional<User> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public Optional<User> findByUsername(String normalizedUsername) {
            return rows.values().stream().filter(u -> normalizedUsername.equals(u.getUsername())).findFirst();
        }

        @Override
        public Optional<User> findByEmailHash(String emailHash) {
            return rows.values().stream().filter(u -> emailHash.equals(u.getEmailHash())).findFirst();
        }

        @Override
        public Optional<User> findByOidc(String issuer, String subject) {
            return rows.values().stream().filter(u -> issuer.equals(u.getOidcIssuer()) && subject.equals(u.getOidcSubject())).findFirst();
        }

        @Override
        public boolean existsByUsername(String normalizedUsername) {
            return findByUsername(normalizedUsername).isPresent();
        }

        @Override
        public boolean existsByEmailHash(String emailHash) {
            return findByEmailHash(emailHash).isPresent();
        }

        @Override
        public long countByRole(Role role) {
            return rows.values().stream().filter(u -> u.getRole() == role).count();
        }

        @Override
        public User save(User user) {
            return add(user);
        }
    }

    static final class Preferences implements UserPreferencesRepositoryPort {
        final Map<UUID, UserPreferences> rows = new ConcurrentHashMap<>();

        @Override
        public Optional<UserPreferences> findByUserId(UUID userId) {
            return Optional.ofNullable(rows.get(userId));
        }

        @Override
        public UserPreferences save(UserPreferences p) {
            rows.put(p.getUserId(), p);
            return p;
        }
    }

    /** Hash reversível só para teste; conta as conferências e pode atrasar (janela da corrida). */
    static final class SpyHasher implements PasswordHasher {
        final AtomicInteger matchesCalls = new AtomicInteger();
        volatile long delayMillis;
        volatile boolean rehash;

        @Override
        public String hash(String raw) {
            return "h:" + raw;
        }

        @Override
        public boolean matches(String raw, String encoded) {
            matchesCalls.incrementAndGet();
            if (delayMillis > 0) {
                try {
                    Thread.sleep(delayMillis);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            return ("h:" + raw).equals(encoded);
        }

        @Override
        public boolean needsRehash(String encoded) {
            return rehash;
        }
    }

    static final EmailHasher EMAIL_HASHER = normalized -> "eh:" + Hashing.sha256(normalized);

    static final TokenIssuerPort TOKENS = new TokenIssuerPort() {
        @Override
        public String issueAccessToken(User user, UUID sessionId) {
            return "jwt:" + user.getId() + ":" + sessionId;
        }

        @Override
        public Duration accessTokenTtl() {
            return Duration.ofMinutes(15);
        }
    };

    static final RefreshTokenMirrorPort NO_MIRROR = new RefreshTokenMirrorPort() {
        @Override
        public void saved(RefreshRecord record, RequestContext ctx) {
        }

        @Override
        public void revoked(String tokenHash, Instant at) {
        }

        @Override
        public void familyRevoked(UUID familyId, Instant at) {
        }

        @Override
        public void userRevoked(UUID userId, UUID keepFamily, Instant at) {
        }
    };

    static final class Audit implements AuditLogPort {
        final List<AuditEvent> events = Collections.synchronizedList(new ArrayList<>());

        @Override
        public void record(AuditEvent event) {
            events.add(event);
        }

        List<String> actions() {
            return events.stream().map(AuditEvent::action).toList();
        }

        /** Tudo que foi auditado, em texto — para provar que segredo nenhum entrou. */
        String dump() {
            return events.toString();
        }
    }

    static final class Mails implements MailPort {
        final List<MailMessage> sent = Collections.synchronizedList(new ArrayList<>());

        @Override
        public void send(MailMessage message) {
            sent.add(message);
        }

        MailMessage last() {
            return sent.get(sent.size() - 1);
        }
    }

    static User user(String username, String email, String passwordHash) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(email);
        u.setEmailHash(EMAIL_HASHER.hash(EmailHasher.normalize(email)));
        u.setEmailVerified(true);
        u.setPasswordHash(passwordHash);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(AccountStatus.ACTIVE);
        u.setCreatedAt(Instant.now());
        return u;
    }
}
