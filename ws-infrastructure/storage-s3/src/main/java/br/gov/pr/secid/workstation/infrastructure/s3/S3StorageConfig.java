package br.gov.pr.secid.workstation.infrastructure.s3;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Anexos, thumbnails, capas e exports em S3/MinIO. Opt-in: {@code ws.storage.type=s3}; o padrão ({@code local}) grava
 * em disco ({@code ws.storage.local-dir}). O SDK da AWS entra junto com o primeiro adaptador real (Bloco de RF20/RF41).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.storage", name = "type", havingValue = "s3")
public class S3StorageConfig {
    private static final Logger log = LoggerFactory.getLogger(S3StorageConfig.class);

    public S3StorageConfig() {
        log.info("Armazenamento S3/MinIO ligado (ws.storage.type=s3)");
    }
}
