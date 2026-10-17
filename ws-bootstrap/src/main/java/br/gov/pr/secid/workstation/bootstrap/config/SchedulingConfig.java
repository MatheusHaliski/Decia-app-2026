package br.gov.pr.secid.workstation.bootstrap.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Trabalhos agendados (D-145: anonimização das contas cujo prazo de 30 dias para reativar terminou). {@code ws.jobs.enabled=false}
 * desliga todos — útil quando várias réplicas rodam e só uma deve executar os trabalhos (o trabalho é idempotente de qualquer forma).
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "ws.jobs.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
