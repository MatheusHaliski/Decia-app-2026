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

    /** Achado P1 (PR #18): consume → revokeFamily (perdedora) → save do sucessor (vencedora): o sucessor é recusado pelo tombstone. */
    @Test
    void sucessorSalvoDepoisDoTombstoneDaFamiliaERecusado() {
        UUID user = UUID.randomUUID();
        UUID fam = UUID.randomUUID();
        RefreshRecord first = record(fam, user, Duration.ofDays(1));
        store.save(first);
        assertThat(store.consume(first.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.ROTATED);
        store.revokeFamily(fam, Instant.now());
        RefreshRecord successor = new RefreshRecord("h-next-" + fam, fam, user, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null,
                first.tokenHash(), true, "Note");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> store.save(successor)).isInstanceOf(SessionStorePort.FamilyRevokedException.class);
        assertThat(template.hasKey(RedisSessionStore.tokenKey(successor.tokenHash()))).as("nada do sucessor gravado").isFalse();
        assertThat(store.familyActive(fam, Instant.now())).isFalse();
        assertThat(store.consume(first.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.REUSED);
        assertThat(store.find(first.tokenHash()).orElseThrow().revokedAt()).isNotNull();
        assertThat(store.activeOfUser(user, Instant.now())).isEmpty();
        assertThat(template.getExpire(RedisSessionStore.metaKey(fam), TimeUnit.SECONDS)).isPositive();
        // token ainda não revogado individualmente numa família com tombstone: find devolve revogado e consume vê reuso
        UUID fam2 = UUID.randomUUID();
        RefreshRecord live = record(fam2, user, Duration.ofDays(1));
        store.save(live);
        template.opsForHash().put(RedisSessionStore.metaKey(fam2), "revokedAt", String.valueOf(Instant.now().toEpochMilli()));
        assertThat(store.find(live.tokenHash()).orElseThrow().revokedAt()).isNotNull();
        assertThat(store.consume(live.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.REUSED);
        assertThat(store.familyActive(fam2, Instant.now())).isFalse();
    }

    /** Achado P1 (PR #18): familyActive é O(1) — ≤ 2 round-trips ao Redis seja qual for o número de rotações da família. */
    @Test
    void familyActiveFazNoMaximoDoisRoundTripsIndependenteDasRotacoes() {
        CountingConnectionFactory counting = new CountingConnectionFactory(factory);
        StringRedisTemplate countedTemplate = new StringRedisTemplate(counting);
        RedisSessionStore counted = new RedisSessionStore(countedTemplate);
        UUID user = UUID.randomUUID();
        UUID fam = UUID.randomUUID();
        RefreshRecord current = record(fam, user, Duration.ofDays(30));
        counted.save(current);
        for (int i = 0; i < 50; i++) {
            assertThat(counted.consume(current.tokenHash(), Instant.now())).isEqualTo(SessionStorePort.Consume.ROTATED);
            RefreshRecord next = new RefreshRecord("h-" + UUID.randomUUID(), fam, user, Instant.now(), Instant.now().plus(Duration.ofDays(30)),
                    null, current.tokenHash(), true, "Note");
            counted.save(next);
            current = next;
        }
        assertThat(template.opsForSet().size(RedisSessionStore.familyKey(fam))).isEqualTo(51);
        counting.connections.set(0);
        assertThat(counted.familyActive(fam, Instant.now())).isTrue();
        assertThat(counting.connections.get()).as("round-trips do familyActive").isLessThanOrEqualTo(2);
        counting.connections.set(0);
        assertThat(counted.activeOfUser(user, Instant.now())).hasSize(1);
        assertThat(counting.connections.get()).as("lista de sessões: só o token vigente de cada família").isLessThanOrEqualTo(6);
        assertThat(counted.find(current.tokenHash()).orElseThrow().tokenHash()).isEqualTo(current.tokenHash());
    }

    /** Cada operação do RedisTemplate pede uma conexão: contar getConnection() = contar round-trips. */
    static final class CountingConnectionFactory implements org.springframework.data.redis.connection.RedisConnectionFactory {
        final java.util.concurrent.atomic.AtomicInteger connections = new java.util.concurrent.atomic.AtomicInteger();
        private final org.springframework.data.redis.connection.RedisConnectionFactory delegate;

        CountingConnectionFactory(org.springframework.data.redis.connection.RedisConnectionFactory delegate) {
            this.delegate = delegate;
        }

        @Override
        public org.springframework.data.redis.connection.RedisConnection getConnection() {
            connections.incrementAndGet();
            return delegate.getConnection();
        }

        @Override
        public org.springframework.data.redis.connection.RedisClusterConnection getClusterConnection() {
            return delegate.getClusterConnection();
        }

        @Override
        public boolean getConvertPipelineAndTxResults() {
            return delegate.getConvertPipelineAndTxResults();
        }

        @Override
        public org.springframework.data.redis.connection.RedisSentinelConnection getSentinelConnection() {
            return delegate.getSentinelConnection();
        }

        @Override
        public org.springframework.dao.DataAccessException translateExceptionIfPossible(RuntimeException ex) {
            return delegate.translateExceptionIfPossible(ex);
        }
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
