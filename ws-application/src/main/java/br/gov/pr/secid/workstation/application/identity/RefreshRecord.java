package br.gov.pr.secid.workstation.application.identity;

import java.time.Instant;
import java.util.UUID;

/**
 * Um refresh token (TAXONOMIA §1.3): só o HASH do valor opaco. {@code familyId} = {@code sid} do access token;
 * {@code rotatedFromHash} aponta para o anterior da família. Imutável: rotação/revogação criam uma cópia.
 */
public record RefreshRecord(String tokenHash, UUID familyId, UUID userId, Instant createdAt, Instant expiresAt,
                            Instant revokedAt, String rotatedFromHash, boolean persistent, String deviceName) {

    public boolean active(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public RefreshRecord revoked(Instant at) {
        return revokedAt != null ? this
                : new RefreshRecord(tokenHash, familyId, userId, createdAt, expiresAt, at, rotatedFromHash, persistent, deviceName);
    }
}
