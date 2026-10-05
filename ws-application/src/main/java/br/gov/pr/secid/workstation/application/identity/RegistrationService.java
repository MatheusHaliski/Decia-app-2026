package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.domain.identity.AccountOrigin;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * RF1 — cadastro e verificação de e-mail (CA01, CA03–CA05, CA07, CA10–CA13, CA15, CA22).
 * <ul>
 *   <li><b>Sem oráculo de e-mail</b>: e-mail já cadastrado recebe a MESMA resposta {@code 202} do cadastro novo; quem já
 *       tem conta recebe um e-mail "sua conta já existe" em vez do código (RF1.CA02 corrigido — "CA a confirmar").</li>
 *   <li><b>Nomes reservados</b> ({@link Usernames}) → {@code 422 NOME_RESERVADO}; username ocupado → {@code 409 USERNAME_EM_USO}
 *       (username é público: a disponibilidade tem endpoint próprio).</li>
 *   <li><b>Códigos</b>: 6 dígitos, 15 min, ≤ {@value VerificationCode#MAX_ATTEMPTS} tentativas por código com {@code attempts++}
 *       persistido mesmo com erro ({@code noRollbackFor}) + contador atômico {@value #CODE_ATTEMPTS_PER_HOUR}/h por pessoa e
 *       finalidade ({@code 429 MUITAS_TENTATIVAS}).</li>
 *   <li><b>Aceite</b>: {@code acceptTerms=true} obrigatório ({@code 422 details.fields.acceptTerms}); grava as versões vigentes
 *       ({@link LegalProperties}) — gancho do bloco LGPD A.</li>
 *   <li>EMPRESA/CHEFE_DEPARTAMENTO nascem {@code PENDING_VALIDATION} depois do e-mail confirmado (RF28 valida depois).</li>
 * </ul>
 */
@Service
public class RegistrationService {
    public static final int CODE_ATTEMPTS_PER_HOUR = 10;
    public static final int RESENDS_PER_HOUR = 5;
    static final Duration CODE_TTL = Duration.ofMinutes(15);
    public static final Pattern EMAIL = Pattern.compile("^[\\w.%+-]+@[\\w-]+(\\.[\\w-]+)+$");
    public static final Pattern PHONE_E164 = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    static final String TEMPLATE_VERIFY = "email-verification";
    static final String TEMPLATE_EXISTING = "account-already-exists";

    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;
    private final VerificationCodeRepositoryPort codes;
    private final EmailHasher emailHasher;
    private final PasswordHasher hasher;
    private final RateLimitPort rateLimit;
    private final MailPort mail;
    private final AuditLogPort audit;
    private final IdentityService identity;
    private final LegalProperties legal;
    private final Clock clock;

    public RegistrationService(UserRepositoryPort users, UserPreferencesRepositoryPort preferences, VerificationCodeRepositoryPort codes,
                               EmailHasher emailHasher, PasswordHasher hasher, RateLimitPort rateLimit, MailPort mail, AuditLogPort audit,
                               IdentityService identity, LegalProperties legal, Clock clock) {
        this.users = users;
        this.preferences = preferences;
        this.codes = codes;
        this.emailHasher = emailHasher;
        this.hasher = hasher;
        this.rateLimit = rateLimit;
        this.mail = mail;
        this.audit = audit;
        this.identity = identity;
        this.legal = legal;
        this.clock = clock;
    }

    public record RegisterCommand(String profileType, String fullName, String username, String email, String password,
                                  String confirmPassword, String phone, Boolean acceptTerms) {
    }

    /** Resposta única do cadastro (exista ou não o e-mail): nada aqui diz se a conta já existia. */
    public record Receipt(String status, String maskedEmail, String nextStep) {
        public static Receipt verificationSent(String email) {
            return new Receipt("VERIFICACAO_ENVIADA", Masking.maskEmail(email), "Confirme o código enviado ao e-mail para ativar a conta.");
        }
    }

    public record Availability(String username, boolean available, String reason, List<String> suggestions) {
    }

    // ------------------------------------------------------------------ cadastro
    @Transactional
    public Receipt register(RegisterCommand cmd, RequestContext ctx) {
        Map<String, Object> fields = new LinkedHashMap<>();
        ProfileType type = parseProfileType(cmd.profileType(), fields);
        String fullName = cmd.fullName() == null ? "" : cmd.fullName().trim();
        if (fullName.length() < 3 || fullName.length() > 160) {
            fields.put("fullName", "Informe o nome completo (3 a 160 caracteres).");
        }
        String username = Usernames.normalize(cmd.username());
        String usernameProblem = Usernames.problem(username);
        if ("FORMATO".equals(usernameProblem)) {
            fields.put("username", "Use 3 a 30 caracteres: letras minúsculas, números, ponto ou sublinhado.");
        }
        String email = EmailHasher.normalize(cmd.email());
        if (!EMAIL.matcher(email).matches() || email.length() > 320) {
            fields.put("email", "Informe um e-mail válido.");
        }
        Passwords.problem(cmd.password()).ifPresent(p -> fields.put("password", p));
        if (cmd.password() != null && !cmd.password().equals(cmd.confirmPassword())) {
            fields.put("confirmPassword", "As senhas não coincidem.");
        }
        String phone = cmd.phone() == null || cmd.phone().isBlank() ? null : cmd.phone().replaceAll("[\\s()-]", "");
        if (phone != null && !PHONE_E164.matcher(phone).matches()) {
            fields.put("phone", "Informe o telefone no formato internacional (+55…).");
        }
        if (!Boolean.TRUE.equals(cmd.acceptTerms())) {
            fields.put("acceptTerms", "É preciso aceitar os Termos de Uso e a Política de Privacidade.");
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
        if ("RESERVADO".equals(usernameProblem)) {
            throw ApiException.unprocessable(AuthCodes.NOME_RESERVADO, "Este nome de usuário é reservado.",
                    Map.of("fields", Map.of("username", "Nome reservado. Escolha outro."), "suggestions", suggestions(fullName)));
        }
        if (users.existsByUsername(username)) {
            throw new ApiException(AuthCodes.USERNAME_EM_USO, 409, "Este nome de usuário já está em uso.",
                    Map.of("suggestions", suggestions(username)));
        }
        String emailHash = emailHasher.hash(email);
        Optional<User> existing = users.findByEmailHash(emailHash);
        if (existing.isPresent()) {
            return alreadyExists(existing.get(), email, ctx);
        }
        User u = new User();
        u.setUsername(username);
        u.setFullName(fullName);
        u.setEmail(email);
        u.setEmailHash(emailHash);
        u.setPhone(phone);
        u.setPasswordHash(hasher.hash(cmd.password()));
        u.setProfileType(type);
        u.setRole(Role.USER);
        u.setStatus(AccountStatus.PENDING_EMAIL_VERIFICATION);
        u.setAccountOrigin(AccountOrigin.REAL);
        u.setTermsVersion(legal.currentVersions().terms());
        u.setPrivacyVersion(legal.currentVersions().privacy());
        u.setCreatedAt(clock.instant());
        try {
            u = users.save(u);
        } catch (DataIntegrityViolationException race) {
            // dois cadastros do mesmo e-mail na mesma janela: o segundo recebe a mesma resposta de "já existe"
            return users.findByEmailHash(emailHash).map(found -> alreadyExists(found, email, ctx))
                    .orElseThrow(() -> new ApiException(AuthCodes.USERNAME_EM_USO, 409, "Este nome de usuário já está em uso."));
        }
        UserPreferences prefs = new UserPreferences();
        prefs.setUserId(u.getId());
        preferences.save(prefs);
        sendVerification(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.USER_REGISTERED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("profileType", type.name(), "email", Masking.maskEmail(email), "termsVersion",
                        legal.currentVersions().terms(), "privacyVersion", legal.currentVersions().privacy())));
        return Receipt.verificationSent(email);
    }

    private Receipt alreadyExists(User existing, String email, RequestContext ctx) {
        mail.send(new MailMessage(email, TEMPLATE_EXISTING, "Você já tem uma conta no Work Station", null,
                Map.of("username", existing.getUsername())));
        audit.record(AuditEvent.of(existing.getId(), AuditActions.REGISTER_EMAIL_EM_USO, "user", existing.getId().toString(),
                AuditEvent.NEGADO, ctx.ip(), ctx.userAgent(), Map.of("email", Masking.maskEmail(email))));
        return Receipt.verificationSent(email);
    }

    static ProfileType parseProfileType(String raw, Map<String, Object> fields) {
        try {
            return ProfileType.valueOf(raw == null ? "" : raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            fields.put("profileType", "Escolha EMPREGADO, EMPRESA ou CHEFE_DEPARTAMENTO.");
            return null;
        }
    }

    // ------------------------------------------------------------------ verificação de e-mail
    private void sendVerification(User u) {
        Instant now = clock.instant();
        codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION).forEach(c -> codes.save(c.consumed(now)));
        String code = Hashing.numericCode(6);
        codes.save(VerificationCode.issue(u.getId(), VerificationPurpose.EMAIL_VERIFICATION, codeHash(u.getId(), code), now, CODE_TTL));
        mail.send(new MailMessage(u.getEmail(), TEMPLATE_VERIFY, "Seu código de confirmação", code,
                Map.of("username", u.getUsername(), "minutes", String.valueOf(CODE_TTL.toMinutes()))));
    }

    static String codeHash(UUID userId, String code) {
        return Hashing.sha256(userId + ":" + (code == null ? "" : code.trim()));
    }

    /** Reenvio: resposta igual exista ou não a conta; por pessoa, no máximo {@value #RESENDS_PER_HOUR}/h (silencioso). */
    @Transactional
    public void resendVerification(String rawEmail, RequestContext ctx) {
        String email = EmailHasher.normalize(rawEmail);
        users.findByEmailHash(emailHasher.hash(email)).filter(u -> !u.isEmailVerified()).ifPresent(u -> {
            if (rateLimit.tryAcquire(u.getId(), "email-verification-send", RESENDS_PER_HOUR, Duration.ofHours(1))) {
                sendVerification(u);
            }
        });
    }

    /**
     * Confere o código: contador atômico 10/h por pessoa e finalidade, depois ≤ 5 tentativas por código com {@code attempts}
     * persistido mesmo quando o erro é lançado. Sucesso: e-mail confirmado, status final e sessão aberta (RF1.CA05).
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Session confirmEmail(String rawEmail, String code, String deviceName, RequestContext ctx) {
        String email = EmailHasher.normalize(rawEmail);
        User u = users.findByEmailHash(emailHasher.hash(email)).orElseThrow(RegistrationService::invalidCode);
        if (u.isEmailVerified()) {
            throw invalidCode();                                           // nada a confirmar; resposta igual à de código errado
        }
        requireCodeAttemptQuota(u.getId(), VerificationPurpose.EMAIL_VERIFICATION);
        Instant now = clock.instant();
        VerificationCode vc = codes.findOpen(u.getId(), VerificationPurpose.EMAIL_VERIFICATION).stream().findFirst()
                .orElseThrow(RegistrationService::invalidCode);
        if (!vc.usable(now)) {
            throw new ApiException(AuthCodes.CODIGO_EXPIRADO, 422, "O código expirou. Peça um novo.");
        }
        if (!Hashing.constantTimeEquals(vc.codeHash(), codeHash(u.getId(), code))) {
            VerificationCode failed = codes.save(vc.failedAttempt(now));
            audit.record(AuditEvent.of(u.getId(), AuditActions.EMAIL_VERIFICATION_FALHA, "user", u.getId().toString(), AuditEvent.FALHA,
                    ctx.ip(), ctx.userAgent(), Map.of("attempts", failed.attempts())));
            int remaining = VerificationCode.MAX_ATTEMPTS - failed.attempts();
            if (remaining <= 0) {
                throw new ApiException(AuthCodes.CODIGO_EXPIRADO, 422, "Muitas tentativas: o código foi invalidado. Peça um novo.");
            }
            throw new ApiException(AuthCodes.CODIGO_INVALIDO, 422, "Código incorreto. Restam " + remaining + " tentativa(s).",
                    Map.of("remainingAttempts", remaining));
        }
        codes.save(vc.consumed(now));
        u.setEmailVerified(true);
        u.setStatus(u.getProfileType().requiresValidation() ? AccountStatus.PENDING_VALIDATION : AccountStatus.ACTIVE);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.EMAIL_VERIFIED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("status", u.getStatus().name())));
        return identity.openSession(u, false, deviceName, ctx);
    }

    static ApiException invalidCode() {
        return new ApiException(AuthCodes.CODIGO_INVALIDO, 422, "Código inválido. Confira o e-mail e o código ou peça um novo.");
    }

    /** Palpites em paralelo leriam o mesmo {@code attempts}: o contador atômico limita por hora, independentemente disso. */
    void requireCodeAttemptQuota(UUID userId, VerificationPurpose purpose) {
        if (!rateLimit.tryAcquire(userId, "code-attempt:" + purpose.name(), CODE_ATTEMPTS_PER_HOUR, Duration.ofHours(1))) {
            RateLimitPort.QuotaStatus q = rateLimit.status(userId, "code-attempt:" + purpose.name(), CODE_ATTEMPTS_PER_HOUR, Duration.ofHours(1));
            throw new ApiException(AuthCodes.MUITAS_TENTATIVAS, 429, "Muitas tentativas de código. Aguarde antes de tentar de novo.",
                    Map.of("retryAfterSeconds", q.retryAfterSeconds(clock.instant())));
        }
    }

    // ------------------------------------------------------------------ username
    public Availability availability(String raw) {
        String username = Usernames.normalize(raw);
        String problem = Usernames.problem(username);
        if (problem != null) {
            return new Availability(username, false, problem, suggestions(username));
        }
        if (users.existsByUsername(username)) {
            return new Availability(username, false, "EM_USO", suggestions(username));
        }
        return new Availability(username, true, null, List.of());
    }

    /** Até 5 sugestões livres e não reservadas a partir do nome ou do username desejado. */
    public List<String> suggestions(String base) {
        String b = Usernames.baseFrom(base);
        List<String> out = new ArrayList<>();
        List<String> candidates = new ArrayList<>(List.of(b, b + "." + java.time.Year.now(clock).getValue() % 100, b + "_pr", b + ".secid"));
        for (int i = 0; out.size() + candidates.size() < 12 && i < 20; i++) {
            candidates.add(b + (10 + java.util.concurrent.ThreadLocalRandom.current().nextInt(90)));
        }
        for (String c : candidates) {
            if (out.size() >= 5) {
                break;
            }
            if (Usernames.problem(c) == null && !users.existsByUsername(c) && !out.contains(c)) {
                out.add(c);
            }
        }
        return List.copyOf(out);
    }
}
