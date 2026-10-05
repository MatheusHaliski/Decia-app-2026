package br.gov.pr.secid.workstation.infrastructure.redis;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Os scripts Lua contra um Redis 7 real: reserva atômica (40 pedidos em paralelo → 5 aceitos), TTL fixo na primeira
 * reserva, release nunca negativo e reset. Sem Docker na máquina o teste é pulado; no CI o Docker existe.
 */
@Testcontainers(disabledWithoutDocker = true)
class RedisRateLimitIT {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory;
    static StringRedisTemplate template;
    static RedisRateLimit rl;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
        factory.afterPropertiesSet();
        template = new StringRedisTemplate(factory);
        template.afterPropertiesSet();
        rl = new RedisRateLimit(template);
    }

    @AfterAll
    static void close() {
        if (factory != null) {
            factory.destroy();
        }
    }

    @Test
    void quarentaPedidosEmParaleloReservamNoMaximoCinco() throws Exception {
        String owner = "conta-" + System.nanoTime();
        int pedidos = 40;
        ExecutorService pool = Executors.newFixedThreadPool(pedidos);
        try {
            CountDownLatch largada = new CountDownLatch(1);
            AtomicInteger aceitos = new AtomicInteger();
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < pedidos; i++) {
                futures.add(pool.submit(() -> {
                    largada.await();
                    if (rl.tryAcquire(owner, "login-fail", 5, Duration.ofMinutes(15))) {
                        aceitos.incrementAndGet();
                    }
                    return null;
                }));
            }
            largada.countDown();
            for (Future<?> f : futures) {
                f.get(30, TimeUnit.SECONDS);
            }
            assertThat(aceitos.get()).isEqualTo(5);
            assertThat(rl.status(owner, "login-fail", 5, Duration.ofMinutes(15)).used()).isEqualTo(pedidos);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void janelaFixaComTtlReleaseNuncaNegativoEReset() throws Exception {
        String owner = "ip-" + System.nanoTime();
        assertThat(rl.tryAcquire(owner, "r", 2, Duration.ofSeconds(2))).isTrue();
        assertThat(rl.tryAcquire(owner, "r", 2, Duration.ofSeconds(2))).isTrue();
        assertThat(rl.tryAcquire(owner, "r", 2, Duration.ofSeconds(2))).isFalse();
        var s = rl.status(owner, "r", 2, Duration.ofSeconds(2));
        assertThat(s.used()).isEqualTo(3);
        assertThat(s.exhausted()).isTrue();
        assertThat(template.getExpire(RedisRateLimit.redisKey(owner, "r"), TimeUnit.MILLISECONDS)).isBetween(1L, 2000L);

        rl.release(owner, "r");
        rl.release(owner, "r");
        rl.release(owner, "r");
        rl.release(owner, "r");
        assertThat(template.opsForValue().get(RedisRateLimit.redisKey(owner, "r"))).isEqualTo("0");
        assertThat(rl.status(owner, "r", 2, Duration.ofSeconds(2))).isEqualTo(br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus.empty(2));

        assertThat(rl.tryAcquire(owner, "r", 2, Duration.ofSeconds(2))).isTrue();
        rl.reset(owner, "r");
        assertThat(template.hasKey(RedisRateLimit.redisKey(owner, "r"))).isFalse();

        // chave sem TTL (ex.: restaurada de backup) ganha TTL na próxima reserva
        String k = RedisRateLimit.redisKey(owner, "sem-ttl");
        template.opsForValue().set(k, "1");
        assertThat(rl.tryAcquire(owner, "sem-ttl", 5, Duration.ofSeconds(5))).isTrue();
        assertThat(template.getExpire(k, TimeUnit.MILLISECONDS)).isBetween(1L, 5000L);

        // vencida a janela, o balde reabre
        Thread.sleep(2100);
        assertThat(rl.status(owner, "r", 2, Duration.ofSeconds(2)).used()).isZero();
    }
}
