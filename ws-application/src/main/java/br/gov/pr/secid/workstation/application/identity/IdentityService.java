package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Login, sessão e reconferência de senha (RF2.CA01–CA02, CA04–CA05, CA07–CA09, CA13–CA14; D-14).
 *
 * <p><b>Login sem oráculo</b>: conta inexistente avalia um hash falso e responde o mesmo {@code 401 CREDENCIAIS_INVALIDAS}
 * de senha errada e de conta bloqueada — mesmo com a senha certa. {@code 403 CONTA_INDISPONIVEL} e
 * {@code 401 DOIS_FATORES_NECESSARIO} só depois da senha certa e fora do bloqueio.
 *
 * <p><b>Bloqueio por conta</b>: a tentativa é reservada de forma atômica ({@link RateLimitPort#tryAcquire}) ANTES do
 * hash; bloqueada, o hash nem é calculado (40 pedidos paralelos avaliam no máximo 5 hashes — {@code IdentityServiceTest});
 * senha errada deixa a reserva; senha certa faz {@code release}; login completo faz {@code reset}.
 *
 * <p>A mesma reserva vale para a {@link #passwordMatchesWithLockout reconferência de senha} (troca de senha, dados
 * sensíveis, exclusão): o 6º erro recebe {@code 429 MUITAS_TENTATIVAS} + Retry-After sem olhar o resultado.
 */
@Service
public class IdentityService {
    public static final String LOGIN_FAIL_BUCKET = "login-fail";
    private static final String AUTH = "auth";

    private final UserRepositoryPort users;
    private final EmailHasher emailHasher;
    private final PasswordHasher hasher;
    private final RateLimitPort rateLimit;
    private final SessionStorePort sessions;
    private final RefreshTokenMirrorPort mirror;
    private final TokenIssuerPort tokens;
    private final AuditLogPort audit;
    private final SessionPolicy policy;
    private final Clock clock;
    /** Hash de uma senha aleatória avaliado para conta inexistente: mesmo custo de uma conta real. */
    private final String dummyHash;

    public IdentityService(UserRepositoryPort users, EmailHasher emailHasher, PasswordHasher hasher, RateLimitPort rateLimit,
                           SessionStorePort sessions, RefreshTokenMirrorPort mirror, TokenIssuerPort tokens, AuditLogPort audit,
                           SessionPolicy policy, Clock clock) {
        this.users = users;
        this.emailHasher = emailHasher;
        this.hasher = hasher;
        this.rateLimit = rateLimit;
        this.sessions = sessions;
        this.mirror = mirror;
        this.tokens = tokens;
        this.audit = audit;
        this.policy = policy;
        this.clock = clock;
        this.dummyHash = hasher.hash(Hashing.randomToken(24));
    }

    public record LoginCommand(String identifier, String password, boolean rememberMe, String deviceName, String twoFactorCode) {
    }

    // ------------------------------------------------------------------ login
    @Transactional(noRollbackFor = ApiException.class)
    public Session login(LoginCommand cmd, RequestContext ctx) {
        String id = cmd.identifier() == null ? "" : cmd.identifier().trim();
        String password = cmd.password() == null ? "" : cmd.password();
        User u = findByIdentifier(id).orElse(null);
        if (u == null) {
            hasher.matches(password, dummyHash);                                 // mesmo custo de uma conta real
            audit.record(AuditEvent.of(null, AuditActions.LOGIN_FALHA, AUTH, null, AuditEvent.FALHA, ctx.ip(), ctx.userAgent(),
                    Map.of("reason", "usuario_inexistente", "identifier", Masking.maskEmail(EmailHasher.normalize(id.contains("@") ? id : id + "@-")))));
            throw invalidCredentials();
        }
        boolean withinLimit = rateLimit.tryAcquire(u.getId(), LOGIN_FAIL_BUCKET, policy.maxLoginFailures(), policy.lockWindow());
        if (!withinLimit) {
            // bloqueada: nem o hash é calculado (CPU) e a resposta é a mesma de senha errada — mesmo com a senha certa
            RateLimitPort.QuotaStatus lock = rateLimit.status(u.getId(), LOGIN_FAIL_BUCKET, policy.maxLoginFailures(), policy.lockWindow());
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_BLOQUEADO_TENTATIVAS, AUTH, null, AuditEvent.NEGADO, ctx.ip(),
                    ctx.userAgent(), Map.of("resetAt", lock.resetAt().toString(), "email", Masking.maskEmail(EmailHasher.normalize(u.getEmail())))));
            throw invalidCredentials();
        }
        String stored = u.getPasswordHash() == null || u.getPasswordHash().isBlank() ? dummyHash : u.getPasswordHash();
        boolean passwordOk = hasher.matches(password, stored) && u.getPasswordHash() != null;
        if (!passwordOk) {
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_FALHA, AUTH, null, AuditEvent.FALHA, ctx.ip(), ctx.userAgent(),
                    Map.of("reason", "senha", "email", Masking.maskEmail(EmailHasher.normalize(u.getEmail())))));
            throw invalidCredentials();                                          // a reserva fica: conta como falha
        }
        rateLimit.release(u.getId(), LOGIN_FAIL_BUCKET);                           // senha certa não é falha
        if (u.getStatus().blocksLogin()) {
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_FALHA, AUTH, null, AuditEvent.NEGADO, ctx.ip(), ctx.userAgent(),
                    Map.of("reason", "conta_indisponivel", "status", u.getStatus().name())));
            throw new ApiException(AuthCodes.CONTA_INDISPONIVEL, 403, "Esta conta não está disponível.");
        }
        if (hasher.needsRehash(u.getPasswordHash())) {
            u.setPasswordHash(hasher.hash(password));                             // parâmetros do Argon2 atualizados
        }
        if (u.isTwoFactorEnabled()) {
            // contrato/estado do 2FA (RF2.CA02); a conferência TOTP é a Q-83 — até lá, conta com 2FA não entra
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_FALHA, AUTH, null, AuditEvent.FALHA, ctx.ip(), ctx.userAgent(),
                    Map.of("reason", "2fa")));
            throw new ApiException(AuthCodes.DOIS_FATORES_NECESSARIO, 401, "Informe o código do segundo fator.",
                    Map.of("twoFactorRequired", true));
        }
        rateLimit.reset(u.getId(), LOGIN_FAIL_BUCKET);
        u.setLastLoginAt(clock.instant());
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_OK, AUTH, null, AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                Map.of("email", Masking.maskEmail(EmailHasher.normalize(u.getEmail())), "rememberMe", cmd.rememberMe())));
        return openSession(u, cmd.rememberMe(), cmd.deviceName(), ctx);
    }

    private java.util.Optional<User> findByIdentifier(String id) {
        if (id.isEmpty()) {
            return java.util.Optional.empty();
        }
        if (id.contains("@")) {
            return users.findByEmailHash(emailHasher.hash(EmailHasher.normalize(id)));
        }
        return users.findByUsername(Usernames.normalize(id));
    }

    static ApiException invalidCredentials() {
        return new ApiException(AuthCodes.CREDENCIAIS_INVALIDAS, 401, "Credenciais inválidas.");
    }

    // ------------------------------------------------------------------ sessão
    /** Abre uma família nova (login, cadastro verificado, OIDC). */
    public Session openSession(User u, boolean persistent, String deviceName, RequestContext ctx) {
        return issue(u, UUID.randomUUID(), null, persistent, deviceName, ctx);
    }

    private Session issue(User u, UUID family, String rotatedFromHash, boolean persistent, String deviceName, RequestContext ctx) {
        Instant now = clock.instant();
        String raw = Hashing.randomToken(32);
        RefreshRecord record = new RefreshRecord(Hashing.sha256(raw), family, u.getId(), now, now.plus(policy.refreshTtl(persistent)),
                null, rotatedFromHash, persistent, deviceName == null ? shortAgent(ctx.userAgent()) : deviceName);
        sessions.save(record);
        mirror.saved(record, ctx);
        List<String> warnings = new ArrayList<>();
        if (!u.isEmailVerified()) {
            warnings.add("E-mail ainda não confirmado.");
        }
        if (u.getStatus() == AccountStatus.PENDING_VALIDATION) {
            warnings.add("Perfil aguardando validação.");
        }
        if (u.getStatus() == AccountStatus.DELETION_SCHEDULED) {
            warnings.add("Exclusão da conta agendada para " + u.getDeletionScheduledAt() + ".");
        }
        String access = tokens.issueAccessToken(u, family);
        return new Session(access, "Bearer", tokens.accessTokenTtl().toSeconds(), raw, record.expiresAt(), family,
                UserView.of(u), List.copyOf(warnings));
    }

    /** Rotação por família (RF2.CA04): reuso de token já rotacionado revoga a família inteira e audita {@code REFRESH_REUSO}. */
    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawRefresh, RequestContext ctx) {
        if (rawRefresh == null || rawRefresh.isBlank()) {
            throw sessionInvalid();
        }
        Instant now = clock.instant();
        RefreshRecord rt = sessions.find(Hashing.sha256(rawRefresh)).orElseThrow(IdentityService::sessionInvalid);
        if (rt.revokedAt() != null) {
            sessions.revokeFamily(rt.familyId(), now);
            mirror.familyRevoked(rt.familyId(), now);
            audit.record(AuditEvent.of(rt.userId(), AuditActions.REFRESH_REUSO, "session", rt.familyId().toString(), AuditEvent.NEGADO,
                    ctx.ip(), ctx.userAgent(), Map.of()));
            throw new ApiException(AuthCodes.SESSAO_INVALIDA, 401, "Sessão encerrada por segurança. Entre de novo.");
        }
        if (!rt.expiresAt().isAfter(now)) {
            throw sessionInvalid();
        }
        User u = users.findById(rt.userId()).orElseThrow(IdentityService::sessionInvalid);
        if (u.getStatus().blocksLogin()) {
            sessions.revokeFamily(rt.familyId(), now);
            mirror.familyRevoked(rt.familyId(), now);
            throw sessionInvalid();
        }
        sessions.revoke(rt.tokenHash(), now);
        mirror.revoked(rt.tokenHash(), now);
        return issue(u, rt.familyId(), rt.tokenHash(), rt.persistent(), rt.deviceName(), ctx);
    }

    static ApiException sessionInvalid() {
        return new ApiException(AuthCodes.SESSAO_INVALIDA, 401, "Sessão expirada ou inválida. Entre de novo.");
    }

    /** Usado pelo {@code SessionActiveFilter} a cada requisição autenticada: {@code sid} revogado → 401. */
    public boolean sessionActive(UUID familyId) {
        return familyId != null && sessions.familyActive(familyId, clock.instant());
    }

    @Transactional
    public void logout(CurrentUser user, RequestContext ctx) {
        Instant now = clock.instant();
        sessions.revokeFamily(user.sessionId(), now);
        mirror.familyRevoked(user.sessionId(), now);
        audit.record(AuditEvent.of(user.id(), AuditActions.LOGOUT, "session", String.valueOf(user.sessionId()), AuditEvent.OK,
                ctx.ip(), ctx.userAgent(), Map.of()));
    }

    /** Encerra as outras famílias da pessoa (troca de senha, redefinição). */
    public int revokeOtherSessions(UUID userId, UUID keepFamily) {
        Instant now = clock.instant();
        int ended = sessions.revokeAllOfUser(userId, keepFamily, now);
        mirror.userRevoked(userId, keepFamily, now);
        return ended;
    }

    public List<RefreshRecord> activeSessions(UUID userId) {
        return sessions.activeOfUser(userId, clock.instant());
    }

    // ------------------------------------------------------------------ reconferência de senha
    /**
     * Senha conferida para quem já está logado (troca de senha, dados sensíveis, exclusão), no MESMO bloqueio do login.
     * Bloqueado responde {@code 429 MUITAS_TENTATIVAS} + {@code Retry-After} sem conferir: nem a senha certa passa.
     */
    public boolean passwordMatchesWithLockout(User u, String password, String via, RequestContext ctx) {
        boolean withinLimit = rateLimit.tryAcquire(u.getId(), LOGIN_FAIL_BUCKET, policy.maxLoginFailures(), policy.lockWindow());
        if (!withinLimit) {
            RateLimitPort.QuotaStatus lock = rateLimit.status(u.getId(), LOGIN_FAIL_BUCKET, policy.maxLoginFailures(), policy.lockWindow());
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_BLOQUEADO_TENTATIVAS, AUTH, null, AuditEvent.NEGADO, ctx.ip(),
                    ctx.userAgent(), Map.of("resetAt", lock.resetAt().toString(), "via", via)));
            long retry = lock.retryAfterSeconds(clock.instant());
            throw new ApiException(AuthCodes.MUITAS_TENTATIVAS, 429,
                    "Muitas tentativas de senha. Aguarde " + Math.max(1, (retry + 59) / 60) + " minuto(s).",
                    Map.of("resetAt", lock.resetAt().toString(), "retryAfterSeconds", retry));
        }
        String stored = u.getPasswordHash() == null || u.getPasswordHash().isBlank() ? dummyHash : u.getPasswordHash();
        boolean ok = hasher.matches(password == null ? "" : password, stored) && u.getPasswordHash() != null;
        if (ok) {
            rateLimit.release(u.getId(), LOGIN_FAIL_BUCKET);
        } else {
            audit.record(AuditEvent.of(u.getId(), AuditActions.LOGIN_FALHA, AUTH, null, AuditEvent.FALHA, ctx.ip(), ctx.userAgent(),
                    Map.of("reason", via)));
        }
        return ok;
    }

    /** Step-up: {@code 401 REAUTENTICACAO_FALHOU} (ou 429 bloqueado). */
    public User reauthenticate(CurrentUser current, String password, String via, RequestContext ctx) {
        User u = users.findById(current.id()).orElseThrow(() -> ApiException.notFound("Usuário"));
        if (!passwordMatchesWithLockout(u, password, via, ctx)) {
            throw new ApiException(AuthCodes.REAUTENTICACAO_FALHOU, 401, "Confirme sua senha atual para continuar.");
        }
        return u;
    }

    /** RF2.CA05/CA09 — troca de senha com a senha atual; encerra todas as outras famílias. Devolve quantas encerrou. */
    @Transactional(noRollbackFor = ApiException.class)
    public int changePassword(CurrentUser current, String currentPassword, String newPassword, String confirm, RequestContext ctx) {
        User u = users.findById(current.id()).orElseThrow(() -> ApiException.notFound("Usuário"));
        if (!passwordMatchesWithLockout(u, currentPassword, "troca_senha", ctx)) {
            throw new ApiException(AuthCodes.SENHA_ATUAL_INCORRETA, 422, "A senha atual não confere.");
        }
        Passwords.validate(newPassword, confirm);
        u.setPasswordHash(hasher.hash(newPassword));
        users.save(u);
        int ended = revokeOtherSessions(u.getId(), current.sessionId());
        audit.record(AuditEvent.of(u.getId(), AuditActions.PASSWORD_CHANGED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("sessionsEnded", ended, "via", "troca")));
        return ended;
    }

    /** Lido pelo fluxo de redefinição por e-mail: sai do bloqueio quem provou o e-mail (RF2.CA08). */
    public void clearLockout(UUID userId) {
        rateLimit.reset(userId, LOGIN_FAIL_BUCKET);
    }

    static String shortAgent(String ua) {
        if (ua == null || ua.isBlank()) {
            return "dispositivo";
        }
        String s = ua.trim();
        return s.length() > 60 ? s.substring(0, 60) : s;
    }
}
