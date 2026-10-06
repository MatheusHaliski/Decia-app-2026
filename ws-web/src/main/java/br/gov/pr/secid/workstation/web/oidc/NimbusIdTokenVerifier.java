package br.gov.pr.secid.workstation.web.oidc;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.IdTokenVerifier;
import br.gov.pr.secid.workstation.application.identity.OidcAccountLinker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.List;
import java.util.function.Supplier;

/**
 * {@link IdTokenVerifier} com o Nimbus/Spring Security: JWKS descoberto no {@code issuer-uri} (preguiçoso, na 1ª chamada),
 * validadores de {@code iss}, {@code exp} e {@code aud} = client_id; depois confere o {@code nonce} em tempo constante.
 * Erros do IdP nunca vazam o token: só {@code 401 OIDC_TOKEN_INVALIDO}.
 */
public class NimbusIdTokenVerifier implements IdTokenVerifier {
    private static final Logger log = LoggerFactory.getLogger(NimbusIdTokenVerifier.class);
    private final Supplier<JwtDecoder> decoder;

    public NimbusIdTokenVerifier(String issuerUri, String clientId) {
        this(() -> {
            NimbusJwtDecoder d = JwtDecoders.fromOidcIssuerLocation(issuerUri);
            OAuth2TokenValidator<Jwt> aud = new JwtClaimValidator<List<String>>("aud", a -> a != null && a.contains(clientId));
            d.setJwtValidator(JwtValidators.createDefaultWithValidators(List.of(JwtValidators.createDefaultWithIssuer(issuerUri), aud)));
            return d;
        });
    }

    NimbusIdTokenVerifier(Supplier<JwtDecoder> decoder) {
        this.decoder = memoize(decoder);
    }

    private static Supplier<JwtDecoder> memoize(Supplier<JwtDecoder> s) {
        return new Supplier<>() {
            private volatile JwtDecoder value;

            @Override
            public JwtDecoder get() {
                JwtDecoder v = value;
                if (v == null) {
                    synchronized (this) {
                        if (value == null) {
                            value = s.get();
                        }
                        v = value;
                    }
                }
                return v;
            }
        };
    }

    @Override
    public OidcAccountLinker.OidcClaims verify(String idToken, String expectedNonce) {
        Jwt jwt;
        try {
            jwt = decoder.get().decode(idToken);
        } catch (JwtException | IllegalStateException | IllegalArgumentException e) {
            log.warn("id_token institucional recusado: {}", e.getClass().getSimpleName());
            throw new ApiException(AuthCodes.OIDC_TOKEN_INVALIDO, 401, "Token institucional inválido ou expirado.");
        }
        String nonce = jwt.getClaimAsString("nonce");
        if (nonce == null || !java.security.MessageDigest.isEqual(nonce.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                expectedNonce.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            // Bloco 4 (D-63): nonce divergente é pedido inválido (replay/troca de id_token), não credencial errada → 400
            throw new ApiException(AuthCodes.OIDC_NONCE_INVALIDO, 400, "Token institucional não corresponde a este login (nonce).");
        }
        Boolean verified = jwt.getClaimAsBoolean("email_verified");
        return new OidcAccountLinker.OidcClaims(jwt.getClaimAsString("iss"), jwt.getSubject(), jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(verified), jwt.getClaimAsString("name"));
    }
}
