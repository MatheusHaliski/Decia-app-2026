package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Access token RS256 curto (RF2.CA01/CA13; TTL 15 min — Q-49/D-25): {@code iss}, {@code aud}, {@code sub}=userId,
 * {@code sid}=família do refresh, {@code role}, {@code profile_type}, {@code username}, {@code jti}. Sem chave privada
 * configurada responde {@code 503 AUTENTICACAO_INDISPONIVEL} em vez de emitir token sem assinatura.
 */
public class JwtTokenIssuer implements TokenIssuerPort {
    private final JwtEncoder encoder;
    private final String issuer;
    private final String audience;
    private final Duration ttl;
    private final Clock clock;

    public JwtTokenIssuer(JwtEncoder encoder, String issuer, String audience, Duration ttl, Clock clock) {
        this.encoder = encoder;
        this.issuer = issuer;
        this.audience = audience;
        this.ttl = ttl;
        this.clock = clock;
    }

    public boolean enabled() {
        return encoder != null;
    }

    @Override
    public String issueAccessToken(User user, UUID sessionId) {
        if (encoder == null) {
            throw ApiException.unavailable(AuthCodes.AUTENTICACAO_INDISPONIVEL,
                    "Emissão de tokens indisponível nesta instância (chave privada do JWT não configurada).");
        }
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(List.of(audience))
                .subject(user.getId().toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("sid", sessionId.toString())
                .claim("role", user.getRole().name())
                .claim("profile_type", user.getProfileType() == null ? null : user.getProfileType().name())
                .claim("username", user.getUsername())
                .build();
        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(JwtConfig.KEY_ID).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    @Override
    public Duration accessTokenTtl() {
        return ttl;
    }
}
