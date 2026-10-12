package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.ai.AiBudgetCounterPort;
import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis 7: rate limit (Lua), famílias de refresh token, cotas de IA, contadores, cache de rankings.
 * Opt-in: {@code ws.redis.enabled=true} (perfil {@code redis}). Sem a flag, as implementações em memória assumem.
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "true")
public class RedisAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(RedisAdaptersConfig.class);

    public RedisAdaptersConfig() {
        log.info("Adaptador Redis ligado (ws.redis.enabled=true)");
    }

    @Bean
    RateLimitPort redisRateLimit(StringRedisTemplate redis) {
        return new RedisRateLimit(redis);
    }

    /** Famílias de refresh no Redis — sem este bean a API não subiria com a flag ligada (InMemorySessionStore se desliga). */
    @Bean
    SessionStorePort redisSessionStore(StringRedisTemplate redis) {
        return new RedisSessionStore(redis);
    }

    /** Orçamento diário de IA compartilhado entre réplicas (D-68) — o InMemoryAiBudgetCounter se desliga com a flag. */
    @Bean
    AiBudgetCounterPort redisAiBudgetCounter(StringRedisTemplate redis) {
        return new RedisAiBudgetCounter(redis);
    }
}
