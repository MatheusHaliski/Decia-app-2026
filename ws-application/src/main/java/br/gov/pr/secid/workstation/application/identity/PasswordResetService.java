package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Redefinição de senha por e-mail (RF2.CA08, RF3.CA29 do FAI): pedido com resposta idêntica exista ou não o e-mail;
 * token opaco (32 bytes) guardado só como hash, 1 uso, {@value #TOKEN_TTL_MINUTES} min; confirmar troca a senha, consome
 * o token e os anteriores, tira a conta do bloqueio e encerra todas as sessões.
 */
@Service
public class PasswordResetService {
    public static final int REQUESTS_PER_HOUR = 5;
    static final long TOKEN_TTL_MINUTES = 30;
    static final String TEMPLATE = "password-reset";

    private final UserRepositoryPort users;
    private final VerificationCodeRepositoryPort codes;
    private final EmailHasher emailHasher;
    private final PasswordHasher hasher;
    private final RateLimitPort rateLimit;
    private final MailPort mail;
    private final AuditLogPort audit;
    private final IdentityService identity;
    private final Clock clock;
    private final String frontendUrl;

    public PasswordResetService(UserRepositoryPort users, VerificationCodeRepositoryPort codes, EmailHasher emailHasher,
                                PasswordHasher hasher, RateLimitPort rateLimit, MailPort mail, AuditLogPort audit, IdentityService identity,
                                Clock clock, @Value("${ws.app.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.users = users;
        this.codes = codes;
        this.emailHasher = emailHasher;
        this.hasher = hasher;
        this.rateLimit = rateLimit;
        this.mail = mail;
        this.audit = audit;
        this.identity = identity;
        this.clock = clock;
        this.frontendUrl = frontendUrl;
    }

    /** Sempre "202": nunca revela se o e-mail existe. Por pessoa, {@value #REQUESTS_PER_HOUR} pedidos/h (silencioso). */
    @Transactional
    public void request(String rawEmail, RequestContext ctx) {
        String email = EmailHasher.normalize(rawEmail);
        users.findByEmailHash(emailHasher.hash(email)).ifPresent(u -> {
            if (!rateLimit.tryAcquire(u.getId(), "password-reset", REQUESTS_PER_HOUR, Duration.ofHours(1))) {
                return;
            }
            Instant now = clock.instant();
            String token = Hashing.randomToken(32);
            codes.save(VerificationCode.issue(u.getId(), VerificationPurpose.PASSWORD_RESET, Hashing.sha256(token), now,
                    Duration.ofMinutes(TOKEN_TTL_MINUTES)));
            mail.send(new MailMessage(u.getEmail(), TEMPLATE, "Redefinição de senha", token,
                    Map.of("link", frontendUrl + "/reset-password", "minutes", String.valueOf(TOKEN_TTL_MINUTES))));
            audit.record(AuditEvent.of(u.getId(), AuditActions.PASSWORD_RESET_REQUESTED, "user", u.getId().toString(), AuditEvent.OK,
                    ctx.ip(), ctx.userAgent(), Map.of("email", Masking.maskEmail(email))));
        });
    }

    @Transactional
    public void confirm(String token, String newPassword, String confirmPassword, RequestContext ctx) {
        VerificationCode vc = codes.findByCodeHash(Hashing.sha256(token == null ? "" : token.trim()))
                .filter(c -> c.purpose() == VerificationPurpose.PASSWORD_RESET)
                .orElseThrow(PasswordResetService::invalidLink);
        Instant now = clock.instant();
        if (!vc.usable(now)) {
            throw invalidLink();
        }
        Passwords.validate(newPassword, confirmPassword);
        User u = users.findById(vc.userId()).orElseThrow(PasswordResetService::invalidLink);
        u.setPasswordHash(hasher.hash(newPassword));
        users.save(u);
        codes.save(vc.consumed(now));
        codes.findOpen(u.getId(), VerificationPurpose.PASSWORD_RESET).forEach(c -> codes.save(c.consumed(now)));
        identity.clearLockout(u.getId());                                     // quem provou o e-mail sai do bloqueio
        int ended = identity.revokeOtherSessions(u.getId(), null);
        audit.record(AuditEvent.of(u.getId(), AuditActions.PASSWORD_RESET_COMPLETED, "user", u.getId().toString(), AuditEvent.OK,
                ctx.ip(), ctx.userAgent(), Map.of("sessionsEnded", ended)));
    }

    static ApiException invalidLink() {
        return new ApiException(AuthCodes.LINK_INVALIDO, 422, "Link inválido ou expirado. Peça uma nova redefinição.");
    }
}
