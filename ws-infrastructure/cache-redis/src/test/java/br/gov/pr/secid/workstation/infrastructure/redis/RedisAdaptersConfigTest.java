package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Com {@code ws.redis.enabled=true} o {@code InMemorySessionStore} se desliga: o contexto PRECISA ganhar um
 * {@link SessionStorePort} do Redis, senão IdentityService/SecurityConfig não constroem e a API não sobe (achado P1 do Codex).
 */
class RedisAdaptersConfigTest {

    @Configuration
    static class FakeRedis {
        @Bean
        StringRedisTemplate stringRedisTemplate() {
            return mock(StringRedisTemplate.class);
        }

        @Bean
        java.time.Clock clock() {
            return java.time.Clock.systemUTC();
        }
    }

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(FakeRedis.class, RedisAdaptersConfig.class,
                    br.gov.pr.secid.workstation.application.identity.InMemorySessionStore.class,
                    br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit.class,
                    br.gov.pr.secid.workstation.application.ai.InMemoryAiBudgetCounter.class);

    @Test
    void comRedisLigadoExisteUmSessionStoreEUmRateLimitDoRedis() {
        runner.withPropertyValues("ws.redis.enabled=true").run(ctx -> {
            assertThat(ctx).hasSingleBean(SessionStorePort.class).hasSingleBean(RateLimitPort.class);
            assertThat(ctx.getBean(SessionStorePort.class)).isInstanceOf(RedisSessionStore.class);
            assertThat(ctx.getBean(RateLimitPort.class)).isInstanceOf(RedisRateLimit.class);
            assertThat(ctx).hasSingleBean(br.gov.pr.secid.workstation.application.ai.AiBudgetCounterPort.class);
            assertThat(ctx.getBean(br.gov.pr.secid.workstation.application.ai.AiBudgetCounterPort.class)).isInstanceOf(RedisAiBudgetCounter.class);
        });
    }

    @Test
    void comRedisDesligadoValemAsImplementacoesEmMemoria() {
        runner.withPropertyValues("ws.redis.enabled=false").run(ctx -> {
            assertThat(ctx).hasSingleBean(SessionStorePort.class).hasSingleBean(RateLimitPort.class);
            assertThat(ctx.getBean(SessionStorePort.class)).isInstanceOf(br.gov.pr.secid.workstation.application.identity.InMemorySessionStore.class);
            assertThat(ctx.getBean(br.gov.pr.secid.workstation.application.ai.AiBudgetCounterPort.class))
                    .isInstanceOf(br.gov.pr.secid.workstation.application.ai.InMemoryAiBudgetCounter.class);
        });
        runner.run(ctx -> assertThat(ctx).hasSingleBean(SessionStorePort.class));
    }
}
