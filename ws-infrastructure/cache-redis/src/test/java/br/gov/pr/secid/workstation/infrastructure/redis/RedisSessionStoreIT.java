package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** Redis 7 real (pulado sem Docker): consumo atômico do refresh, família/pessoa, TTL de graça para detectar reuso. */
@Testcontainers(disabledWithoutDocker = true)
class RedisSessionStoreIT {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory;
    static StringRedisTemplate template;
    static RedisSessionStore store;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        factory.afterPropertiesSet();
        template = new StringRedisTemplate(factory);
        store = new RedisSessionStore(template);
    }

    @AfterAll
    static void close() {
        factory.destroy();
    }

    private static RefreshRecord record(UUID family, UUID user, Duration ttl) {
        // sub-milissegundo de propósito: o store precisa devolver o instante exato, não o truncado em millis
        Instant now = Instant.now().plusNanos(123_456);
        return new RefreshRecord("h-" + UUID.randomUUID(), family, user, now, now.plus(ttl), null, null, true, "Note");
    }

    @Test
    void salvaLeConsomeUmaVezSoERevogaFamiliaEPessoa() {
        UUID user = UUID.randomUUID();
        UUID fam = UUID.randomUUID();
        RefreshRecord r = record(fam, user, Duration.ofDays(1));
        store.save(r);
        assertThat(store.find(r.tokenHash())).contains(r);
        assertThat(template.getExpire(RedisSessionStore.tokenKey(r.tokenHash()), TimeUnit.SECONDS)).isBetween(86_400L, 2 * 86_400L);
        assertThat(store.familyActive(fam, Instant.now())).isTrue();
        assertThat(store.consume(r.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.ROTATED);
        assertThat(store.consume(r.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.REUSED);
        assertThat(store.find(r.tokenHash()).orElseThrow().revokedAt()).isNotNull();
        assertThat(store.consume("nao-existe", Instant.now())).isEqualTo(SessionStorePort.Consume.UNKNOWN);
        assertThat(store.familyActive(fam, Instant.now())).isFalse();
        RefreshRecord next = record(fam, user, Duration.ofDays(1));
        store.save(next);
        RefreshRecord other = record(UUID.randomUUID(), user, Duration.ofHours(1));
        store.save(other);
        assertThat(store.activeOfUser(user, Instant.now())).hasSize(2);
        assertThat(store.revokeAllOfUser(user, fam, Instant.now())).isEqualTo(1);
        assertThat(store.familyActive(other.familyId(), Instant.now())).isFalse();
        assertThat(store.familyActive(fam, Instant.now())).isTrue();
        store.revokeFamily(fam, Instant.now());
        assertThat(store.familyActive(fam, Instant.now())).isFalse();
        RefreshRecord expired = record(UUID.randomUUID(), user, Duration.ofMillis(1));
        store.save(expired);
        assertThat(store.consume(expired.tokenHash(), Instant.now().plusSeconds(5))).isEqualTo(SessionStorePort.Consume.EXPIRED);
        store.revoke("inexistente", Instant.now());
        assertThat(template.hasKey(RedisSessionStore.tokenKey("inexistente"))).isFalse();
    }

    @Test
    void vinteThreadsComOMesmoTokenSoUmaRotaciona() throws Exception {
        RefreshRecord r = record(UUID.randomUUID(), UUID.randomUUID(), Duration.ofDays(1));
        store.save(r);
        AtomicInteger rotated = new AtomicInteger();
        AtomicInteger reused = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(20);
        try {
            List<Future<?>> fs = new java.util.ArrayList<>();
            for (int i = 0; i < 20; i++) {
                fs.add(pool.submit(() -> {
                    SessionStorePort.Consume c = store.consume(r.tokenHash(), Instant.now());
                    if (c == SessionStorePort.Consume.ROTATED) {
                        rotated.incrementAndGet();
                    } else if (c == SessionStorePort.Consume.REUSED) {
                        reused.incrementAndGet();
                    }
                }));
            }
            for (Future<?> f : fs) {
                f.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(rotated.get()).isEqualTo(1);
        assertThat(reused.get()).isEqualTo(19);
    }
}
