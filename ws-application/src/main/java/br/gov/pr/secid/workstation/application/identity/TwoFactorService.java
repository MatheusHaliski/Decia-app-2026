package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Verificação em duas etapas por aplicativo autenticador (RF2.CA02, RF3; D-144, responde a Q-83).
 * <ol>
 *   <li>{@code setup}: senha atual (mesmo bloqueio do login) → segredo novo guardado cifrado, ainda desligado; devolve o segredo e a
 *       URI {@code otpauth://} para o aplicativo.</li>
 *   <li>{@code enable}: o primeiro código do aplicativo prova que ele foi configurado → liga, gera 10 códigos de recuperação
 *       (mostrados uma vez) e encerra as outras sessões.</li>
 *   <li>{@code disable} e {@code regenerateRecoveryCodes}: senha atual + código do aplicativo (ou de recuperação).</li>
 * </ol>
 * O login confere o código em {@link IdentityService#login}. Erros: {@code 409 DOIS_FATORES_JA_ATIVO}, {@code 409 DOIS_FATORES_INATIVO},
 * {@code 409 DOIS_FATORES_SEM_CONFIGURACAO}, {@code 422 DOIS_FATORES_INVALIDO}, {@code 401 REAUTENTICACAO_FALHOU}.
 */
@Service
public class TwoFactorService {
    private static final String USER = "user";

    private final UserRepositoryPort users;
    private final IdentityService identity;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;
    private final String issuer;
    private final SecureRandom random = new SecureRandom();

    public TwoFactorService(UserRepositoryPort users, IdentityService identity, ResourceAuthorizer authorizer, AuditLogPort audit, Clock clock,
                            @Value("${ws.security.two-factor.issuer:Work Station}") String issuer) {
        this.users = users;
        this.identity = identity;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
        this.issuer = issuer == null || issuer.isBlank() ? "Work Station" : issuer.strip();
    }

    public record Status(boolean enabled, Instant enabledAt, int recoveryCodesLeft, boolean pendingSetup) {
    }

    public record Setup(String secret, String otpauthUri, String issuer, String account, int digits, long periodSeconds) {
    }

    public record RecoveryCodes(List<String> recoveryCodes) {
    }

    public Status status(CurrentUser current) {
        User u = authorizer.ownAccount(current);
        return new Status(u.isTwoFactorEnabled(), u.getTwoFactorEnabledAt(), u.isTwoFactorEnabled() ? TwoFactorVerifier.recoveryCodesLeft(u) : 0,
                !u.isTwoFactorEnabled() && u.getTwoFactorSecret() != null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Setup setup(CurrentUser current, String currentPassword, RequestContext ctx) {
        User u = authorizer.confirmOwn(current, identity.reauthenticate(current, currentPassword, "2fa_setup", ctx));
        if (u.isTwoFactorEnabled()) {
            throw new ApiException(AuthCodes.DOIS_FATORES_JA_ATIVO, 409, "A verificação em duas etapas já está ativa.");
        }
        String secret = Totp.newSecret(random);
        u.setTwoFactorSecret(secret);
        u.setTwoFactorRecoveryHashes(null);
        u.setTwoFactorLastStep(null);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.TWO_FACTOR_SETUP_STARTED, USER, u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of()));
        String account = u.getUsername() == null ? u.getId().toString() : u.getUsername();
        return new Setup(secret, Totp.otpauthUri(issuer, account, secret), issuer, account, Totp.DIGITS, Totp.PERIOD_SECONDS);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public RecoveryCodes enable(CurrentUser current, String code, RequestContext ctx) {
        User u = authorizer.ownAccount(current);
        if (u.isTwoFactorEnabled()) {
            throw new ApiException(AuthCodes.DOIS_FATORES_JA_ATIVO, 409, "A verificação em duas etapas já está ativa.");
        }
        if (u.getTwoFactorSecret() == null) {
            throw new ApiException(AuthCodes.DOIS_FATORES_SEM_CONFIGURACAO, 409, "Comece a configuração antes de confirmar o código.");
        }
        Instant now = clock.instant();
        if (TwoFactorVerifier.verify(u, code, now) != TwoFactorVerifier.Outcome.TOTP) {
            throw invalidCode();
        }
        u.setTwoFactorEnabled(true);
        u.setTwoFactorEnabledAt(now);
        List<String> codes = TwoFactorVerifier.newRecoveryCodes(u, random);
        users.save(u);
        int ended = identity.revokeOtherSessions(u.getId(), current.sessionId());
        audit.record(AuditEvent.of(u.getId(), AuditActions.TWO_FACTOR_ENABLED, USER, u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("sessionsEnded", ended)));
        return new RecoveryCodes(codes);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Status disable(CurrentUser current, String currentPassword, String code, RequestContext ctx) {
        User u = authorizer.confirmOwn(current, identity.reauthenticate(current, currentPassword, "2fa_disable", ctx));
        requireEnabled(u);
        TwoFactorVerifier.Outcome outcome = TwoFactorVerifier.verify(u, code, clock.instant());
        if (outcome == TwoFactorVerifier.Outcome.INVALID) {
            users.save(u);
            throw invalidCode();
        }
        u.setTwoFactorEnabled(false);
        u.setTwoFactorEnabledAt(null);
        u.setTwoFactorSecret(null);
        u.setTwoFactorRecoveryHashes(null);
        u.setTwoFactorLastStep(null);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.TWO_FACTOR_DISABLED, USER, u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("via", outcome.name())));
        return new Status(false, null, 0, false);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public RecoveryCodes regenerateRecoveryCodes(CurrentUser current, String currentPassword, String code, RequestContext ctx) {
        User u = authorizer.confirmOwn(current, identity.reauthenticate(current, currentPassword, "2fa_recovery", ctx));
        requireEnabled(u);
        if (TwoFactorVerifier.verify(u, code, clock.instant()) != TwoFactorVerifier.Outcome.TOTP) {
            throw invalidCode();
        }
        List<String> codes = TwoFactorVerifier.newRecoveryCodes(u, random);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.TWO_FACTOR_RECOVERY_REGENERATED, USER, u.getId().toString(), AuditEvent.OK,
                ctx.ip(), ctx.userAgent(), Map.of()));
        return new RecoveryCodes(codes);
    }

    private static void requireEnabled(User u) {
        if (!u.isTwoFactorEnabled()) {
            throw new ApiException(AuthCodes.DOIS_FATORES_INATIVO, 409, "A verificação em duas etapas não está ativa.");
        }
    }

    static ApiException invalidCode() {
        return new ApiException(AuthCodes.DOIS_FATORES_INVALIDO, 422, "Código inválido ou já usado. Confira o horário do celular e tente o código novo.");
    }
}
