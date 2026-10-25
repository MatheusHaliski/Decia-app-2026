package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.util.Optional;

/**
 * Registra o pipeline de mídia do Bloco 5 (D-67) com a primeira rota de upload (foto de perfil, RF3.CA05). Sem adaptador de
 * armazenamento (ex.: {@code ws.storage.type=s3} antes do SDK, Q-168) a aplicação continua subindo e o upload responde
 * {@code 503 ARMAZENAMENTO_INDISPONIVEL} em vez de quebrar a inicialização.
 */
@Configuration
@EnableConfigurationProperties(MediaUploadProperties.class)
public class MediaConfig {
    public static final String INDISPONIVEL = "ARMAZENAMENTO_INDISPONIVEL";

    @Bean
    MediaUploadInspector mediaUploadInspector(MediaUploadProperties props) {
        return new MediaUploadInspector(props);
    }

    @Bean
    MediaUploadService mediaUploadService(MediaUploadInspector inspector, ObjectProvider<AntivirusPort> antivirus,
                                          ObjectProvider<MediaStoragePort> storage, MediaObjectRepositoryPort repository,
                                          ResourceAuthorizer authorizer, MediaUploadProperties props,
                                          @Value("${ws.storage.s3.bucket:ws-media}") String bucket, Clock clock) {
        return new MediaUploadService(inspector, Optional.ofNullable(antivirus.getIfAvailable()),
                storage.getIfAvailable(MediaConfig::unavailableStorage), repository, authorizer, props, bucket, clock);
    }

    static MediaStoragePort unavailableStorage() {
        return new MediaStoragePort() {
            @Override
            public void put(String key, byte[] content, String mime) {
                throw down();
            }

            @Override
            public byte[] read(String key) {
                throw down();
            }

            @Override
            public void delete(String key) {
                throw down();
            }

            private ApiException down() {
                return ApiException.unavailable(INDISPONIVEL, "Armazenamento de arquivos indisponível neste ambiente.");
            }
        };
    }

}
