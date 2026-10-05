package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEntry;
import br.gov.pr.secid.workstation.application.audit.AuditPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Identidade e senha (RF1/RF2 com os controles do D-14 / SEG RN49.02–RN49.03).
 * <ul>
 *   <li><b>Login sem oráculo:</b> conta inexistente, senha errada e conta bloqueada respondem o mesmo
 *   {@code 401 CREDENCIAIS_INVALIDAS} e custam o mesmo tempo (quem não tem hash real compara contra um hash falso).
 *   {@code 403} por status da conta e {@code 401 DOIS_FATORES_NECESSARIO} só saem depois da senha certa.</li>
 *   <li><b>Bloqueio atômico:</b> no máximo {@value #MAX_LOGIN_FAILURES} tentativas por conta em
 *   {@code LOCK_WINDOW}; a vaga é reservada no {@link RateLimitPort} <b>antes</b> de avaliar a senha, de forma
 *   atômica — 40 pedidos em paralelo avaliam no máximo 5 senhas de verdade (os demais avaliam o hash falso, para
 *   manter o tempo). Senha certa devolve a reserva ({@code release}); login completo zera o balde ({@code reset});
 *   nem a senha certa entra enquanto bloqueada.</li>
 *   <li><b>Reconferência de senha</b> ({@link #reauthenticate}): mesma reserva; estourou → {@code 429 MUITAS_TENTATIVAS}
 *   com {@code Retry-After}; errada → {@code 401 SENHA_ATUAL_INCORRETA}.</li>
 * </ul>
 */
@Service
public class IdentityService {
    public static final String LOGIN_FAIL = "login-fail";
    public static final int MAX_LOGIN_FAILURES = 5;
    public static final Duration LOCK_WINDOW = Duration.ofMinutes(15);

    public static final String CREDENCIAIS_INVALIDAS = "CREDENCIAIS_INVALIDAS";
    public static final String CONTA_INDISPONIVEL = "CONTA_INDISPONIVEL";
    public static final String EMAIL_NAO_VERIFICADO = "EMAIL_NAO_VERIFICADO";
    public static final String PERFIL_EM_VALIDACAO = "PERFIL_EM_VALIDACAO";
    public static final String DOIS_FATORES_NECESSARIO = "DOIS_FATORES_NECESSARIO";
    public static final String MUITAS_TENTATIVAS = "MUITAS_TENTATIVAS";
    public static final String SENHA_ATUAL_INCORRETA = "SENHA_ATUAL_INCORRETA";

    private final UserRepository users;
    private final PasswordHasherPort hasher;
    private final RateLimitPort rateLimit;
    private final AuditPort audit;
    private final Clock clock;
    /** Hash de uma senha aleatória, avaliado quando não há hash real — mesmo custo, nenhuma informação. */
    private final String dummyHash;

    @Autowired
    public IdentityService(UserRepository users, PasswordHasherPort hasher, RateLimitPort rateLimit, AuditPort audit) {
        this(users, hasher, rateLimit, audit, Clock.systemUTC());
    }

    public IdentityService(UserRepository users, PasswordHasherPort hasher, RateLimitPort rateLimit, AuditPort audit, Clock clock) {
        this.users = users;
        this.hasher = hasher;
        this.rateLimit = rateLimit;
        this.audit = audit;
        this.clock = clock;
        this.dummyHash = hasher.hash("dummy-" + UUID.randomUUID());
    }

    /** Resultado da avaliação de senha sob bloqueio. */
    enum PasswordCheck { BLOCKED, WRONG, OK }

    @Transactional
    public AuthenticatedUser login(LoginCommand cmd, String ip, String userAgent) {
        String identifier = Identifiers.normalize(cmd == null ? null : cmd.identifier());
        CharSequence password = cmd == null || cmd.password() == null ? "" : cmd.password();

        Optional<User> found = identifier.isEmpty() ? Optional.empty() : findByIdentifier(identifier);
        if (found.isEmpty() || found.get().getPasswordHash() == null) {
            hasher.matches(password, dummyHash);        // mesmo tempo de uma senha errada (RN49.02)
            audit.record(new AuditEntry(null, AuditActions.LOGIN_FALHA, AuditEntry.FALHA, ip, userAgent,
                    Map.of("reason", "usuario_inexistente")));
            throw invalidCredentials();
        }
        User user = found.get();
        PasswordCheck check = passwordMatchesWithLockout(user, password);
        if (check == PasswordCheck.BLOCKED) {
            audit.record(new AuditEntry(user.getId(), AuditActions.LOGIN_BLOQUEADO_TENTATIVAS, AuditEntry.NEGADO, ip, userAgent,
                    withResetAt(Map.of("reason", "bloqueio_por_tentativas"), user)));
            throw invalidCredentials();                  // o bloqueio não vira oráculo: 401 genérico
        }
        if (check == PasswordCheck.WRONG) {
            audit.record(new AuditEntry(user.getId(), AuditActions.LOGIN_FALHA, AuditEntry.FALHA, ip, userAgent,
                    Map.of("reason", "senha")));
            throw invalidCredentials();                  // a reserva fica: a tentativa contou
        }

        // daqui para baixo a senha está certa — só aqui a conta pode dizer algo sobre si mesma
        ApiException denied = statusDenial(user.getStatus());
        if (denied != null) {
            audit.record(new AuditEntry(user.getId(), AuditActions.LOGIN_FALHA, AuditEntry.NEGADO, ip, userAgent,
                    Map.of("reason", "status", "status", user.getStatus().name())));
            throw denied;
        }
        if (user.isTwoFactorEnabled()) {
            throw new ApiException(DOIS_FATORES_NECESSARIO, 401, "Informe o código do segundo fator.");
        }
        if (hasher.needsRehash(user.getPasswordHash())) {
            user.setPasswordHash(hasher.hash(password));
        }
        rateLimit.reset(user.getId().toString(), LOGIN_FAIL);
        user.setLastLoginAt(clock.instant());
        users.save(user);
        audit.record(new AuditEntry(user.getId(), AuditActions.LOGIN_OK, AuditEntry.OK, ip, userAgent, Map.of()));
        return new AuthenticatedUser(user.getId(), user.getUsername(), user.getRole(), user.getProfileType());
    }

    /**
     * Reconferência de senha nos step-ups (troca de senha, dados sensíveis, exclusão — CA03): usa a mesma reserva
     * {@code login-fail}. Estourou → {@code 429 MUITAS_TENTATIVAS} (details.retryAfterSeconds); errada →
     * {@code 401 SENHA_ATUAL_INCORRETA}; certa → devolve a reserva e segue.
     */
    @Transactional(readOnly = true)
    public void reauthenticate(UUID userId, CharSequence password, String ip, String userAgent) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("Sessão inválida."));
        PasswordCheck check = passwordMatchesWithLockout(user, password == null ? "" : password);
        if (check == PasswordCheck.BLOCKED) {
            QuotaStatus status = loginFailStatus(user);
            long retryAfter = status.retryAfterSeconds(clock.instant());
            audit.record(new AuditEntry(user.getId(), AuditActions.REAUTH_FALHA, AuditEntry.NEGADO, ip, userAgent,
                    withResetAt(Map.of("reason", "bloqueio_por_tentativas"), user)));
            throw new ApiException(MUITAS_TENTATIVAS, 429, "Muitas tentativas. Aguarde e tente de novo.",
                    Map.of("retryAfterSeconds", retryAfter));
        }
        if (check == PasswordCheck.WRONG) {
            audit.record(new AuditEntry(user.getId(), AuditActions.REAUTH_FALHA, AuditEntry.FALHA, ip, userAgent, Map.of()));
            throw new ApiException(SENHA_ATUAL_INCORRETA, 401, "A senha atual não confere.");
        }
        audit.record(new AuditEntry(user.getId(), AuditActions.REAUTH_OK, AuditEntry.OK, ip, userAgent, Map.of()));
    }

    /** Estado do balde {@code login-fail} da conta (para {@code Retry-After} e auditoria). */
    public QuotaStatus loginFailStatus(User user) {
        return rateLimit.status(user.getId().toString(), LOGIN_FAIL, MAX_LOGIN_FAILURES, LOCK_WINDOW);
    }

    /**
     * Reserva atômica ANTES do hash; bloqueada → avalia o hash falso (mesmo tempo) e nunca o real; senha certa devolve
     * a reserva. É o único lugar que compara senha com {@code users.password_hash}.
     */
    PasswordCheck passwordMatchesWithLockout(User user, CharSequence password) {
        String owner = user.getId().toString();
        boolean reserved = rateLimit.tryAcquire(owner, LOGIN_FAIL, MAX_LOGIN_FAILURES, LOCK_WINDOW);
        if (!reserved) {
            hasher.matches(password, dummyHash);
            return PasswordCheck.BLOCKED;
        }
        if (user.getPasswordHash() == null || !hasher.matches(password, user.getPasswordHash())) {
            return PasswordCheck.WRONG;
        }
        rateLimit.release(owner, LOGIN_FAIL);
        return PasswordCheck.OK;
    }

    private Optional<User> findByIdentifier(String normalized) {
        return Identifiers.looksLikeEmail(normalized)
                ? users.findByEmailHash(Identifiers.emailHash(normalized))
                : users.findByUsernameIgnoreCase(normalized);
    }

    private Map<String, Object> withResetAt(Map<String, Object> base, User user) {
        Map<String, Object> m = new HashMap<>(base);
        Instant resetAt = loginFailStatus(user).resetAt();
        if (resetAt != null) {
            m.put("resetAt", resetAt.toString());
        }
        return m;
    }

    static ApiException statusDenial(AccountStatus status) {
        if (status == null || status.canLogin()) {
            return null;
        }
        return switch (status) {
            case PENDING_EMAIL_VERIFICATION -> new ApiException(EMAIL_NAO_VERIFICADO, 403, "Confirme seu e-mail para entrar.");
            case PENDING_VALIDATION -> new ApiException(PERFIL_EM_VALIDACAO, 403, "Seu perfil ainda está em validação.");
            default -> new ApiException(CONTA_INDISPONIVEL, 403, "Esta conta não está disponível.");
        };
    }

    static ApiException invalidCredentials() {
        return new ApiException(CREDENCIAIS_INVALIDAS, 401, "E-mail/usuário ou senha incorretos.");
    }
}
