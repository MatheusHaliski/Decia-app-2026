package br.gov.pr.secid.workstation.infrastructure.redis;

import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Redis 7: refresh tokens (família/rotação), rate limit, cotas de IA, contadores, cache de rankings, circuit state.
 * Opt-in: {@code ws.redis.enabled=true} (perfil {@code redis}). Sem a flag, as implementações in-memory assumem
 * (o {@code RateLimitConfig} do ws-web registra o {@code InMemoryRateLimit} só quando esta flag está desligada).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "true")
public class RedisAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(RedisAdaptersConfig.class);

    public RedisAdaptersConfig() {
        log.info("Adaptador Redis ligado (ws.redis.enabled=true)");
    }

    @Bean
    RateLimitPort rateLimitPort(StringRedisTemplate redis) {
        return new RedisRateLimit(redis);
    }
}
