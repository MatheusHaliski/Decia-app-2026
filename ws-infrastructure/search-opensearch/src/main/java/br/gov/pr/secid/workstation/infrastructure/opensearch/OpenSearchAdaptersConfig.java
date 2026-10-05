package br.gov.pr.secid.workstation.infrastructure.opensearch;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Busca textual (RF27) e semântica/embeddings (RF33) no OpenSearch 2.19, índices {@code ws-tasks}, {@code ws-projects},
 * {@code ws-memory}. Opt-in: {@code ws.opensearch.enabled=true}. Sem a flag a busca cai para o MySQL (FULLTEXT).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.opensearch", name = "enabled", havingValue = "true")
public class OpenSearchAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(OpenSearchAdaptersConfig.class);

    public OpenSearchAdaptersConfig() {
        log.info("Adaptador OpenSearch ligado (ws.opensearch.enabled=true)");
    }
}
