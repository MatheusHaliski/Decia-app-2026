package br.gov.pr.secid.workstation.application.identity;

import java.time.Duration;
import java.util.UUID;

/**
 * Emissão do access token próprio (porta): JWT RS256 curto no adaptador do ws-web. {@code familyId} é o {@code sid}
 * da sessão (a família do refresh token, RF2) — o {@code SessionActiveFilter} confere esse claim a cada requisição.
 */
public interface TokenIssuerPort {

    /** Token assinado para a conta; lança {@code 503 AUTENTICACAO_INDISPONIVEL} se esta instância não tem chave privada. */
    String issueAccessToken(AuthenticatedUser user, UUID familyId);

    Duration accessTokenTtl();
}
