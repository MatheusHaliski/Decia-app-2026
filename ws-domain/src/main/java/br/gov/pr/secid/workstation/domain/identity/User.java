package br.gov.pr.secid.workstation.domain.identity;

import java.time.Instant;
import java.util.UUID;

/**
 * Conta de pessoa (TAXONOMIA §1.1, tabela {@code users}). Objeto de domínio puro: a persistência ({@code UserEntity},
 * persistence-mysql) cifra {@code email}/{@code phone} com AES-GCM e grava {@code emailHash} para busca. Nunca carrega
 * a senha em claro — só o hash Argon2id.
 */
public class User {
    private UUID id;
    private long version;
    private String username;
    private String fullName;
    private String displayName;
    private String email;
    private String emailHash;
    private boolean emailVerified;
    private String phone;
    private String passwordHash;
    private String oidcSubject;
    private String oidcIssuer;
    private ProfileType profileType;
    private Role role = Role.USER;
    private AccountStatus status = AccountStatus.PENDING_EMAIL_VERIFICATION;
    private String jobTitle;
    /** Lotação (RF28): só leitura aqui — o adaptador lê de {@code users.company_id}/{@code department_id} e não grava (D-66). */
    private UUID companyId;
    private UUID departmentId;
    private String avatarUrl;
    private String coverUrl;
    private String bio;
    private boolean verified;
    private boolean twoFactorEnabled;
    private HypeVisibility hypeVisibility = HypeVisibility.SO_EU;
    private boolean rankingOptOut;
    private Instant lastLoginAt;
    private String termsVersion;
    private String privacyVersion;
    private Instant deletionRequestedAt;
    private Instant deletionScheduledAt;
    private String deletionReason;
    private Instant anonymizedAt;
    private AccountOrigin accountOrigin = AccountOrigin.REAL;
    private String fixtureKey;
    private Instant createdAt;
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getEmailHash() {
        return emailHash;
    }

    public void setEmailHash(String emailHash) {
        this.emailHash = emailHash;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getOidcSubject() {
        return oidcSubject;
    }

    public void setOidcSubject(String oidcSubject) {
        this.oidcSubject = oidcSubject;
    }

    public String getOidcIssuer() {
        return oidcIssuer;
    }

    public void setOidcIssuer(String oidcIssuer) {
        this.oidcIssuer = oidcIssuer;
    }

    public ProfileType getProfileType() {
        return profileType;
    }

    public void setProfileType(ProfileType profileType) {
        this.profileType = profileType;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public HypeVisibility getHypeVisibility() {
        return hypeVisibility;
    }

    public void setHypeVisibility(HypeVisibility hypeVisibility) {
        this.hypeVisibility = hypeVisibility;
    }

    public boolean isRankingOptOut() {
        return rankingOptOut;
    }

    public void setRankingOptOut(boolean rankingOptOut) {
        this.rankingOptOut = rankingOptOut;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public String getTermsVersion() {
        return termsVersion;
    }

    public void setTermsVersion(String termsVersion) {
        this.termsVersion = termsVersion;
    }

    public String getPrivacyVersion() {
        return privacyVersion;
    }

    public void setPrivacyVersion(String privacyVersion) {
        this.privacyVersion = privacyVersion;
    }

    public Instant getDeletionRequestedAt() {
        return deletionRequestedAt;
    }

    public void setDeletionRequestedAt(Instant deletionRequestedAt) {
        this.deletionRequestedAt = deletionRequestedAt;
    }

    public Instant getDeletionScheduledAt() {
        return deletionScheduledAt;
    }

    public void setDeletionScheduledAt(Instant deletionScheduledAt) {
        this.deletionScheduledAt = deletionScheduledAt;
    }

    public String getDeletionReason() {
        return deletionReason;
    }

    public void setDeletionReason(String deletionReason) {
        this.deletionReason = deletionReason;
    }

    public Instant getAnonymizedAt() {
        return anonymizedAt;
    }

    public void setAnonymizedAt(Instant anonymizedAt) {
        this.anonymizedAt = anonymizedAt;
    }

    public AccountOrigin getAccountOrigin() {
        return accountOrigin;
    }

    public void setAccountOrigin(AccountOrigin accountOrigin) {
        this.accountOrigin = accountOrigin;
    }

    public String getFixtureKey() {
        return fixtureKey;
    }

    public void setFixtureKey(String fixtureKey) {
        this.fixtureKey = fixtureKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    /** Pode usar a API além de cancelar a exclusão/exportar (D-18): só {@code ACTIVE} e os pendentes. */
    public boolean isDeletionScheduled() {
        return status == AccountStatus.DELETION_SCHEDULED;
    }

    /** Nunca inclui hash de senha, e-mail ou telefone — seguro para log. */
    @Override
    public String toString() {
        return "User{id=" + id + ", username=" + username + ", status=" + status + ", role=" + role + "}";
    }
}
