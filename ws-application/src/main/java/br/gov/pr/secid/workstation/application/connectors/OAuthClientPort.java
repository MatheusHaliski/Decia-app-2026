package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;

import java.util.Set;

/**
 * Lado OAuth 2.0 de um provedor (authorization code + PKCE S256). Adaptadores HTTP em {@code ws-infrastructure/platform}
 * ({@code GoogleOAuthAdapter}, {@code MicrosoftOAuthAdapter}); falhas saem como {@link ProviderException}. Nenhum método registra token.
 */
public interface OAuthClientPort {

    ConnectorProvider provider();

    /** URL de autorização com client id, redirect URI fixo, escopos mínimos, {@code state} e {@code code_challenge} (S256). */
    String authorizationUrl(String state, String codeChallenge);

    /** Troca o código pelo par de tokens; {@code invalid_grant} → {@link ProviderException.Kind#INVALID_GRANT}. */
    TokenGrant exchange(String code, String codeVerifier);

    /** Renova o access token; recusa → {@link ProviderException.Kind#INVALID_GRANT} (reconectar). */
    TokenGrant refresh(String refreshToken);

    /** Conta externa dona do token: id estável e e-mail (userinfo do Google; {@code /me} do Graph). */
    ExternalProfile profile(String accessToken);

    /** Revoga a concessão no provedor; {@code false} quando o provedor não tem revogação por API (Microsoft). */
    boolean revoke(String token);

    /** Tokens recebidos; {@code refreshToken} pode faltar (o Google só reenvia com consentimento). */
    record TokenGrant(String accessToken, String refreshToken, long expiresInSeconds, Set<String> scopes) {
        public TokenGrant {
            scopes = scopes == null ? Set.of() : Set.copyOf(scopes);
        }

        @Override
        public String toString() {
            return "TokenGrant{accessToken=***, refreshToken=" + (refreshToken == null ? "null" : "***") + ", expiresInSeconds="
                    + expiresInSeconds + ", scopes=" + scopes + "}";
        }
    }

    /** Conta no provedor: {@code subject} estável (sub / id do Graph) e e-mail (pode faltar em conta pessoal sem e-mail público). */
    record ExternalProfile(String subject, String email) {
        @Override
        public String toString() {
            return "ExternalProfile{subject=" + subject + ", email=***}";
        }
    }
}
