package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthenticatedUser;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Access token JWT RS256 próprio (ARQUITETURA §3.3): {@code iss}, {@code aud}, {@code sub} = id da conta, {@code sid}
 * = família da sessão, {@code role}, {@code profile_type}, {@code username}, {@code jti}; TTL em
 * {@code ws.security.jwt.access-ttl} (padrão 15 min — Q-49). A chave privada vem do PEM PKCS#8 em
 * {@code WS_JWT_PRIVATE_KEY_PATH} (gerado por {@code scripts/keys/generate_jwt_keys.sh}, fora do git); sem ela a
 * instância sobe (só valida tokens) e o login responde {@code 503 AUTENTICACAO_INDISPONIVEL}.
 */
@Component
public class JwtTokenIssuer implements TokenIssuerPort {
    public static final String AUTENTICACAO_INDISPONIVEL = "AUTENTICACAO_INDISPONIVEL";
    public static final Duration DEFAULT_TTL = Duration.ofMinutes(15);
    private static final Logger log = LoggerFactory.getLogger(JwtTokenIssuer.class);

    private final String issuer;
    private final String audience;
    private final Duration ttl;
    private final RSAPrivateKey privateKey;
    private final Clock clock;

    @Autowired
    public JwtTokenIssuer(WsSecurityProperties props, @Value("${ws.security.jwt.access-ttl:15m}") Duration ttl) {
        this(props, ttl, Clock.systemUTC());
    }

    public JwtTokenIssuer(WsSecurityProperties props, Duration ttl, Clock clock) {
        WsSecurityProperties.Jwt jwt = props.jwt();
        this.issuer = jwt.issuer();
        this.audience = jwt.audience();
        this.ttl = ttl == null || ttl.isZero() || ttl.isNegative() ? DEFAULT_TTL : ttl;
        this.clock = clock;
        if (jwt.hasPrivateKey()) {
            this.privateKey = readPrivateKey(Path.of(jwt.privateKeyPath()));
            log.info("Emissor JWT RS256 configurado (issuer={}, audience={}, ttl={})", issuer, audience, this.ttl);
        } else {
            this.privateKey = null;
            log.warn("ws.security.jwt.private-key-path vazio: esta instância não emite tokens (login responde 503)");
        }
    }

    public boolean canIssue() {
        return privateKey != null;
    }

    @Override
    public String issueAccessToken(AuthenticatedUser user, UUID familyId) {
        if (privateKey == null) {
            throw ApiException.unavailable(AUTENTICACAO_INDISPONIVEL, "Autenticação indisponível nesta instância.");
        }
        Instant now = clock.instant();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .audience(audience)
                .subject(user.id().toString())
                .jwtID(UUID.randomUUID().toString())
                .issueTime(Date.from(now))
                .notBeforeTime(Date.from(now))
                .expirationTime(Date.from(now.plus(ttl)))
                .claim("sid", familyId.toString())
                .claim("role", user.role().name())
                .claim("profile_type", user.profileType() == null ? null : user.profileType().name())
                .claim("username", user.username())
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).type(com.nimbusds.jose.JOSEObjectType.JWT).build(), claims);
        try {
            jwt.sign(new RSASSASigner(privateKey));
        } catch (JOSEException e) {
            throw new IllegalStateException("Falha ao assinar o JWT", e);
        }
        return jwt.serialize();
    }

    @Override
    public Duration accessTokenTtl() {
        return ttl;
    }

    /** Lê uma chave privada PKCS#8 em PEM ("BEGIN PRIVATE KEY"); o erro cita só o caminho, nunca o conteúdo. */
    static RSAPrivateKey readPrivateKey(Path pem) {
        try {
            String content = Files.readString(pem, StandardCharsets.US_ASCII)
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(content);
            return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (IOException | IllegalArgumentException | NoSuchAlgorithmException | InvalidKeySpecException | ClassCastException e) {
            throw new IllegalStateException("Chave privada do JWT inválida ou ilegível em " + pem, e);
        }
    }
}
