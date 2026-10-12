package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.User;

import java.time.Instant;
import java.util.UUID;

/** Projeção pública da própria conta (sem hash, sem e-mail de terceiros). */
public record UserView(UUID id, String username, String fullName, String displayName, String email, boolean emailVerified,
                       String phone, String profileType, String role, String status, String jobTitle, String avatarUrl,
                       String coverUrl, String bio, boolean verified, boolean twoFactorEnabled, String hypeVisibility,
                       boolean rankingOptOut, Instant lastLoginAt, String termsVersion, String privacyVersion,
                       Instant deletionScheduledAt, Instant createdAt) {

    public static UserView of(User u) {
        return new UserView(u.getId(), u.getUsername(), u.getFullName(), u.getDisplayName(), u.getEmail(), u.isEmailVerified(),
                u.getPhone(), name(u.getProfileType()), name(u.getRole()), name(u.getStatus()), u.getJobTitle(), u.getAvatarUrl(),
                u.getCoverUrl(), u.getBio(), u.isVerified(), u.isTwoFactorEnabled(), name(u.getHypeVisibility()),
                u.isRankingOptOut(), u.getLastLoginAt(), u.getTermsVersion(), u.getPrivacyVersion(), u.getDeletionScheduledAt(),
                u.getCreatedAt());
    }

    private static String name(Enum<?> e) {
        return e == null ? null : e.name();
    }
}
