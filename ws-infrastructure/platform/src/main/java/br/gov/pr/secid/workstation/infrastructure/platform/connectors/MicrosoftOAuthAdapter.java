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
 * OAuth 2.0 da Microsoft identity platform (endpoint v2.0, authorization code + PKCE S256) com escopos delegados mínimos
 * {@code openid email offline_access User.Read Files.Read} — nenhum exige consentimento de administrador. A Microsoft gira o refresh
 * token a cada renovação (guarda-se o novo). Perfil por {@code GET /me} do Graph ({@code id}, {@code mail} ou {@code userPrincipalName}).
 * Não há revogação de refresh token por API para um app só: {@link #revoke} devolve {@code false} (a conta é apagada daqui e a pessoa
 * remove o consentimento em myapps.microsoft.com / account.live.com/consent/Manage).
 */
public class MicrosoftOAuthAdapter implements OAuthClientPort {
    private final ConnectorsProperties.Microsoft cfg;
    private final ConnectorHttp http;

    MicrosoftOAuthAdapter(ConnectorsProperties.Microsoft cfg, ConnectorHttp http) {
        this.cfg = cfg;
        this.http = http;
    }

    @Override
    public ConnectorProvider provider() {
        return ConnectorProvider.MICROSOFT;
    }

    @Override
    public String authorizationUrl(String state, String codeChallenge) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("client_id", cfg.clientId());
        q.put("response_type", "code");
        q.put("redirect_uri", cfg.redirectUri());
        q.put("response_mode", "query");
        q.put("scope", scopes());
        q.put("state", state);
        q.put("code_challenge", codeChallenge);
        q.put("code_challenge_method", "S256");
        q.put("prompt", "select_account");
        return cfg.authorizeEndpoint() + "?" + ConnectorHttp.form(q);
    }

    @Override
    public TokenGrant exchange(String code, String codeVerifier) {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("client_id", cfg.clientId());
        f.put("scope", scopes());
        f.put("code", code);
        f.put("redirect_uri", cfg.redirectUri());
        f.put("grant_type", "authorization_code");
        f.put("code_verifier", codeVerifier);
        f.put("client_secret", cfg.clientSecret());
        return GoogleOAuthAdapter.grant(http.tokenRequest(cfg.tokenEndpoint(), f));
    }

    @Override
    public TokenGrant refresh(String refreshToken) {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("client_id", cfg.clientId());
        f.put("scope", scopes());
        f.put("refresh_token", refreshToken);
        f.put("grant_type", "refresh_token");
        f.put("client_secret", cfg.clientSecret());
        return GoogleOAuthAdapter.grant(http.tokenRequest(cfg.tokenEndpoint(), f));
    }

    @Override
    public ExternalProfile profile(String accessToken) {
        JsonNode me = http.getJson(cfg.graphUrl() + "/me?$select=id,mail,userPrincipalName", accessToken);
        String id = ConnectorHttp.text(me, "id");
        if (id == null || id.isBlank()) {
            throw new ProviderException(Kind.UNAVAILABLE, 200, "/me sem id");
        }
        String mail = ConnectorHttp.text(me, "mail");
        return new ExternalProfile(id, mail != null ? mail : ConnectorHttp.text(me, "userPrincipalName"));
    }

    @Override
    public boolean revoke(String token) {
        return false;
    }

    private static String scopes() {
        return String.join(" ", ConnectorScopes.MICROSOFT);
    }
}
