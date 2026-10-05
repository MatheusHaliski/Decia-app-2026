package br.gov.pr.secid.workstation.application.identity;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryRateLimitTest {
    private static final Duration WINDOW = Duration.ofMinutes(15);

    /** Relógio controlável: a janela fixa só vence quando o teste avança o tempo. */
    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-05T12:00:00Z");

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void reservaAteOLimiteEDepoisRecusaAteAJanelaVencer() {
        MutableClock clock = new MutableClock();
        InMemoryRateLimit limit = new InMemoryRateLimit(100, clock);
        UUID owner = UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            assertThat(limit.tryAcquire(owner, "login-fail", 5, WINDOW)).isTrue();
        }
        assertThat(limit.tryAcquire(owner, "login-fail", 5, WINDOW)).isFalse();
        RateLimitPort.QuotaStatus status = limit.status(owner, "login-fail", 5, WINDOW);
        assertThat(status.exhausted()).isTrue();
        assertThat(status.used()).isEqualTo(6);
        assertThat(status.resetAt()).isEqualTo(clock.now.plus(WINDOW));
        assertThat(status.retryAfterSeconds(clock.now)).isEqualTo(WINDOW.toSeconds());
        clock.now = clock.now.plus(WINDOW).plusSeconds(1);
        assertThat(limit.tryAcquire(owner, "login-fail", 5, WINDOW)).as("janela nova").isTrue();
        assertThat(limit.status(owner, "login-fail", 5, WINDOW).used()).isEqualTo(1);
    }

    @Test
    void releaseNuncaFicaAbaixoDeZeroENaoRecriaOBalde() {
        MutableClock clock = new MutableClock();
        InMemoryRateLimit limit = new InMemoryRateLimit(100, clock);
        UUID owner = UUID.randomUUID();
        limit.release(owner, "x");                              // balde inexistente: nada acontece
        assertThat(limit.size()).isZero();
        limit.tryAcquire(owner, "x", 5, WINDOW);
        limit.release(owner, "x");
        limit.release(owner, "x");
        assertThat(limit.status(owner, "x", 5, WINDOW).used()).isZero();
        limit.reset(owner, "x");
        assertThat(limit.size()).isZero();
        // janela vencida: release descarta o balde em vez de reviver
        limit.tryAcquire(owner, "x", 5, WINDOW);
        clock.now = clock.now.plus(WINDOW).plusSeconds(1);
        limit.release(owner, "x");
        assertThat(limit.size()).isZero();
    }

    @Test
    void baldesSaoIndependentesPorDonoEPorFinalidade() {
        InMemoryRateLimit limit = new InMemoryRateLimit();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        assertThat(limit.tryAcquire(a, "x", 1, WINDOW)).isTrue();
        assertThat(limit.tryAcquire(a, "x", 1, WINDOW)).isFalse();
        assertThat(limit.tryAcquire(a, "y", 1, WINDOW)).isTrue();
        assertThat(limit.tryAcquire(b, "x", 1, WINDOW)).isTrue();
    }

    @Test
    void tetoDeBaldesVarreVencidosEDescartaOsQueVencemPrimeiro() {
        MutableClock clock = new MutableClock();
        InMemoryRateLimit limit = new InMemoryRateLimit(10, clock);
        for (int i = 0; i < 10; i++) {
            limit.tryAcquire(UUID.randomUUID(), "ip", 5, Duration.ofMinutes(1 + i));
        }
        assertThat(limit.size()).isEqualTo(10);
        limit.tryAcquire(UUID.randomUUID(), "ip", 5, WINDOW);   // 11º: alguém sai, o mapa nunca passa do teto
        assertThat(limit.size()).isLessThanOrEqualTo(10);
        clock.now = clock.now.plus(Duration.ofHours(1));
        limit.sweep(clock.now);
        assertThat(limit.size()).isZero();
    }

    @Test
    void reservaEAtomicaSobConcorrencia() throws Exception {
        InMemoryRateLimit limit = new InMemoryRateLimit();
        UUID owner = UUID.randomUUID();
        AtomicInteger granted = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(16);
        try {
            java.util.List<Future<?>> fs = new java.util.ArrayList<>();
            for (int i = 0; i < 200; i++) {
                fs.add(pool.submit(() -> {
                    if (limit.tryAcquire(owner, "login-fail", 5, WINDOW)) {
                        granted.incrementAndGet();
                    }
                }));
            }
            for (Future<?> f : fs) {
                f.get(5, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(granted.get()).isEqualTo(5);
    }
}
