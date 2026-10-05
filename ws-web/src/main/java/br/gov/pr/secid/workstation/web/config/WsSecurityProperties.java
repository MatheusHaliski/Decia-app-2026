package br.gov.pr.secid.workstation.web.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Propriedades de segurança da API ({@code ws.security.*}). As chaves RS256 vêm por CAMINHO de arquivo
 * ({@code WS_JWT_*_KEY_PATH}) ou pelo CONTEÚDO PEM ({@code WS_JWT_*_KEY_PEM}) — D-24: os dois são aceitos, o caminho
 * tem precedência. O conteúdo nunca entra em log nem em erro.
 *
 * @param jwt  emissor, audiência, TTL do access token e chaves RS256 (pública valida; privada emite)
 * @param cors origens permitidas ao BFF (lista separada por vírgula no application.yml)
 */
@ConfigurationProperties(prefix = "ws.security")
public record WsSecurityProperties(Jwt jwt, Cors cors) {

    public WsSecurityProperties {
        jwt = jwt == null ? new Jwt(null, null, null, null, null, null, 0) : jwt;
        cors = cors == null ? new Cors(null) : cors;
    }

    public record Jwt(String issuer, String audience, String publicKeyPath, String privateKeyPath, String publicKeyPem,
                      String privateKeyPem, long accessTtlMinutes) {
        public static final long DEFAULT_ACCESS_TTL_MINUTES = 15;   // Q-49: padrão até a resposta

        public Jwt {
            issuer = blankToDefault(issuer, "work-station");
            audience = blankToDefault(audience, "work-station-api");
            publicKeyPath = publicKeyPath == null ? "" : publicKeyPath.trim();
            privateKeyPath = privateKeyPath == null ? "" : privateKeyPath.trim();
            publicKeyPem = publicKeyPem == null ? "" : publicKeyPem.trim();
            privateKeyPem = privateKeyPem == null ? "" : privateKeyPem.trim();
            accessTtlMinutes = accessTtlMinutes <= 0 ? DEFAULT_ACCESS_TTL_MINUTES : accessTtlMinutes;
        }

        /** Compatibilidade com o Bloco 1 (só caminhos). */
        public Jwt(String issuer, String audience, String publicKeyPath, String privateKeyPath) {
            this(issuer, audience, publicKeyPath, privateKeyPath, null, null, 0);
        }

        public boolean hasPublicKey() {
            return !publicKeyPath.isEmpty() || !publicKeyPem.isEmpty();
        }

        public boolean hasPrivateKey() {
            return !privateKeyPath.isEmpty() || !privateKeyPem.isEmpty();
        }
    }

    public record Cors(List<String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of("http://localhost:3000")
                    : allowedOrigins.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
