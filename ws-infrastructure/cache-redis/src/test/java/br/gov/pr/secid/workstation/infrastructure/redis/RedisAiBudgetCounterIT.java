package br.gov.pr.secid.workstation.infrastructure.redis;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** Redis 7 real (Testcontainers; pulado sem Docker): orçamento de IA atômico entre threads, TTL sempre presente, nunca negativo (D-68). */
@Testcontainers(disabledWithoutDocker = true)
class RedisAiBudgetCounterIT {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory;
    static StringRedisTemplate template;
    static RedisAiBudgetCounter counter;

    @BeforeAll
    static void connect() {
        factory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        factory.afterPropertiesSet();
        template = new StringRedisTemplate(factory);
        counter = new RedisAiBudgetCounter(template);
    }

    @AfterAll
    static void close() {
        factory.destroy();
    }

    @Test
    void cemThreadsNuncaPassamDoTeto() throws Exception {
        String key = "ai:budget:user:" + UUID.randomUUID() + ":2026-10-06:tok";
        AtomicInteger granted = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        try {
            List<Future<?>> fs = new ArrayList<>();
            for (int i = 0; i < 100; i++) {
                fs.add(pool.submit(() -> {
                    if (counter.tryAdd(key, 10, 250, Duration.ofHours(1))) {
                        granted.incrementAndGet();
                    }
                }));
            }
            for (Future<?> f : fs) {
                f.get();
            }
        } finally {
            pool.shutdown();
        }
        assertThat(granted.get()).isEqualTo(25);
        assertThat(counter.current(key)).isEqualTo(250);
        assertThat(template.getExpire(key)).isPositive();
        counter.add(key, -1000, Duration.ofHours(1));
        assertThat(counter.current(key)).isZero();
        assertThat(template.getExpire(key)).as("o ajuste mantém o TTL").isPositive();
    }
}
