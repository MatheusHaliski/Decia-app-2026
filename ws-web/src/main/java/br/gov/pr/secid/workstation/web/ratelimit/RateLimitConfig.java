package br.gov.pr.secid.workstation.web.ratelimit;

import br.gov.pr.secid.workstation.application.ratelimit.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Freios de autenticação (D-14): o {@link RateLimitPort} em memória entra só quando o Redis está desligado
 * ({@code ws.redis.enabled=false}, padrão) — com Redis ligado, o {@code RedisAdaptersConfig} registra o adaptador
 * distribuído. O {@link HashBulkhead} limita os hashes Argon2 simultâneos a
 * {@code max(1, min(max(2, núcleos), pool/2))} (ou {@code ws.security.auth.hash-permits}, se definido).
 */
@Configuration
public class RateLimitConfig {
    private static final Logger log = LoggerFactory.getLogger(RateLimitConfig.class);

    @Bean
    @ConditionalOnProperty(prefix = "ws.redis", name = "enabled", havingValue = "false", matchIfMissing = true)
    RateLimitPort inMemoryRateLimit() {
        log.info("Rate limit em memória (ws.redis.enabled=false): vale só para uma instância da API");
        return new InMemoryRateLimit();
    }

    @Bean
    HashBulkhead hashBulkhead(@Value("${spring.datasource.hikari.maximum-pool-size:10}") int dbPool,
                              @Value("${ws.security.auth.hash-permits:0}") int configuredPermits,
                              @Value("${ws.security.auth.hash-wait-millis:2000}") long waitMillis) {
        int permits = configuredPermits > 0 ? configuredPermits
                : HashBulkhead.defaultPermits(Runtime.getRuntime().availableProcessors(), dbPool);
        log.info("HashBulkhead: {} hashes Argon2 simultâneos, espera de {} ms", permits, waitMillis);
        return new HashBulkhead(permits, waitMillis);
    }
}
