package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.domain.identity.AccountOrigin;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;

/**
 * Regra de vinculação do login institucional (RF2.CA03/CA12, Q-30): o {@code id_token} já validado ({@code iss},
 * {@code aud}, {@code exp}, {@code nonce}) chega como {@link OidcClaims}.
 * <ol>
 *   <li>Conta já vinculada por ({@code iss}, {@code sub}) → entra.</li>
 *   <li>Senão, conta existente com o mesmo {@code email_hash} → vincula SÓ se o IdP marcou {@code email_verified=true};
 *       sem isso recusa ({@code 401 OIDC_EMAIL_NAO_VERIFICADO}) — evita takeover por e-mail não comprovado.</li>
 *   <li>Senão, cria conta {@code ACTIVE} sem senha ({@code passwordHash} nulo), também só com {@code email_verified=true}.
 *       O aceite dos termos no 1º login OIDC é a tela de conclusão (RF1.CA17, bloco LGPD A).</li>
 * </ol>
 */
@Service
public class OidcAccountLinker {

    public record OidcClaims(String issuer, String subject, String email, boolean emailVerified, String name) {
    }

    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;
    private final EmailHasher emailHasher;
    private final AuditLogPort audit;
    private final Clock clock;

    public OidcAccountLinker(UserRepositoryPort users, UserPreferencesRepositoryPort preferences, EmailHasher emailHasher,
                             AuditLogPort audit, Clock clock) {
        this.users = users;
        this.preferences = preferences;
        this.emailHasher = emailHasher;
        this.audit = audit;
        this.clock = clock;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public User link(OidcClaims claims, RequestContext ctx) {
        if (blank(claims.issuer()) || blank(claims.subject())) {
            throw new ApiException(AuthCodes.OIDC_TOKEN_INVALIDO, 401, "Token institucional sem emissor ou sujeito.");
        }
        Optional<User> linked = users.findByOidc(claims.issuer(), claims.subject());
        if (linked.isPresent()) {
            return available(linked.get());
        }
        String email = EmailHasher.normalize(claims.email());
        if (email.isEmpty() || !RegistrationService.EMAIL.matcher(email).matches()) {
            throw new ApiException(AuthCodes.OIDC_TOKEN_INVALIDO, 401, "Token institucional sem e-mail utilizável.");
        }
        String hash = emailHasher.hash(email);
        Optional<User> byEmail = users.findByEmailHash(hash);
        if (!claims.emailVerified()) {
            audit.record(AuditEvent.of(byEmail.map(User::getId).orElse(null), AuditActions.OIDC_LINK_RECUSADO, "auth", null,
                    AuditEvent.NEGADO, ctx.ip(), ctx.userAgent(), Map.of("reason", "email_nao_verificado", "issuer", claims.issuer(),
                            "email", Masking.maskEmail(email))));
            throw new ApiException(AuthCodes.OIDC_EMAIL_NAO_VERIFICADO, 401,
                    "O provedor institucional não confirmou este e-mail; não é possível vincular a conta.");
        }
        if (byEmail.isPresent()) {
            User u = available(byEmail.get());
            u.setOidcIssuer(claims.issuer());
            u.setOidcSubject(claims.subject());
            u.setEmailVerified(true);
            if (u.getStatus() == AccountStatus.PENDING_EMAIL_VERIFICATION) {
                u.setStatus(u.getProfileType().requiresValidation() ? AccountStatus.PENDING_VALIDATION : AccountStatus.ACTIVE);
            }
            users.save(u);
            audit.record(AuditEvent.of(u.getId(), AuditActions.OIDC_LOGIN, "auth", null, AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                    Map.of("linked", true, "issuer", claims.issuer())));
            return u;
        }
        User u = new User();
        u.setUsername(freeUsername(claims.name() == null || claims.name().isBlank() ? email.substring(0, email.indexOf('@')) : claims.name()));
        u.setFullName(claims.name() == null || claims.name().isBlank() ? u.getUsername() : claims.name().trim());
        u.setEmail(email);
        u.setEmailHash(hash);
        u.setEmailVerified(true);
        u.setPasswordHash(null);
        u.setOidcIssuer(claims.issuer());
        u.setOidcSubject(claims.subject());
        u.setProfileType(ProfileType.EMPREGADO);
        u.setRole(Role.USER);
        u.setStatus(AccountStatus.ACTIVE);
        u.setAccountOrigin(AccountOrigin.REAL);
        u.setCreatedAt(clock.instant());
        u = users.save(u);
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId(u.getId());
        preferences.save(prefs);
        audit.record(AuditEvent.of(u.getId(), AuditActions.OIDC_LOGIN, "auth", null, AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                Map.of("created", true, "issuer", claims.issuer(), "email", Masking.maskEmail(email))));
        return u;
    }

    private static User available(User u) {
        if (u.getStatus().blocksLogin()) {
            throw new ApiException(AuthCodes.CONTA_INDISPONIVEL, 403, "Esta conta não está disponível.");
        }
        return u;
    }

    private String freeUsername(String base) {
        String b = Usernames.baseFrom(base);
        String candidate = b;
        int i = 1;
        while (Usernames.problem(candidate) != null || users.existsByUsername(candidate)) {
            candidate = b + "." + (i++);
            if (i > 50) {
                candidate = "usuario." + java.util.UUID.randomUUID().toString().substring(0, 8);
            }
        }
        return candidate;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
