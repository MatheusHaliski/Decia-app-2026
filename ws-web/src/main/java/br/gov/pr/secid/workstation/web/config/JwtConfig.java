package br.gov.pr.secid.workstation.web.config;

import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.web.security.JwtTokenIssuer;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * JWT próprio RS256 (RF2.CA13). Validação: chave pública ({@link JwtKeys}, caminho ou PEM — D-24); sem chave o
 * decodificador recusa qualquer token e a API só serve rotas públicas. Emissão: chave privada; sem ela o
 * {@link JwtTokenIssuer} responde {@code 503 AUTENTICACAO_INDISPONIVEL} no login (WARN no boot). Em produção as duas
 * são obrigatórias (RequiredSecretsGuard, caminho OU PEM).
 */
@Configuration
@EnableConfigurationProperties(WsSecurityProperties.class)
public class JwtConfig {
    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);
    public static final String KEY_ID = "ws-1";

    @Bean
    JwtDecoder jwtDecoder(WsSecurityProperties props) {
        WsSecurityProperties.Jwt jwt = props.jwt();
        Optional<RSAPublicKey> key = JwtKeys.publicKey(jwt);
        if (key.isEmpty()) {
            log.warn("ws.security.jwt.public-key-path/-pem vazios: nenhum token será aceito (só rotas públicas)");
            return token -> {
                throw new JwtException("JWT não configurado nesta instância");
            };
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(key.get()).build();
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>("aud",
                aud -> aud != null && aud.contains(jwt.audience()));
        decoder.setJwtValidator(JwtValidators.createDefaultWithValidators(
                List.of(JwtValidators.createDefaultWithIssuer(jwt.issuer()), audience)));
        log.info("JWT RS256 configurado (issuer={}, audience={}, chave pública por {})", jwt.issuer(), jwt.audience(),
                jwt.publicKeyPath().isEmpty() ? "PEM em variável" : "arquivo");
        return decoder;
    }

    @Bean
    TokenIssuerPort tokenIssuer(WsSecurityProperties props, Clock clock) {
        WsSecurityProperties.Jwt jwt = props.jwt();
        Optional<RSAPrivateKey> priv = JwtKeys.privateKey(jwt);
        Optional<RSAPublicKey> pub = JwtKeys.publicKey(jwt);
        JwtEncoder encoder = null;
        if (priv.isPresent() && pub.isPresent()) {
            RSAKey rsa = new RSAKey.Builder(pub.get()).privateKey(priv.get()).keyID(KEY_ID).build();
            encoder = new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(rsa)));
            log.info("Emissão de access token ligada (TTL {} min)", jwt.accessTtlMinutes());
        } else {
            log.warn("ws.security.jwt.private-key-path/-pem vazios: login responderá 503 AUTENTICACAO_INDISPONIVEL até configurar a chave");
        }
        return new JwtTokenIssuer(encoder, jwt.issuer(), jwt.audience(), Duration.ofMinutes(jwt.accessTtlMinutes()), clock);
    }
}
