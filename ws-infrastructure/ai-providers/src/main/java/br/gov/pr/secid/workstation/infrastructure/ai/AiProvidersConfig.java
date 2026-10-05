package br.gov.pr.secid.workstation.infrastructure.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Provedores externos de IA (primário → alternativo), cada um atrás de Circuit Breaker + Retry + TimeLimiter
 * (Resilience4j), sempre com {@code ai_inference_log}. Opt-in: {@code ws.ai.remote-enabled=true}. Sem a flag só o
 * motor local responde (regra de ouro RF43: RESTRITO/SIGILOSO nunca saem para provedor externo).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.ai", name = "remote-enabled", havingValue = "true")
public class AiProvidersConfig {
    private static final Logger log = LoggerFactory.getLogger(AiProvidersConfig.class);

    public AiProvidersConfig() {
        log.info("Provedores externos de IA ligados (ws.ai.remote-enabled=true)");
    }
}
