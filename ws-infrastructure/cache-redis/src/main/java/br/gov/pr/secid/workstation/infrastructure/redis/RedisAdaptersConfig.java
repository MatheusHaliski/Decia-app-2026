package br.gov.pr.secid.workstation.infrastructure.redis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Redis 7: refresh tokens (família/rotação), rate limit, cotas de IA, contadores, cache de rankings, circuit state.
 * Opt-in: {@code ws.redis.enabled=true} (perfil {@code redis}). Sem a flag, as implementações in-memory assumem.
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "true")
public class RedisAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(RedisAdaptersConfig.class);

    public RedisAdaptersConfig() {
        log.info("Adaptador Redis ligado (ws.redis.enabled=true)");
    }
}
