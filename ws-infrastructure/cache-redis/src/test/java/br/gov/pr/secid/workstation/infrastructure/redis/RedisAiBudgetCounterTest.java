package br.gov.pr.secid.workstation.infrastructure.redis;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Contrato do adaptador sem Docker: argumentos dos scripts (delta, limite, TTL ≥ 1 s) e leitura nunca negativa. */
class RedisAiBudgetCounterTest {

    @Test
    @SuppressWarnings("unchecked")
    void scriptsRecebemDeltaLimiteETtl() {
        StringRedisTemplate t = mock(StringRedisTemplate.class);
        when(t.execute(eq(RedisAiBudgetCounter.TRY_ADD), anyList(), eq("10"), eq("250"), eq("3600"))).thenReturn(1L);
        RedisAiBudgetCounter c = new RedisAiBudgetCounter(t);
        assertThat(c.tryAdd("k", 10, 250, Duration.ofHours(1))).isTrue();
        assertThat(c.tryAdd("k", 10, 250, Duration.ofMillis(10))).as("TTL zero vira 1 s; script devolveu nulo → recusa").isFalse();
        c.add("k", -5, Duration.ZERO);
        verify(t).execute(eq(RedisAiBudgetCounter.ADD), eq(List.of("k")), eq("-5"), eq("1"));
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(t.opsForValue()).thenReturn(ops);
        when(ops.get("k")).thenReturn("-3");
        assertThat(c.current("k")).isZero();
        when(ops.get("k")).thenReturn(null);
        assertThat(c.current("k")).isZero();
        when(ops.get("k")).thenReturn("42");
        assertThat(c.current("k")).isEqualTo(42);
    }
}
