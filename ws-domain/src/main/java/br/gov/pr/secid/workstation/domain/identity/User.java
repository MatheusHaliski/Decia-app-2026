package br.gov.pr.secid.workstation.domain.identity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

/**
 * Conta de pessoa (tabela {@code users}, V2). Subconjunto das colunas usado pela autenticação (Bloco 3): e-mail só
 * cifrado ({@code email_enc}) + hash para busca/unicidade ({@code email_hash}); senha só como hash Argon2id;
 * {@code test_account} é coluna gerada no banco (nunca gravada pela aplicação, D-23). As demais colunas do V2
 * (perfil, aceites, exclusão) entram com os RFs que as usam.
 */
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Column(name = "username", nullable = false, length = 80)
    private String username;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(name = "display_name", length = 80)
    private String displayName;

    @Column(name = "email_enc", nullable = false, length = 512)
    private String emailEnc;

    @Column(name = "email_hash", nullable = false, length = 128)
    private String emailHash;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "password_hash")
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_type", nullable = false, length = 30)
    private ProfileType profileType;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private AccountStatus status = AccountStatus.PENDING_EMAIL_VERIFICATION;

    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_origin", nullable = false, length = 20)
    private AccountOrigin accountOrigin = AccountOrigin.REAL;

    @Column(name = "fixture_key", length = 80)
    private String fixtureKey;

    /** Gerada no banco a partir de {@code account_origin}; só leitura. */
    @Column(name = "test_account", insertable = false, updatable = false)
    private boolean testAccount;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

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

    public String getEmailEnc() {
        return emailEnc;
    }

    public void setEmailEnc(String emailEnc) {
        this.emailEnc = emailEnc;
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

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
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

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
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

    public boolean isTestAccount() {
        return testAccount;
    }

    public long getVersion() {
        return version;
    }
}
