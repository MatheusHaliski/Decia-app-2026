package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.domain.identity.AccountOrigin;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;

/**
 * Primeira conta ADMIN (RF1.CA10, D-14): criada na subida só com {@code WS_ADMIN_BOOTSTRAP_ENABLED=true} e só se NÃO
 * existe nenhum ADMIN. Nunca promove conta existente sem {@code WS_ADMIN_PROMOTE_EXISTING=true} (e, mesmo assim, só conta
 * ativa com e-mail confirmado) — qualquer pessoa pode se cadastrar com o e-mail do admin antes da primeira subida.
 * A senha vem de {@code WS_ADMIN_INITIAL_PASSWORD} (segredo, sem padrão; em prod — {@code ws.secrets.enforce} — ausente
 * com o bootstrap ligado derruba o boot) e só é usada na criação. O aceite dos termos NÃO é automático (RF1.CA17).
 */
@Component
public class AdminBootstrap {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    public static final int MIN_PASSWORD = 16;

    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;
    private final EmailHasher emailHasher;
    private final PasswordHasher hasher;
    private final AuditLogPort audit;
    private final AdminProperties props;
    private final boolean enforceSecrets;
    private final Clock clock;

    public AdminBootstrap(UserRepositoryPort users, UserPreferencesRepositoryPort preferences, EmailHasher emailHasher, PasswordHasher hasher,
                          AuditLogPort audit, AdminProperties props, @Value("${ws.secrets.enforce:false}") boolean enforceSecrets, Clock clock) {
        this.users = users;
        this.preferences = preferences;
        this.emailHasher = emailHasher;
        this.hasher = hasher;
        this.audit = audit;
        this.props = props;
        this.enforceSecrets = enforceSecrets;
        this.clock = clock;
    }

    public enum Outcome { DISABLED, SKIPPED_ADMIN_EXISTS, CREATED, EXISTING_NOT_PROMOTED, PROMOTED, EXISTING_NOT_ELIGIBLE, INVALID_CONFIG }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        ensureAdmin();
    }

    @Transactional
    public Outcome ensureAdmin() {
        if (!props.bootstrapEnabled()) {
            return Outcome.DISABLED;
        }
        if (props.email().isBlank() || props.initialPassword().isBlank()) {
            if (enforceSecrets) {
                throw new IllegalStateException("WS_ADMIN_BOOTSTRAP_ENABLED=true exige WS_ADMIN_EMAIL e WS_ADMIN_INITIAL_PASSWORD (prod)");
            }
            log.warn("AdminBootstrap ligado sem WS_ADMIN_EMAIL/WS_ADMIN_INITIAL_PASSWORD: nada feito");
            return Outcome.INVALID_CONFIG;
        }
        if (users.countByRole(Role.ADMIN) > 0) {
            log.info("AdminBootstrap: já existe conta ADMIN; nada feito");
            return Outcome.SKIPPED_ADMIN_EXISTS;
        }
        String email = EmailHasher.normalize(props.email());
        Optional<User> existing = users.findByEmailHash(emailHasher.hash(email));
        if (existing.isPresent()) {
            return promote(existing.get());
        }
        if (props.initialPassword().length() < MIN_PASSWORD) {
            if (enforceSecrets) {
                throw new IllegalStateException("WS_ADMIN_INITIAL_PASSWORD precisa de ao menos " + MIN_PASSWORD + " caracteres");
            }
            log.warn("WS_ADMIN_INITIAL_PASSWORD com menos de {} caracteres: conta ADMIN não criada", MIN_PASSWORD);
            return Outcome.INVALID_CONFIG;
        }
        String handle = Usernames.normalize(props.username());
        if (Usernames.problem(handle) != null && !Usernames.reserved(handle)) {
            handle = "admin";
        }
        if (users.existsByUsername(handle)) {
            handle = handle + "_" + Long.toString(clock.millis() % 100_000, 36);
        }
        User u = new User();
        u.setUsername(handle);
        u.setFullName("Administração Work Station");
        u.setDisplayName("Administração");
        u.setEmail(email);
        u.setEmailHash(emailHasher.hash(email));
        u.setEmailVerified(true);
        u.setPasswordHash(hasher.hash(props.initialPassword()));
        u.setProfileType(ProfileType.EMPREGADO);
        u.setRole(Role.ADMIN);
        u.setStatus(AccountStatus.ACTIVE);
        u.setAccountOrigin(AccountOrigin.REAL);
        u.setCreatedAt(clock.instant());
        u = users.save(u);
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId(u.getId());
        preferences.save(prefs);
        audit.record(AuditEvent.of(u.getId(), AuditActions.ADMIN_BOOTSTRAP, "user", u.getId().toString(), AuditEvent.OK, null, null,
                Map.of("outcome", "CREATED", "email", Masking.maskEmail(email))));
        log.info("Conta de administração criada: @{} (ADMIN)", handle);
        return Outcome.CREATED;
    }

    private Outcome promote(User u) {
        if (!props.promoteExisting()) {
            log.warn("Já existe a conta @{} com o e-mail de WS_ADMIN_EMAIL e ela não é ADMIN: nada foi feito. Para promovê-la, confirme"
                    + " que a conta é sua e suba com WS_ADMIN_PROMOTE_EXISTING=true.", u.getUsername());
            return Outcome.EXISTING_NOT_PROMOTED;
        }
        if (!u.isEmailVerified() || u.getStatus() != AccountStatus.ACTIVE) {
            log.warn("Conta @{} não promovida a ADMIN: e-mail precisa estar confirmado e a conta ativa (status {})", u.getUsername(), u.getStatus());
            return Outcome.EXISTING_NOT_ELIGIBLE;
        }
        u.setRole(Role.ADMIN);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.ADMIN_BOOTSTRAP, "user", u.getId().toString(), AuditEvent.OK, null, null,
                Map.of("outcome", "PROMOTED")));
        log.warn("Conta @{} promovida a ADMIN (WS_ADMIN_EMAIL + WS_ADMIN_PROMOTE_EXISTING)", u.getUsername());
        return Outcome.PROMOTED;
    }
}
