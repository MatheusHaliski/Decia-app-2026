package br.gov.pr.secid.workstation.web.ratelimit;

import br.gov.pr.secid.workstation.application.ratelimit.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitConfigTest {
    private final ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(RateLimitConfig.class);

    @Test
    void semRedisEntraOAdaptadorEmMemoriaEOBulkheadUsaOPool() {
        runner.withPropertyValues("spring.datasource.hikari.maximum-pool-size=4").run(ctx -> {
            assertThat(ctx).hasSingleBean(RateLimitPort.class);
            assertThat(ctx.getBean(RateLimitPort.class)).isInstanceOf(InMemoryRateLimit.class);
            HashBulkhead b = ctx.getBean(HashBulkhead.class);
            assertThat(b.capacity()).isEqualTo(HashBulkhead.defaultPermits(Runtime.getRuntime().availableProcessors(), 4));
            assertThat(b.waitMillis()).isEqualTo(2_000);
        });
    }

    @Test
    void comRedisLigadoOAdaptadorEmMemoriaNaoEntra() {
        runner.withPropertyValues("ws.redis.enabled=true").run(ctx -> assertThat(ctx).doesNotHaveBean(RateLimitPort.class));
    }

    @Test
    void permitsEEsperaPodemSerFixadosPorPropriedade() {
        runner.withPropertyValues("ws.security.auth.hash-permits=7", "ws.security.auth.hash-wait-millis=500").run(ctx -> {
            HashBulkhead b = ctx.getBean(HashBulkhead.class);
            assertThat(b.capacity()).isEqualTo(7);
            assertThat(b.waitMillis()).isEqualTo(500);
        });
    }
}
