package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
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
}
