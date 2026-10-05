package br.gov.pr.secid.workstation.application.identity;

import java.time.Instant;
import java.util.UUID;

/** Espelho em {@code refresh_tokens} (MySQL) do que o {@link SessionStorePort} guarda — histórico e auditoria. */
public interface RefreshTokenMirrorPort {
    void saved(RefreshRecord record, RequestContext ctx);

    void revoked(String tokenHash, Instant at);

    void familyRevoked(UUID familyId, Instant at);

    void userRevoked(UUID userId, UUID keepFamily, Instant at);
}
