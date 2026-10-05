package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * Login institucional (RF2.CA03) atrás de {@code ws.oidc.enabled}: o BFF faz o Authorization Code + PKCE ({@code state},
 * {@code nonce}) e entrega o {@code id_token} à API, que o valida ({@link IdTokenVerifier}), confere o {@code nonce},
 * aplica a regra de vinculação ({@link OidcAccountLinker}) e abre a mesma sessão do login local.
 */
@Service
public class OidcService {
    private final OidcProperties props;
    private final ObjectProvider<IdTokenVerifier> verifier;
    private final OidcAccountLinker linker;
    private final IdentityService identity;

    public OidcService(OidcProperties props, ObjectProvider<IdTokenVerifier> verifier, OidcAccountLinker linker, IdentityService identity) {
        this.props = props;
        this.verifier = verifier;
        this.linker = linker;
        this.identity = identity;
    }

    public boolean enabled() {
        return props.enabled() && verifier.getIfAvailable() != null;
    }

    public Session login(String idToken, String expectedNonce, String deviceName, RequestContext ctx) {
        IdTokenVerifier v = verifier.getIfAvailable();
        if (!props.enabled() || v == null) {
            throw new ApiException(AuthCodes.OIDC_DESLIGADO, 404, "Login institucional não está habilitado nesta instância.");
        }
        if (idToken == null || idToken.isBlank() || expectedNonce == null || expectedNonce.isBlank()) {
            throw new ApiException(AuthCodes.OIDC_TOKEN_INVALIDO, 401, "Token institucional ausente.");
        }
        OidcAccountLinker.OidcClaims claims = v.verify(idToken, expectedNonce);
        User u = linker.link(claims, ctx);
        u.setLastLoginAt(java.time.Instant.now());
        return identity.openSession(u, false, deviceName, ctx);
    }
}
