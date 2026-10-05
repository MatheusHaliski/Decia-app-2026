package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Contrato com o template (chave, argumentos e leitura do resultado) sem Redis; os scripts Lua em si rodam no RedisRateLimitIT. */
class RedisRateLimitTest {
    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");
    private final StringRedisTemplate template = mock(StringRedisTemplate.class);
    private final RedisRateLimit rl = new RedisRateLimit(template, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquireMandaAJanelaEmMilissegundosEComparaComOLimite() {
        ArgumentCaptor<RedisScript<Long>> script = ArgumentCaptor.forClass(RedisScript.class);
        when(template.execute(any(RedisScript.class), anyList(), any())).thenReturn(5L, 6L, null);
        assertThat(rl.tryAcquire("u1", "login-fail", 5, Duration.ofMinutes(15))).isTrue();
        assertThat(rl.tryAcquire("u1", "login-fail", 5, Duration.ofMinutes(15))).isFalse();
        assertThat(rl.tryAcquire("u1", "login-fail", 5, Duration.ofMinutes(15))).as("sem resposta = falha fechada").isFalse();
        verify(template, org.mockito.Mockito.times(3)).execute(script.capture(), eq(List.of("ws:rl:u1|login-fail")), eq("900000"));
        assertThat(script.getValue().getScriptAsString()).contains("INCR").contains("PEXPIRE");
    }

    @Test
    @SuppressWarnings("unchecked")
    void statusLeUsadoETtlNumaIdaSo() {
        when(template.execute(any(RedisScript.class), anyList())).thenReturn(List.of(6L, 30_000L));
        QuotaStatus s = rl.status("u1", "login-fail", 5, Duration.ofMinutes(15));
        assertThat(s.used()).isEqualTo(6);
        assertThat(s.exhausted()).isTrue();
        assertThat(s.resetAt()).isEqualTo(NOW.plusSeconds(30));
        assertThat(s.retryAfterSeconds(NOW)).isEqualTo(30);
    }

    @Test
    @SuppressWarnings("unchecked")
    void statusSemChaveOuSemTtlEBaldeVazio() {
        when(template.execute(any(RedisScript.class), anyList())).thenReturn(List.of(0L, -2L), List.of(3L, -1L), null, List.of("2", "1000"));
        assertThat(rl.status("u1", "b", 5, Duration.ofMinutes(1))).isEqualTo(QuotaStatus.empty(5));
        assertThat(rl.status("u1", "b", 5, Duration.ofMinutes(1))).isEqualTo(QuotaStatus.empty(5));
        assertThat(rl.status("u1", "b", 5, Duration.ofMinutes(1))).isEqualTo(QuotaStatus.empty(5));
        assertThat(rl.status("u1", "b", 5, Duration.ofMinutes(1)).used()).as("valores em texto também valem").isEqualTo(2);
    }

    @Test
    @SuppressWarnings("unchecked")
    void resetApagaAChaveEReleaseRodaOScriptQueNuncaFicaNegativo() {
        rl.reset("u1", "login-fail");
        verify(template).delete("ws:rl:u1|login-fail");
        ArgumentCaptor<RedisScript<Long>> script = ArgumentCaptor.forClass(RedisScript.class);
        rl.release("u1", "login-fail");
        verify(template).execute(script.capture(), eq(List.of("ws:rl:u1|login-fail")));
        assertThat(script.getValue().getScriptAsString()).contains("DECR").contains("c > 0");
    }

    @Test
    void argumentosInvalidosFalhamAntesDeIrAoRedis() {
        assertThatThrownBy(() -> rl.tryAcquire("u1", "b", 0, Duration.ofMinutes(1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.status("u1", "b", 1, Duration.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> rl.tryAcquire(" ", "b", 1, Duration.ofMinutes(1))).isInstanceOf(IllegalArgumentException.class);
    }
}
