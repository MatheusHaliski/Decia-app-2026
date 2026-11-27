package br.gov.pr.secid.workstation.infrastructure.s3;

import br.gov.pr.secid.workstation.application.media.MediaStoragePort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;

/**
 * Anexos, thumbnails, capas e exports em S3/MinIO. Opt-in: {@code ws.storage.type=s3}; o padrão ({@code local}) grava em disco
 * ({@code ws.storage.local-dir}). Adaptador {@link S3MediaStorage} (HTTP da JDK + SigV4; sem o AWS SDK, que não está disponível
 * offline — Q-168): {@code ws.storage.s3.endpoint} ({@code WS_S3_ENDPOINT}, ex.: {@code http://minio:9000}), {@code region}, {@code bucket},
 * {@code access-key}/{@code secret-key} ({@code WS_S3_ACCESS_KEY_ID}/{@code WS_S3_SECRET_ACCESS_KEY}), {@code path-style} (padrão
 * {@code true}, MinIO) e {@code presign} (padrão {@code false}). O bucket precisa existir (criado pelo runbook de infraestrutura).
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.storage", name = "type", havingValue = "s3")
public class S3StorageConfig {
    private static final Logger log = LoggerFactory.getLogger(S3StorageConfig.class);

    @Bean
    MediaStoragePort s3MediaStorage(@Value("${ws.storage.s3.endpoint:}") String endpoint, @Value("${ws.storage.s3.region:us-east-1}") String region,
                                    @Value("${ws.storage.s3.bucket:workstation-media}") String bucket,
                                    @Value("${ws.storage.s3.access-key:}") String accessKey, @Value("${ws.storage.s3.secret-key:}") String secretKey,
                                    @Value("${ws.storage.s3.path-style:true}") boolean pathStyle,
                                    @Value("${ws.storage.s3.presign:false}") boolean presign,
                                    @Value("${ws.storage.s3.timeout-seconds:60}") int timeoutSeconds) {
        if (endpoint == null || endpoint.isBlank()) {
            throw new IllegalStateException("ws.storage.type=s3 exige ws.storage.s3.endpoint (WS_S3_ENDPOINT)");
        }
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
        S3MediaStorage storage = new S3MediaStorage(URI.create(endpoint.strip()), region, bucket, accessKey, secretKey, pathStyle, presign, http,
                Clock.systemUTC(), Duration.ofSeconds(Math.max(5, timeoutSeconds)));
        log.info("Armazenamento S3/MinIO ligado (ws.storage.type=s3, bucket {}, estilo {})", bucket, pathStyle ? "caminho" : "virtual-host");
        return storage;
    }
}
