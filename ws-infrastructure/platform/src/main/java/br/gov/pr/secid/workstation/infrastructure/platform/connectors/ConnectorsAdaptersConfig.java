package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort;
import br.gov.pr.secid.workstation.application.connectors.TokenCipherPort;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adaptadores dos conectores de fontes externas, só com {@code ws.connectors.enabled=true} (padrão: desligado — nenhum cliente HTTP é
 * criado). Mesmo ligados, cada provedor só fica habilitado com client id, segredo e redirect URI próprios e com
 * {@code WS_CONNECTORS_TOKEN_KEY} válida: sem a chave, a cifra é {@link TokenCipherPort#UNAVAILABLE} e tudo responde
 * {@code 503 CONECTOR_DESABILITADO} (nunca token em texto puro). O log de arranque diz o que ligou, sem segredo.
 */
@Configuration
@ConditionalOnProperty(prefix = "ws.connectors", name = "enabled", havingValue = "true")
public class ConnectorsAdaptersConfig {
    private static final Logger log = LoggerFactory.getLogger(ConnectorsAdaptersConfig.class);

    @Bean
    TokenCipherPort connectorTokenCipher(ConnectorsProperties props) {
        TokenCipherPort cipher = AesGcmTokenCipher.fromBase64(props.tokenKey()).<TokenCipherPort>map(c -> c).orElse(TokenCipherPort.UNAVAILABLE);
        if (!cipher.available()) {
            log.warn("Conectores ligados, mas WS_CONNECTORS_TOKEN_KEY está ausente ou não é base64 de 32 bytes: conectores OAuth DESABILITADOS");
        }
        log.info("Conectores de fontes externas: GOOGLE configurado={}, MICROSOFT configurado={}, chave de tokens válida={}",
                props.configured(ConnectorProvider.GOOGLE), props.configured(ConnectorProvider.MICROSOFT), cipher.available());
        return cipher;
    }

    @Bean
    ConnectorHttp connectorHttp(ConnectorsProperties props) {
        return new ConnectorHttp(props.httpTimeout());
    }

    @Bean
    OAuthClientPort googleOAuthAdapter(ConnectorsProperties props, ConnectorHttp http) {
        return new GoogleOAuthAdapter(props.google(), http);
    }

    @Bean
    ExternalDocPort googleDriveAdapter(ConnectorsProperties props, ConnectorHttp http) {
        return new GoogleDriveAdapter(props.google(), http);
    }

    @Bean
    OAuthClientPort microsoftOAuthAdapter(ConnectorsProperties props, ConnectorHttp http) {
        return new MicrosoftOAuthAdapter(props.microsoft(), http);
    }

    @Bean
    ExternalDocPort microsoftGraphAdapter(ConnectorsProperties props, ConnectorHttp http) {
        return new MicrosoftGraphAdapter(props.microsoft(), http);
    }
}
