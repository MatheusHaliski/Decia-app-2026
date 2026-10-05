package br.gov.pr.secid.workstation.application.identity;

/**
 * Validação do {@code id_token} do IdP institucional: assinatura (JWKS do {@code iss}), {@code iss}, {@code aud}
 * (= client_id), {@code exp}. Implementado em ws-web com o Nimbus/Spring Security; nos testes, um fake.
 * O {@code nonce} é conferido pelo {@link OidcService}.
 */
public interface IdTokenVerifier {
    OidcAccountLinker.OidcClaims verify(String idToken, String expectedNonce);
}
