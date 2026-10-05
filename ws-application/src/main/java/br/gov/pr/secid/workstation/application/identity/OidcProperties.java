package br.gov.pr.secid.workstation.application.identity;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * {@code ws.oidc.*} ({@code WS_OIDC_ENABLED}, {@code WS_OIDC_ISSUER_URI}, {@code WS_OIDC_CLIENT_ID},
 * {@code WS_OIDC_CLIENT_SECRET}, {@code WS_OIDC_PROVIDER_NAME}). Desligado por padrão (RF2.CA03/CA12).
 */
@ConfigurationProperties(prefix = "ws.oidc")
public record OidcProperties(boolean enabled, String issuerUri, String clientId, String clientSecret, String providerName) {

    public OidcProperties {
        issuerUri = issuerUri == null ? "" : issuerUri.trim();
        clientId = clientId == null ? "" : clientId.trim();
        clientSecret = clientSecret == null ? "" : clientSecret;
        providerName = providerName == null || providerName.isBlank() ? "institucional" : providerName.trim();
    }

    @Override
    public String toString() {
        return "OidcProperties{enabled=" + enabled + ", issuerUri=" + issuerUri + ", providerName=" + providerName + "}";
    }
}
