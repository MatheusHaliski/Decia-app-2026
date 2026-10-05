package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** Redis 7 real (Testcontainers; pulado sem Docker): reserva atômica entre threads, TTL sempre presente, release ≥ 0. */
@Testcontainers(disabledWithoutDocker = true)
class RedisRateLimitIT {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory;
    static StringRedisTemplate template;
    static RedisRateLimit limit;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        factory.afterPropertiesSet();
        template = new StringRedisTemplate(factory);
        limit = new RedisRateLimit(template);
    }

    @AfterAll
    static void close() {
        factory.destroy();
    }

    @Test
    void reservaAtomicaEntreThreadsNuncaPassaDoLimite() throws Exception {
        UUID owner = UUID.randomUUID();
        AtomicInteger granted = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        try {
            java.util.List<Future<?>> fs = new java.util.ArrayList<>();
            for (int i = 0; i < 100; i++) {
                fs.add(pool.submit(() -> {
                    if (limit.tryAcquire(owner, "login-fail", 5, Duration.ofMinutes(15))) {
                        granted.incrementAndGet();
                    }
                }));
            }
            for (Future<?> f : fs) {
                f.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(granted.get()).isEqualTo(5);
        RateLimitPort.QuotaStatus status = limit.status(owner, "login-fail", 5, Duration.ofMinutes(15));
        assertThat(status.used()).isEqualTo(100);
        assertThat(status.exhausted()).isTrue();
        assertThat(template.getExpire(RedisRateLimit.key(owner, "login-fail"), TimeUnit.SECONDS)).isBetween(1L, 900L);
    }

    @Test
    void releaseNuncaFicaNegativoNemRecriaAChaveEResetApaga() {
        UUID owner = UUID.randomUUID();
        limit.release(owner, "x");
        assertThat(template.hasKey(RedisRateLimit.key(owner, "x"))).isFalse();
        limit.tryAcquire(owner, "x", 5, Duration.ofMinutes(1));
        limit.release(owner, "x");
        limit.release(owner, "x");
        assertThat(limit.status(owner, "x", 5, Duration.ofMinutes(1)).used()).isZero();
        assertThat(template.getExpire(RedisRateLimit.key(owner, "x"), TimeUnit.SECONDS)).as("TTL preservado").isPositive();
        limit.reset(owner, "x");
        assertThat(template.hasKey(RedisRateLimit.key(owner, "x"))).isFalse();
    }

    @Test
    void chaveSemTtlGanhaExpiracaoNaProximaReserva() {
        UUID owner = UUID.randomUUID();
        template.opsForValue().set(RedisRateLimit.key(owner, "y"), "3");            // queda entre INCR e EXPIRE
        assertThat(template.getExpire(RedisRateLimit.key(owner, "y"))).isEqualTo(-1L);
        assertThat(limit.tryAcquire(owner, "y", 10, Duration.ofSeconds(30))).isTrue();
        assertThat(template.getExpire(RedisRateLimit.key(owner, "y"), TimeUnit.SECONDS)).isBetween(1L, 30L);
    }
}
