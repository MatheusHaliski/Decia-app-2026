package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Espelho de {@code refresh_tokens} (V2): só o hash do token; {@code rotated_from_id} aponta para o anterior. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshTokenEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "BINARY(16)", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, length = 128)
    private String tokenHash;

    @Column(name = "family_id", columnDefinition = "BINARY(16)", nullable = false)
    private UUID familyId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "rotated_from_id", columnDefinition = "BINARY(16)")
    private UUID rotatedFromId;

    @Column(name = "created_ip", length = 45)
    private String createdIp;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "device_name", length = 120)
    private String deviceName;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @Column(name = "persistent", nullable = false)
    private boolean persistent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RefreshTokenEntity() {
    }

    RefreshTokenEntity(UUID userId, String tokenHash, UUID familyId, Instant createdAt, Instant expiresAt, UUID rotatedFromId,
                       String createdIp, String userAgent, String deviceName, boolean persistent) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.rotatedFromId = rotatedFromId;
        this.createdIp = createdIp;
        this.userAgent = userAgent == null ? null : userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent;
        this.deviceName = deviceName == null ? null : deviceName.length() > 120 ? deviceName.substring(0, 120) : deviceName;
        this.persistent = persistent;
        this.lastUsedAt = createdAt;
    }

    UUID getId() {
        return id;
    }

    UUID getFamilyId() {
        return familyId;
    }

    Instant getRevokedAt() {
        return revokedAt;
    }

    void revoke(Instant at) {
        if (revokedAt == null) {
            revokedAt = at;
        }
    }
}
