package br.gov.pr.secid.workstation.infrastructure.mysql.identity;

import br.gov.pr.secid.workstation.domain.identity.AccountOrigin;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.HypeVisibility;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Linha de {@code users} (V2). {@code email_enc}/{@code phone_enc} cifrados pelo {@link AesGcmStringConverter}. */
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "username", nullable = false, length = 80)
    private String username;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(name = "display_name", length = 80)
    private String displayName;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "email_enc", nullable = false, length = 512)
    private String email;

    @Column(name = "email_hash", nullable = false, length = 128)
    private String emailHash;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "phone_enc", length = 512)
    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "oidc_subject")
    private String oidcSubject;

    @Column(name = "oidc_issuer")
    private String oidcIssuer;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_type", nullable = false, length = 30)
    private ProfileType profileType;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private AccountStatus status;

    @Column(name = "job_title", length = 120)
    private String jobTitle;

    @Column(name = "company_id", columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "bio", length = 1000)
    private String bio;

    /** RF3 (V47): especialidades já normalizadas pela aplicação. */
    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "specialties_json", columnDefinition = "JSON")
    private List<String> specialties;

    /** RF3 (V47): quem vê o perfil público. */
    @Enumerated(EnumType.STRING)
    @Column(name = "profile_visibility", nullable = false, length = 20)
    private ProfileVisibility profileVisibility;

    @Column(name = "verified", nullable = false)
    private boolean verified;

    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "two_factor_secret_enc", length = 512)
    private String twoFactorSecret;

    @Column(name = "two_factor_recovery_hashes", length = 1024)
    private String twoFactorRecoveryHashes;

    @Column(name = "two_factor_last_step")
    private Long twoFactorLastStep;

    @Column(name = "two_factor_enabled_at")
    private Instant twoFactorEnabledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "hype_visibility", nullable = false, length = 20)
    private HypeVisibility hypeVisibility;

    @Column(name = "ranking_opt_out", nullable = false)
    private boolean rankingOptOut;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "terms_version", length = 20)
    private String termsVersion;

    @Column(name = "privacy_version", length = 20)
    private String privacyVersion;

    @Column(name = "deletion_requested_at")
    private Instant deletionRequestedAt;

    @Column(name = "deletion_scheduled_at")
    private Instant deletionScheduledAt;

    @Column(name = "deletion_reason", length = 500)
    private String deletionReason;

    @Column(name = "anonymized_at")
    private Instant anonymizedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_origin", nullable = false, length = 20)
    private AccountOrigin accountOrigin;

    @Column(name = "fixture_key", length = 80)
    private String fixtureKey;

    /** Coluna GERADA no banco (D-23): a aplicação só lê. */
    @Column(name = "test_account", insertable = false, updatable = false)
    private Boolean testAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserEntity() {
    }

    static UserEntity fromDomain(User u) {
        UserEntity e = new UserEntity();
        e.id = u.getId() == null ? UUID.randomUUID() : u.getId();
        e.createdAt = u.getCreatedAt() == null ? Instant.now() : u.getCreatedAt();
        e.apply(u);
        return e;
    }

    /** Copia os campos mutáveis do domínio para a linha (id/created_at ficam). */
    void apply(User u) {
        Instant now = Instant.now();
        username = u.getUsername();
        fullName = u.getFullName();
        displayName = u.getDisplayName();
        email = u.getEmail();
        emailHash = u.getEmailHash();
        emailVerified = u.isEmailVerified();
        phone = u.getPhone();
        passwordHash = u.getPasswordHash();
        oidcSubject = u.getOidcSubject();
        oidcIssuer = u.getOidcIssuer();
        profileType = u.getProfileType();
        role = u.getRole() == null ? Role.USER : u.getRole();
        status = u.getStatus() == null ? AccountStatus.PENDING_EMAIL_VERIFICATION : u.getStatus();
        jobTitle = u.getJobTitle();
        avatarUrl = u.getAvatarUrl();
        coverUrl = u.getCoverUrl();
        bio = u.getBio();
        specialties = u.getSpecialties() == null ? List.of() : List.copyOf(u.getSpecialties());
        profileVisibility = u.getProfileVisibility() == null ? ProfileVisibility.AUTENTICADOS : u.getProfileVisibility();
        verified = u.isVerified();
        twoFactorEnabled = u.isTwoFactorEnabled();
        twoFactorSecret = u.getTwoFactorSecret();
        twoFactorRecoveryHashes = u.getTwoFactorRecoveryHashes();
        twoFactorLastStep = u.getTwoFactorLastStep();
        twoFactorEnabledAt = u.getTwoFactorEnabledAt();
        hypeVisibility = u.getHypeVisibility() == null ? HypeVisibility.SO_EU : u.getHypeVisibility();
        rankingOptOut = u.isRankingOptOut();
        lastLoginAt = u.getLastLoginAt();
        termsVersion = u.getTermsVersion();
        privacyVersion = u.getPrivacyVersion();
        deletionRequestedAt = u.getDeletionRequestedAt();
        deletionScheduledAt = u.getDeletionScheduledAt();
        deletionReason = u.getDeletionReason();
        anonymizedAt = u.getAnonymizedAt();
        accountOrigin = u.getAccountOrigin() == null ? AccountOrigin.REAL : u.getAccountOrigin();
        fixtureKey = u.getFixtureKey();
        updatedAt = now;
    }

    User toDomain() {
        User u = new User();
        u.setId(id);
        u.setVersion(version);
        u.setUsername(username);
        u.setFullName(fullName);
        u.setDisplayName(displayName);
        u.setEmail(email);
        u.setEmailHash(emailHash);
        u.setEmailVerified(emailVerified);
        u.setPhone(phone);
        u.setPasswordHash(passwordHash);
        u.setOidcSubject(oidcSubject);
        u.setOidcIssuer(oidcIssuer);
        u.setProfileType(profileType);
        u.setRole(role);
        u.setStatus(status);
        u.setJobTitle(jobTitle);
        u.setCompanyId(companyId);          // lotação só leitura: apply() não grava (RF28 é quem lota — D-66)
        u.setDepartmentId(departmentId);
        u.setAvatarUrl(avatarUrl);
        u.setCoverUrl(coverUrl);
        u.setBio(bio);
        u.setSpecialties(specialties);
        u.setProfileVisibility(profileVisibility);
        u.setVerified(verified);
        u.setTwoFactorEnabled(twoFactorEnabled);
        u.setTwoFactorSecret(twoFactorSecret);
        u.setTwoFactorRecoveryHashes(twoFactorRecoveryHashes);
        u.setTwoFactorLastStep(twoFactorLastStep);
        u.setTwoFactorEnabledAt(twoFactorEnabledAt);
        u.setHypeVisibility(hypeVisibility);
        u.setRankingOptOut(rankingOptOut);
        u.setLastLoginAt(lastLoginAt);
        u.setTermsVersion(termsVersion);
        u.setPrivacyVersion(privacyVersion);
        u.setDeletionRequestedAt(deletionRequestedAt);
        u.setDeletionScheduledAt(deletionScheduledAt);
        u.setDeletionReason(deletionReason);
        u.setAnonymizedAt(anonymizedAt);
        u.setAccountOrigin(accountOrigin);
        u.setFixtureKey(fixtureKey);
        u.setCreatedAt(createdAt);
        u.setUpdatedAt(updatedAt);
        return u;
    }

    UUID getId() {
        return id;
    }
}
