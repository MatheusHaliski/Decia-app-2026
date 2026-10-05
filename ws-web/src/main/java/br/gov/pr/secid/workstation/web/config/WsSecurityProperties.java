package br.gov.pr.secid.workstation.web.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Propriedades de segurança da API ({@code ws.security.*}). Os caminhos das chaves apontam para arquivos fora do
 * repositório ({@code ./keys/}, gerados por {@code scripts/keys/generate_jwt_keys.sh}); o conteúdo nunca entra em
 * variável de log nem em erro. A obrigatoriedade em produção é conferida pelo RequiredSecretsGuard (ws-bootstrap).
 *
 * @param jwt  emissor, audiência e caminhos das chaves RS256 (pública para validar; privada só para emitir, Bloco 3)
 * @param cors origens permitidas ao BFF (lista separada por vírgula no application.yml)
 */
@ConfigurationProperties(prefix = "ws.security")
public record WsSecurityProperties(Jwt jwt, Cors cors) {

    public WsSecurityProperties {
        jwt = jwt == null ? new Jwt(null, null, null, null) : jwt;
        cors = cors == null ? new Cors(null) : cors;
    }

    public record Jwt(String issuer, String audience, String publicKeyPath, String privateKeyPath) {
        public Jwt {
            issuer = blankToDefault(issuer, "work-station");
            audience = blankToDefault(audience, "work-station-api");
            publicKeyPath = publicKeyPath == null ? "" : publicKeyPath.trim();
            privateKeyPath = privateKeyPath == null ? "" : privateKeyPath.trim();
        }

        public boolean hasPublicKey() {
            return !publicKeyPath.isEmpty();
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
