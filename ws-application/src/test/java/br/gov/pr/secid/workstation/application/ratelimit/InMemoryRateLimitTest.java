package br.gov.pr.secid.workstation.application.ratelimit;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Janela fixa em memória: reserva atômica sob concorrência, release nunca abaixo de zero, teto de baldes e varredura. */
class InMemoryRateLimitTest {
    private static final Duration JANELA = Duration.ofMinutes(15);

    /** Relógio que só anda quando o teste manda. */
    private static final class RelogioManual extends Clock {
        private Instant now = Instant.parse("2026-10-05T12:00:00Z");

        void avanca(Duration d) {
            now = now.plus(d);
        }

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
    void sextaReservaNaJanelaEstouraEContaMesmoAssim() {
        RelogioManual clock = new RelogioManual();
        InMemoryRateLimit rl = new InMemoryRateLimit(clock, 10);
        for (int i = 0; i < 5; i++) {
            assertThat(rl.tryAcquire("u1", "login-fail", 5, JANELA)).as("tentativa %d", i + 1).isTrue();
        }
        assertThat(rl.tryAcquire("u1", "login-fail", 5, JANELA)).isFalse();
        QuotaStatus s = rl.status("u1", "login-fail", 5, JANELA);
        assertThat(s.used()).isEqualTo(6);
        assertThat(s.exhausted()).isTrue();
        assertThat(s.resetAt()).isEqualTo(clock.instant().plus(JANELA));
        assertThat(s.retryAfterSeconds(clock.instant())).isEqualTo(JANELA.toSeconds());
        // a tentativa bloqueada não estende a janela
        clock.avanca(Duration.ofMinutes(14));
        assertThat(rl.tryAcquire("u1", "login-fail", 5, JANELA)).isFalse();
        assertThat(rl.status("u1", "login-fail", 5, JANELA).resetAt()).isEqualTo(s.resetAt());
        // vencida a janela, o balde reabre
        clock.avanca(Duration.ofMinutes(1));
        assertThat(rl.status("u1", "login-fail", 5, JANELA)).isEqualTo(QuotaStatus.empty(5));
        assertThat(rl.tryAcquire("u1", "login-fail", 5, JANELA)).isTrue();
        assertThat(rl.status("u1", "login-fail", 5, JANELA).used()).isEqualTo(1);
    }

    @Test
    void baldesSaoIndependentesPorDonoEPorBucket() {
        InMemoryRateLimit rl = new InMemoryRateLimit();
        assertThat(rl.tryAcquire("a", "x", 1, JANELA)).isTrue();
        assertThat(rl.tryAcquire("a", "x", 1, JANELA)).isFalse();
        assertThat(rl.tryAcquire("a", "y", 1, JANELA)).isTrue();
        assertThat(rl.tryAcquire("b", "x", 1, JANELA)).isTrue();
    }

    @Test
    void releaseDevolveUmaReservaENuncaFicaNegativo() {
        InMemoryRateLimit rl = new InMemoryRateLimit();
        rl.release("u1", "login-fail");                       // sem balde: nada acontece
        assertThat(rl.status("u1", "login-fail", 5, JANELA).used()).isZero();
        rl.tryAcquire("u1", "login-fail", 5, JANELA);
        rl.tryAcquire("u1", "login-fail", 5, JANELA);
        rl.release("u1", "login-fail");
        assertThat(rl.status("u1", "login-fail", 5, JANELA).used()).isEqualTo(1);
        rl.release("u1", "login-fail");
        rl.release("u1", "login-fail");
        assertThat(rl.status("u1", "login-fail", 5, JANELA).used()).isZero();
        assertThat(rl.size()).isZero();
    }

    @Test
    void resetZeraOBalde() {
        InMemoryRateLimit rl = new InMemoryRateLimit();
        for (int i = 0; i < 6; i++) {
            rl.tryAcquire("u1", "login-fail", 5, JANELA);
        }
        rl.reset("u1", "login-fail");
        assertThat(rl.status("u1", "login-fail", 5, JANELA).exhausted()).isFalse();
        assertThat(rl.tryAcquire("u1", "login-fail", 5, JANELA)).isTrue();
    }

    @Test
    void quarentaPedidosEmParaleloReservamNoMaximoCinco() throws Exception {
        InMemoryRateLimit rl = new InMemoryRateLimit();
        int pedidos = 40;
        ExecutorService pool = Executors.newFixedThreadPool(pedidos);
        try {
            CountDownLatch largada = new CountDownLatch(1);
            AtomicInteger aceitos = new AtomicInteger();
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < pedidos; i++) {
                futures.add(pool.submit(() -> {
                    largada.await();
                    if (rl.tryAcquire("conta", "login-fail", 5, JANELA)) {
                        aceitos.incrementAndGet();
                    }
                    return null;
                }));
            }
            largada.countDown();
            for (Future<?> f : futures) {
                f.get(10, TimeUnit.SECONDS);
            }
            assertThat(aceitos.get()).isEqualTo(5);
            assertThat(rl.status("conta", "login-fail", 5, JANELA).used()).isEqualTo(pedidos);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void tetoDeBaldesVarreOsVencidosERecusaQuandoNaoHaEspaco() {
        RelogioManual clock = new RelogioManual();
        InMemoryRateLimit rl = new InMemoryRateLimit(clock, 3);
        assertThat(rl.tryAcquire("ip1", "r", 1, JANELA)).isTrue();
        assertThat(rl.tryAcquire("ip2", "r", 1, JANELA)).isTrue();
        assertThat(rl.tryAcquire("ip3", "r", 1, JANELA)).isTrue();
        // cheio e nada vencido: balde novo é recusado (falha fechada); baldes existentes seguem funcionando
        assertThat(rl.tryAcquire("ip4", "r", 1, JANELA)).isFalse();
        assertThat(rl.sweeps()).isEqualTo(1);
        assertThat(rl.tryAcquire("ip1", "r", 5, JANELA)).isTrue();
        assertThat(rl.size()).isEqualTo(3);
        // vencidas as janelas, a varredura abre espaço
        clock.avanca(JANELA.plusSeconds(1));
        assertThat(rl.tryAcquire("ip4", "r", 1, JANELA)).isTrue();
        assertThat(rl.sweeps()).isEqualTo(2);
        assertThat(rl.size()).isEqualTo(1);
    }

    @Test
    void argumentosInvalidosFalhamCedo() {
        InMemoryRateLimit rl = new InMemoryRateLimit();
        assertThatThrownBy(() -> rl.tryAcquire("", "b", 1, JANELA)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.tryAcquire("a", null, 1, JANELA)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.tryAcquire("a", "b", 0, JANELA)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.tryAcquire("a", "b", 1, Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.status("a", "b", 1, Duration.ofSeconds(-1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new InMemoryRateLimit(Clock.systemUTC(), 0)).isInstanceOf(IllegalArgumentException.class);
        assertThat(RateLimitPort.key("a", "b")).isEqualTo("a|b");
    }

    @Test
    void quotaStatusCalculaRetryAfter() {
        Instant now = Instant.parse("2026-10-05T12:00:00Z");
        assertThat(QuotaStatus.empty(5).retryAfterSeconds(now)).isZero();
        assertThat(new QuotaStatus(5, 6, now.plusSeconds(90)).retryAfterSeconds(now)).isEqualTo(90);
        assertThat(new QuotaStatus(5, 6, now.plusMillis(200)).retryAfterSeconds(now)).isEqualTo(1);
        assertThat(new QuotaStatus(5, 6, now.minusSeconds(5)).retryAfterSeconds(now)).isEqualTo(1);
        assertThat(new QuotaStatus(5, 4, now).exhausted()).isFalse();
        assertThat(new QuotaStatus(5, 5, now).exhausted()).isTrue();
    }
}
