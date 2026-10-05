package br.gov.pr.secid.workstation.web.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Propriedades de segurança da API ({@code ws.security.*}). Os caminhos das chaves apontam para arquivos fora do
 * repositório ({@code ./keys/}, gerados por {@code scripts/keys/generate_jwt_keys.sh}); o conteúdo nunca entra em
 * variável de log nem em erro. A obrigatoriedade em produção é conferida pelo RequiredSecretsGuard (ws-bootstrap).
 *
 * @param jwt       emissor, audiência e caminhos das chaves RS256 (pública para validar; privada só para emitir)
 * @param cors      origens permitidas ao BFF (lista separada por vírgula no application.yml)
 * @param edgeProxy segredo compartilhado com o BFF para o IP assinado ({@code EDGE_PROXY_SECRET}) e o header da borda
 */
@ConfigurationProperties(prefix = "ws.security")
public record WsSecurityProperties(Jwt jwt, Cors cors, EdgeProxy edgeProxy) {

    public WsSecurityProperties {
        jwt = jwt == null ? new Jwt(null, null, null, null) : jwt;
        cors = cors == null ? new Cors(null) : cors;
        edgeProxy = edgeProxy == null ? new EdgeProxy(null, null) : edgeProxy;
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

        public boolean hasPrivateKey() {
            return !privateKeyPath.isEmpty();
        }
    }

    public record Cors(List<String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of("http://localhost:3000")
                    : allowedOrigins.stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        }
    }

    /**
     * IP do cliente (SEG RN49.04): o BFF assina {@code ip|ts} com HMAC-SHA256 usando {@code secret} (mesmo valor nos
     * dois lados, nunca {@code NEXT_PUBLIC_}); sem assinatura válida vale {@code clientIpHeader} ({@code X-Real-IP},
     * posto pela borda) e, por último, o endereço TCP. {@code X-Forwarded-For} nunca é lido.
     */
    public record EdgeProxy(String secret, String clientIpHeader) {
        public EdgeProxy {
            secret = secret == null ? "" : secret.trim();
            clientIpHeader = blankToDefault(clientIpHeader, "X-Real-IP");
        }
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
