package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorScopes;
import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort;
import br.gov.pr.secid.workstation.application.connectors.ProviderException;
import br.gov.pr.secid.workstation.application.connectors.ProviderException.Kind;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import tools.jackson.databind.JsonNode;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * OAuth 2.0 do Google para aplicativo web (authorization code + PKCE S256): {@code access_type=offline&prompt=consent} para receber o
 * refresh token, escopos mínimos {@code openid email drive.readonly}; perfil pelo userinfo do OpenID Connect ({@code sub}, {@code email});
 * revogação em {@code oauth2.googleapis.com/revoke} (revogar o refresh token derruba a concessão inteira). URLs de
 * {@link ConnectorsProperties.Google} (padrão: as oficiais).
 */
public class GoogleOAuthAdapter implements OAuthClientPort {
    private final ConnectorsProperties.Google cfg;
    private final ConnectorHttp http;

    GoogleOAuthAdapter(ConnectorsProperties.Google cfg, ConnectorHttp http) {
        this.cfg = cfg;
        this.http = http;
    }

    @Override
    public ConnectorProvider provider() {
        return ConnectorProvider.GOOGLE;
    }

    @Override
    public String authorizationUrl(String state, String codeChallenge) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("response_type", "code");
        q.put("client_id", cfg.clientId());
        q.put("redirect_uri", cfg.redirectUri());
        q.put("scope", String.join(" ", ConnectorScopes.GOOGLE));
        q.put("state", state);
        q.put("code_challenge", codeChallenge);
        q.put("code_challenge_method", "S256");
        q.put("access_type", "offline");
        q.put("prompt", "consent");
        return cfg.authorizationUrl() + "?" + ConnectorHttp.form(q);
    }

    @Override
    public TokenGrant exchange(String code, String codeVerifier) {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("grant_type", "authorization_code");
        f.put("code", code);
        f.put("redirect_uri", cfg.redirectUri());
        f.put("client_id", cfg.clientId());
        f.put("client_secret", cfg.clientSecret());
        f.put("code_verifier", codeVerifier);
        return grant(http.tokenRequest(cfg.tokenUrl(), f));
    }

    @Override
    public TokenGrant refresh(String refreshToken) {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("grant_type", "refresh_token");
        f.put("refresh_token", refreshToken);
        f.put("client_id", cfg.clientId());
        f.put("client_secret", cfg.clientSecret());
        return grant(http.tokenRequest(cfg.tokenUrl(), f));
    }

    @Override
    public ExternalProfile profile(String accessToken) {
        JsonNode me = http.getJson(cfg.userinfoUrl(), accessToken);
        String sub = ConnectorHttp.text(me, "sub");
        if (sub == null || sub.isBlank()) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "userinfo sem sub");
        }
        return new ExternalProfile(sub, ConnectorHttp.text(me, "email"));
    }

    /** {@code 200} revogado; {@code 400} = token já inválido (também conta como revogado). */
    @Override
    public boolean revoke(String token) {
        int status = http.postFormStatus(cfg.revocationUrl(), Map.of("token", token));
        if (status >= 500 || status == 429) {
            throw new ProviderException(Kind.UNAVAILABLE, status, "revogação indisponível");
        }
        return status == 200 || status == 400;
    }

    static TokenGrant grant(JsonNode json) {
        String access = ConnectorHttp.text(json, "access_token");
        if (access == null || access.isBlank()) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "resposta de token sem access_token");
        }
        Long expires = ConnectorHttp.number(json, "expires_in");
        return new TokenGrant(access, ConnectorHttp.text(json, "refresh_token"), expires == null ? 3600 : expires,
                ConnectorScopes.parse(ConnectorHttp.text(json, "scope")));
    }
}
