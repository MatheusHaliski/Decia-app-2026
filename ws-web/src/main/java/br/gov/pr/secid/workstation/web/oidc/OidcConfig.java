package br.gov.pr.secid.workstation.web.oidc;

import br.gov.pr.secid.workstation.application.identity.IdTokenVerifier;
import br.gov.pr.secid.workstation.application.identity.OidcProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Liga o verificador de {@code id_token} só com {@code ws.oidc.enabled=true} e issuer/client-id presentes (nomes: WS_OIDC_*). */
@Configuration
@ConditionalOnProperty(prefix = "ws.oidc", name = "enabled", havingValue = "true")
public class OidcConfig {
    private static final Logger log = LoggerFactory.getLogger(OidcConfig.class);

    @Bean
    IdTokenVerifier idTokenVerifier(OidcProperties props) {
        if (props.issuerUri().isBlank() || props.clientId().isBlank()) {
            throw new IllegalStateException("ws.oidc.enabled=true exige WS_OIDC_ISSUER_URI e WS_OIDC_CLIENT_ID");
        }
        log.info("Login institucional OIDC ligado (issuer={}, provedor={})", props.issuerUri(), props.providerName());
        return new NimbusIdTokenVerifier(props.issuerUri(), props.clientId());
    }
}
