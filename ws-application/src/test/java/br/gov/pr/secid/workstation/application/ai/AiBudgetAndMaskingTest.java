package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.application.common.ApiException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** D-68 (orçamento atômico, por pessoa e empresa, virada do dia) e D-69 (padrões de dados pessoais). */
class AiBudgetAndMaskingTest {

    static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            MutableClock self = this;
            return new Clock() {
                public ZoneId getZone() {
                    return zone;
                }

                public Clock withZone(ZoneId z) {
                    return self.withZone(z);
                }

                public Instant instant() {
                    return self.now;
                }
            };
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @Test
    void empresaTemTetoProprioEEstouroDaEmpresaDevolveAReservaDaPessoa() {
        Clock clock = Clock.systemUTC();
        InMemoryAiBudgetCounter counter = new InMemoryAiBudgetCounter(clock);
        AiBudget b = new AiBudget(counter, new AiControlProperties(false, new AiControlProperties.Budget(10, 1000, 2, 1000, "UTC")), clock);
        UUID company = UUID.randomUUID();
        b.reserve(UUID.randomUUID(), company, 10);
        b.reserve(UUID.randomUUID(), company, 10);
        UUID third = UUID.randomUUID();
        ApiException e = catchThrowableOfType(ApiException.class, () -> b.reserve(third, company, 10));
        assertThat(e.status()).isEqualTo(429);
        assertThat(e.details()).containsEntry("scope", "COMPANY").containsEntry("metric", "REQUESTS");
        String today = java.time.LocalDate.now(clock).toString();
        assertThat(counter.current(AiBudget.key("user", third, java.time.LocalDate.parse(today), "req"))).as("reserva da pessoa devolvida")
                .isZero();
        assertThat(counter.current(AiBudget.key("user", third, java.time.LocalDate.parse(today), "tok"))).isZero();
    }

    @Test
    void tokensEstimadosEAcertoComOReal() {
        Clock clock = Clock.systemUTC();
        InMemoryAiBudgetCounter counter = new InMemoryAiBudgetCounter(clock);
        AiBudget b = new AiBudget(counter, new AiControlProperties(false, new AiControlProperties.Budget(100, 500, 100, 10_000, "UTC")), clock);
        UUID user = UUID.randomUUID();
        AiBudget.Reservation r = b.reserve(user, null, 400);
        ApiException e = catchThrowableOfType(ApiException.class, () -> b.reserve(user, null, 200));
        assertThat(e.details()).containsEntry("metric", "TOKENS").containsEntry("scope", "USER");
        b.settle(r, 100);                                        // gastou menos que o estimado: devolve 300
        AiBudget.Reservation r2 = b.reserve(user, null, 200);
        assertThat(r2.tokens()).isEqualTo(200);
        b.settle(r2, 200);                                       // diferença zero: nada muda
        b.refund(b.reserve(user, null, 1));
        assertThat(counter.current(AiBudget.key("user", user, r.day(), "tok"))).isEqualTo(300);
    }

    @Test
    void viradaDoDiaNoFusoConfiguradoZeraOOrcamento() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-06T02:30:00Z"));     // 23:30 em São Paulo (dia 05)
        AiBudget b = new AiBudget(new InMemoryAiBudgetCounter(clock), new AiControlProperties(false,
                new AiControlProperties.Budget(1, 1000, 100, 10_000, null)), clock);
        UUID user = UUID.randomUUID();
        b.reserve(user, null, 1);
        ApiException e = catchThrowableOfType(ApiException.class, () -> b.reserve(user, null, 1));
        assertThat(((Number) e.details().get("retryAfterSeconds")).longValue()).isBetween(1700L, 1900L);
        clock.now = Instant.parse("2026-10-06T03:00:30Z");                                 // 00:00:30 do dia 06 em São Paulo
        assertThat(b.reserve(user, null, 1).day()).hasToString("2026-10-06");
    }

    @Test
    void contadorEmMemoriaNuncaPassaDoLimiteSobConcorrencia() throws Exception {
        InMemoryAiBudgetCounter c = new InMemoryAiBudgetCounter(Clock.systemUTC());
        ExecutorService pool = Executors.newFixedThreadPool(16);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        for (int i = 0; i < 200; i++) {
            pool.submit(() -> {
                go.await();
                if (c.tryAdd("k", 1, 25, Duration.ofMinutes(1))) {
                    ok.incrementAndGet();
                }
                return null;
            });
        }
        go.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        assertThat(ok.get()).isEqualTo(25);
        assertThat(c.current("k")).isEqualTo(25);
        c.add("k", -100, Duration.ofMinutes(1));
        assertThat(c.current("k")).as("nunca abaixo de zero").isZero();
        assertThat(c.current("inexistente")).isZero();
    }

    @Test
    void janelaVencidaRecomecaEVarreduraLimpa() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-06T12:00:00Z"));
        InMemoryAiBudgetCounter c = new InMemoryAiBudgetCounter(clock);
        assertThat(c.tryAdd("k", 5, 5, Duration.ofSeconds(10))).isTrue();
        assertThat(c.tryAdd("k", 1, 5, Duration.ofSeconds(10))).isFalse();
        clock.now = clock.now.plusSeconds(11);
        assertThat(c.current("k")).isZero();
        assertThat(c.tryAdd("k", 1, 5, Duration.ofSeconds(10))).isTrue();
        for (int i = 0; i < InMemoryAiBudgetCounter.SWEEP_AT; i++) {
            c.add("x" + i, 1, Duration.ofSeconds(1));
        }
        clock.now = clock.now.plusSeconds(5);
        assertThat(c.tryAdd("y", 1, 5, Duration.ofSeconds(10))).isTrue();
        assertThat(c.current("x1")).isZero();
    }

    @Test
    void mascaraEmailCpfCnpjTelefoneEContaPorTipo() {
        PersonalDataMasker.Masked m = PersonalDataMasker.mask(
                "Fale com joao@ex.com ou ana.b+x@orgao.pr.gov.br; CPF 12345678909 e 987.654.321-00; CNPJ 12345678000195; "
                        + "fones +55 41 3333-4444, (41) 99999-0000 e 41988887777. Protocolo 2026 e ano 2025 ficam.");
        assertThat(m.text()).doesNotContain("joao@").doesNotContain("12345678909").doesNotContain("987.654.321-00")
                .doesNotContain("12345678000195").doesNotContain("3333-4444").doesNotContain("99999-0000").doesNotContain("41988887777")
                .contains("Protocolo 2026 e ano 2025 ficam");
        assertThat(m.counts()).containsEntry("EMAIL", 2).containsEntry("CPF", 3).containsEntry("CNPJ", 1).containsEntry("TELEFONE", 2);
        assertThat(m.total()).isEqualTo(8);
        assertThat(m.countsJson()).isEqualTo("{\"EMAIL\":2,\"CNPJ\":1,\"CPF\":3,\"TELEFONE\":2}");
        assertThat(PersonalDataMasker.mask(null).text()).isEmpty();
        assertThat(PersonalDataMasker.mask("sem dados").counts()).isEmpty();
        assertThat(PersonalDataMasker.mask("sem dados").countsJson()).isEqualTo("{}");
    }
}
