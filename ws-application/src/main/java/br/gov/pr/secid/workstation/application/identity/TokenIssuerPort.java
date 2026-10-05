package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.User;

import java.time.Duration;
import java.util.UUID;

/** Emissão do access token (JWT RS256, {@code JwtTokenIssuer} em ws-web). */
public interface TokenIssuerPort {
    String issueAccessToken(User user, UUID sessionId);

    Duration accessTokenTtl();
}
