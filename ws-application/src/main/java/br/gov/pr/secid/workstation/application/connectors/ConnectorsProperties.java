package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * {@code ws.connectors.*} — conectores de fontes externas, DESLIGADOS por padrão ({@code WS_CONNECTORS_ENABLED=false}). Um provedor OAuth só
 * liga com a chave geral, a chave de cifra dos tokens ({@code WS_CONNECTORS_TOKEN_KEY}, base64 de 32 bytes: sem ela os conectores ficam
 * desabilitados — nunca token em texto puro) e o próprio client id, segredo e redirect URI ({@code WS_CONNECTORS_GOOGLE_*},
 * {@code WS_CONNECTORS_MICROSOFT_*}). As URLs dos provedores têm os valores oficiais como padrão e só mudam em teste (servidor local) ou
 * em nuvem soberana. Segredos nunca aparecem no {@link #toString()}. Detalhes: {@code docs/arquitetura/CONECTORES.md}.
 *
 * @param enabled         chave geral dos provedores OAuth (a importação por link não depende dela: não chama ninguém)
 * @param tokenKey        base64 de 32 bytes — AES-256-GCM dos tokens e do verificador PKCE
 * @param frontendBaseUrl destino do 302 do callback ({@code {frontendBaseUrl}{returnTo}?conector=ok|erro&motivo=})
 * @param httpTimeout     tempo máximo de cada chamada aos provedores
 * @param maxImportBytes  teto do download de um item COPIADO (o pipeline de mídia ainda aplica o limite por tipo)
 */
@ConfigurationProperties(prefix = "ws.connectors")
public record ConnectorsProperties(boolean enabled, String tokenKey, String frontendBaseUrl, Duration httpTimeout, long maxImportBytes,
                                   Google google, Microsoft microsoft) {
    static final long MIB = 1024L * 1024L;

    public ConnectorsProperties {
        tokenKey = tokenKey == null ? "" : tokenKey.trim();
        frontendBaseUrl = frontendBaseUrl == null || frontendBaseUrl.isBlank() ? "http://localhost:3000" : stripSlash(frontendBaseUrl.trim());
        httpTimeout = httpTimeout == null || httpTimeout.isNegative() || httpTimeout.isZero() ? Duration.ofSeconds(20) : httpTimeout;
        maxImportBytes = maxImportBytes > 0 ? Math.min(maxImportBytes, 200 * MIB) : 50 * MIB;
        google = google == null ? new Google(null, null, null, null, null, null, null, null) : google;
        microsoft = microsoft == null ? new Microsoft(null, null, null, null, null, null, 0) : microsoft;
    }

    /** Desligado e sem nada configurado (testes e ambientes sem conectores). */
    public static ConnectorsProperties disabled() {
        return new ConnectorsProperties(false, null, null, null, 0, null, null);
    }

    /** Client id, segredo e redirect URI do provedor estão preenchidos (a chave de cifra é conferida à parte). */
    public boolean configured(ConnectorProvider provider) {
        return switch (provider) {
            case GOOGLE -> google.configured();
            case MICROSOFT -> microsoft.configured();
            case APPLE_ICLOUD -> false;
        };
    }

    @Override
    public String toString() {
        return "ConnectorsProperties{enabled=" + enabled + ", tokenKey=" + (tokenKey.isEmpty() ? "(vazia)" : "***") + ", frontendBaseUrl="
                + frontendBaseUrl + ", httpTimeout=" + httpTimeout + ", maxImportBytes=" + maxImportBytes + ", google=" + google
                + ", microsoft=" + microsoft + "}";
    }

    /**
     * Google: OAuth 2.0 (authorization code + PKCE, {@code access_type=offline&prompt=consent}) e Drive API v3.
     *
     * @param driveUrl base da Drive API v3 ({@code files.list}, {@code files.get}, {@code files.export})
     */
    public record Google(String clientId, String clientSecret, String redirectUri, String authorizationUrl, String tokenUrl, String revocationUrl,
                         String userinfoUrl, String driveUrl) {
        public Google {
            clientId = trim(clientId);
            clientSecret = clientSecret == null ? "" : clientSecret;
            redirectUri = trim(redirectUri);
            authorizationUrl = orDefault(authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
            tokenUrl = orDefault(tokenUrl, "https://oauth2.googleapis.com/token");
            revocationUrl = orDefault(revocationUrl, "https://oauth2.googleapis.com/revoke");
            userinfoUrl = orDefault(userinfoUrl, "https://openidconnect.googleapis.com/v1/userinfo");
            driveUrl = orDefault(driveUrl, "https://www.googleapis.com/drive/v3");
        }

        public boolean configured() {
            return !clientId.isEmpty() && !clientSecret.isBlank() && !redirectUri.isEmpty();
        }

        @Override
        public String toString() {
            return "Google{clientId=" + clientId + ", clientSecret=" + (clientSecret.isBlank() ? "(vazio)" : "***") + ", redirectUri=" + redirectUri
                    + ", tokenUrl=" + tokenUrl + ", driveUrl=" + driveUrl + "}";
        }
    }

    /**
     * Microsoft: OAuth 2.0 da Microsoft identity platform (v2.0; tenant {@code common} aceita conta pessoal e corporativa) e Graph v1.0.
     *
     * @param pdfConversionMaxBytes até onde se pede {@code /content?format=pdf} (a documentação do Graph cita 2 MB); acima, baixa o original
     */
    public record Microsoft(String clientId, String clientSecret, String redirectUri, String tenant, String authorityUrl, String graphUrl,
                            long pdfConversionMaxBytes) {
        public Microsoft {
            clientId = trim(clientId);
            clientSecret = clientSecret == null ? "" : clientSecret;
            redirectUri = trim(redirectUri);
            tenant = tenant == null || tenant.isBlank() || !tenant.trim().matches("[A-Za-z0-9.\\-]{1,64}") ? "common" : tenant.trim();
            authorityUrl = orDefault(authorityUrl, "https://login.microsoftonline.com");
            graphUrl = orDefault(graphUrl, "https://graph.microsoft.com/v1.0");
            pdfConversionMaxBytes = pdfConversionMaxBytes > 0 ? pdfConversionMaxBytes : 2 * MIB;
        }

        public boolean configured() {
            return !clientId.isEmpty() && !clientSecret.isBlank() && !redirectUri.isEmpty();
        }

        public String authorizeEndpoint() {
            return authorityUrl + "/" + tenant + "/oauth2/v2.0/authorize";
        }

        public String tokenEndpoint() {
            return authorityUrl + "/" + tenant + "/oauth2/v2.0/token";
        }

        @Override
        public String toString() {
            return "Microsoft{clientId=" + clientId + ", clientSecret=" + (clientSecret.isBlank() ? "(vazio)" : "***") + ", redirectUri="
                    + redirectUri + ", tenant=" + tenant + ", graphUrl=" + graphUrl + ", pdfConversionMaxBytes=" + pdfConversionMaxBytes + "}";
        }
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : stripSlash(value.trim());
    }

    private static String stripSlash(String s) {
        String out = s;
        while (out.endsWith("/")) {
            out = out.substring(0, out.length() - 1);
        }
        return out;
    }
}
