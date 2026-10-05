package br.gov.pr.secid.workstation.infrastructure.platform;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Integrações de plataforma (e-mail, OCR/antivírus, Google Workspace, Microsoft 365, e-Protocolo, Wikidata/CNPJ,
 * transcrição). Cada conector terá a própria flag ({@code ws.platform.<conector>.enabled}); esta liga o módulo.
 * Opt-in: {@code ws.platform.enabled=true}.
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.platform", name = "enabled", havingValue = "true")
public class PlatformAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(PlatformAdaptersConfig.class);

    public PlatformAdaptersConfig() {
        log.info("Conectores de plataforma ligados (ws.platform.enabled=true)");
    }
}
