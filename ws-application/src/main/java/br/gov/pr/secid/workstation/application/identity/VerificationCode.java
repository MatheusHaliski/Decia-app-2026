package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;

import java.time.Instant;
import java.util.UUID;

/**
 * Código/token de verificação (tabela {@code verification_codes}, V3): só o hash. {@code attempts} é gravado mesmo quando
 * a conferência falha (RF1.CA11); no {@value #MAX_ATTEMPTS}º erro o código expira na hora.
 */
public record VerificationCode(UUID id, UUID userId, VerificationPurpose purpose, String codeHash, int attempts, Instant createdAt,
                               Instant expiresAt, Instant consumedAt) {
    public static final int MAX_ATTEMPTS = 5;

    public static VerificationCode issue(UUID userId, VerificationPurpose purpose, String codeHash, Instant now, java.time.Duration ttl) {
        return new VerificationCode(UUID.randomUUID(), userId, purpose, codeHash, 0, now, now.plus(ttl), null);
    }

    public boolean usable(Instant now) {
        return consumedAt == null && expiresAt.isAfter(now) && attempts < MAX_ATTEMPTS;
    }

    /** Uma tentativa errada a mais; na {@value #MAX_ATTEMPTS}ª o código morre. */
    public VerificationCode failedAttempt(Instant now) {
        int next = attempts + 1;
        return new VerificationCode(id, userId, purpose, codeHash, next, createdAt, next >= MAX_ATTEMPTS ? now : expiresAt, consumedAt);
    }

    public VerificationCode consumed(Instant now) {
        return new VerificationCode(id, userId, purpose, codeHash, attempts, createdAt, expiresAt, now);
    }
}
