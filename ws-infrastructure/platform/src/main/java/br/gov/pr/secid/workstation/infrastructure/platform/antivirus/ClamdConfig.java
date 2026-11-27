package br.gov.pr.secid.workstation.infrastructure.platform.antivirus;

import br.gov.pr.secid.workstation.application.media.AntivirusPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Liga o ClamAV ({@link ClamdAntivirus}) como {@link AntivirusPort} quando {@code ws.upload.antivirus=clamd}
 * ({@code WS_UPLOAD_ANTIVIRUS}); endereço em {@code ws.upload.clamd.host}/{@code port} ({@code WS_CLAMD_HOST}, {@code WS_CLAMD_PORT},
 * padrão 3310), tempo limite e tamanho do pedaço do INSTREAM. Sem a propriedade nada muda: vale o {@code AntivirusPort.NO_OP}
 * (NAO_VERIFICADO). Independe de {@code ws.platform.enabled}.
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.upload", name = "antivirus", havingValue = "clamd")
public class ClamdConfig {
    private static final Logger log = LoggerFactory.getLogger(ClamdConfig.class);

    @Bean
    AntivirusPort clamdAntivirus(@Value("${ws.upload.clamd.host:localhost}") String host, @Value("${ws.upload.clamd.port:3310}") int port,
                                 @Value("${ws.upload.clamd.timeout-ms:30000}") int timeoutMs,
                                 @Value("${ws.upload.clamd.chunk-bytes:65536}") int chunkBytes) {
        log.info("Antivírus ClamAV (clamd INSTREAM) ligado: {}:{}", host, port);
        return new ClamdAntivirus(host, port, timeoutMs, chunkBytes);
    }
}
