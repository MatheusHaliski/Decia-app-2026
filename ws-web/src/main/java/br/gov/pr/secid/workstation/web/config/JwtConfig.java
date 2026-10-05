package br.gov.pr.secid.workstation.web.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

/**
 * Validação do JWT próprio (RS256): a chave pública vem de um arquivo PEM em {@code ws.security.jwt.public-key-path}
 * ({@code WS_JWT_PUBLIC_KEY_PATH}). Sem chave (dev/test sem login ainda), o decodificador recusa qualquer token —
 * a API continua subindo só com as rotas públicas. Em produção a chave é obrigatória (RequiredSecretsGuard).
 */
@Configuration
@EnableConfigurationProperties(WsSecurityProperties.class)
public class JwtConfig {
    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);

    @Bean
    JwtDecoder jwtDecoder(WsSecurityProperties props) {
        WsSecurityProperties.Jwt jwt = props.jwt();
        if (!jwt.hasPublicKey()) {
            log.warn("ws.security.jwt.public-key-path vazio: nenhum token será aceito (só rotas públicas)");
            return token -> {
                throw new JwtException("JWT não configurado nesta instância");
            };
        }
        RSAPublicKey key = readPublicKey(Path.of(jwt.publicKeyPath()));
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(key).build();
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>("aud",
                aud -> aud != null && aud.contains(jwt.audience()));
        decoder.setJwtValidator(JwtValidators.createDefaultWithValidators(
                List.of(JwtValidators.createDefaultWithIssuer(jwt.issuer()), audience)));
        log.info("JWT RS256 configurado (issuer={}, audience={}, chave pública em arquivo)", jwt.issuer(), jwt.audience());
        return decoder;
    }

    /** Lê uma chave pública X.509 em PEM ("BEGIN PUBLIC KEY"), o formato gerado por scripts/keys/generate_jwt_keys.sh. */
    static RSAPublicKey readPublicKey(Path pem) {
        try {
            String content = Files.readString(pem, StandardCharsets.US_ASCII)
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(content);
            return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(der));
        } catch (IOException | IllegalArgumentException | NoSuchAlgorithmException | InvalidKeySpecException | ClassCastException e) {
            // só o caminho no erro, nunca o conteúdo do arquivo
            throw new IllegalStateException("Chave pública do JWT inválida ou ilegível em " + pem, e);
        }
    }
}
