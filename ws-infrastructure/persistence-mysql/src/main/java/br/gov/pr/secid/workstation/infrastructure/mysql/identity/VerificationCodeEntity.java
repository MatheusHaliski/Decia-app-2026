package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.application.identity.VerificationCode;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Linha de {@code verification_codes} (V3). */
@Entity
@Table(name = "verification_codes")
public class VerificationCodeEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "BINARY(16)", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private VerificationPurpose purpose;

    @Column(name = "code_hash", nullable = false, length = 128)
    private String codeHash;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected VerificationCodeEntity() {
    }

    static VerificationCodeEntity fromDomain(VerificationCode c) {
        VerificationCodeEntity e = new VerificationCodeEntity();
        e.id = c.id();
        e.userId = c.userId();
        e.purpose = c.purpose();
        e.codeHash = c.codeHash();
        e.createdAt = c.createdAt();
        e.apply(c);
        return e;
    }

    void apply(VerificationCode c) {
        attempts = c.attempts();
        expiresAt = c.expiresAt();
        consumedAt = c.consumedAt();
    }

    VerificationCode toDomain() {
        return new VerificationCode(id, userId, purpose, codeHash, attempts, createdAt, expiresAt, consumedAt);
    }
}
