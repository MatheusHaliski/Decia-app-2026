package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Masking;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.RegistrationService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.application.security.Guard;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.HypeVisibility;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * RF3 — a própria conta (CA01–CA04, CA08, CA19–CA20): perfil não sensível, dados sensíveis com step-up de senha (no mesmo
 * bloqueio do login), preferências e exclusão agendada (D-18: {@code DELETION_SCHEDULED} por 30 dias, cancelável; a
 * anonimização é o job do bloco LGPD C). BOLA/BFLA (D-65/D-66): todo acesso passa pelo {@link ResourceAuthorizer} — a própria conta
 * por {@code ownAccount/confirmOwn}, a conta de terceiro por {@code requireSelfOrAdmin} (papel ADMIN relido do banco).
 */
@Service
public class AccountService {
    public static final Duration DELETION_GRACE = Duration.ofDays(30);
    static final Set<String> THEMES = Set.of("AUTO", "CLARO", "ESCURO", "ALTO_CONTRASTE", "BLUEPRINT");
    static final Set<String> LANGUAGES = Set.of("PT_BR", "EN", "ES");
    static final Set<String> DENSITIES = Set.of("COMPACTA", "NORMAL", "CONFORTAVEL");
    static final Set<String> DESK_SKINS = Set.of("PAPEL", "CORTICA", "BLUEPRINT", "PAPEL_TIMBRADO");
    static final Set<String> AI_MODES = Set.of("ECONOMIA", "AVANCADO");

    private final UserRepositoryPort users;
    private final UserPreferencesRepositoryPort preferences;
    private final EmailHasher emailHasher;
    private final IdentityService identity;
    private final RegistrationService registration;
    private final AuditLogPort audit;
    private final Clock clock;
    private final ResourceAuthorizer authorizer;

    public AccountService(UserRepositoryPort users, UserPreferencesRepositoryPort preferences, EmailHasher emailHasher,
                          IdentityService identity, RegistrationService registration, AuditLogPort audit, Clock clock,
                          ResourceAuthorizer authorizer) {
        this.users = users;
        this.preferences = preferences;
        this.emailHasher = emailHasher;
        this.identity = identity;
        this.registration = registration;
        this.audit = audit;
        this.clock = clock;
        this.authorizer = authorizer;
    }

    public record ProfileUpdate(String fullName, String displayName, String jobTitle, String bio, String avatarUrl, String coverUrl,
                                String hypeVisibility, Boolean rankingOptOut) {
    }

    public record SensitiveUpdate(String currentPassword, String email, String phone) {
    }

    public record DeletionRequest(String currentPassword, String reason) {
    }

    public record DeletionReceipt(String status, Instant deletionRequestedAt, Instant deletionScheduledAt, boolean cancelable) {
    }

    // ------------------------------------------------------------------ leitura
    public UserView me(CurrentUser current) {
        return UserView.of(authorizer.ownAccount(current));
    }

    /** Perfil por id: só a própria pessoa ou ADMIN com papel relido do banco (BOLA/BFLA, 403 uniforme — D-65). */
    public UserView profile(CurrentUser actor, UUID userId) {
        authorizer.requireSelfOrAdmin(actor, userId);
        return UserView.of(load(userId));
    }

    private User load(UUID id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Usuário"));
    }

    // ------------------------------------------------------------------ perfil
    @Transactional
    public UserView update(CurrentUser current, ProfileUpdate cmd, RequestContext ctx) {
        User u = authorizer.ownAccount(current);
        Guard.requireNotDeletionScheduled(u);
        Map<String, Object> fields = new LinkedHashMap<>();
        List<String> changed = new ArrayList<>();
        if (cmd.fullName() != null) {
            String v = cmd.fullName().trim();
            if (v.length() < 3 || v.length() > 160) {
                fields.put("fullName", "Use 3 a 160 caracteres.");
            } else {
                u.setFullName(v);
                changed.add("fullName");
            }
        }
        if (cmd.displayName() != null) {
            String v = cmd.displayName().trim();
            if (v.length() > 80) {
                fields.put("displayName", "Use até 80 caracteres.");
            } else {
                u.setDisplayName(v.isEmpty() ? null : v);
                changed.add("displayName");
            }
        }
        if (cmd.jobTitle() != null) {
            String v = cmd.jobTitle().trim();
            if (v.length() > 120) {
                fields.put("jobTitle", "Use até 120 caracteres.");
            } else {
                u.setJobTitle(v.isEmpty() ? null : v);
                changed.add("jobTitle");
            }
        }
        if (cmd.bio() != null) {
            String v = cmd.bio().trim();
            if (v.length() > 1000) {
                fields.put("bio", "Use até 1000 caracteres.");
            } else {
                u.setBio(v.isEmpty() ? null : v);
                changed.add("bio");
            }
        }
        if (cmd.avatarUrl() != null) {
            // RF3.CA05: a foto só entra pelo upload (POST /api/me/avatar), reprocessada e sem EXIF; aqui só se aceita limpar
            if (cmd.avatarUrl().isBlank()) {
                u.setAvatarUrl(null);
                changed.add("avatarUrl");
            } else {
                fields.put("avatarUrl", "Envie a foto pelo botão Enviar foto; links externos não são aceitos.");
            }
        }
        if (cmd.coverUrl() != null) {
            url(cmd.coverUrl(), "coverUrl", fields).ifPresent(v -> {
                u.setCoverUrl(v);
                changed.add("coverUrl");
            });
        }
        if (cmd.hypeVisibility() != null) {
            try {
                u.setHypeVisibility(HypeVisibility.valueOf(cmd.hypeVisibility().trim().toUpperCase(java.util.Locale.ROOT)));
                changed.add("hypeVisibility");
            } catch (IllegalArgumentException e) {
                fields.put("hypeVisibility", "Use PUBLICO, EMPRESA ou SO_EU.");
            }
        }
        if (cmd.rankingOptOut() != null) {
            u.setRankingOptOut(cmd.rankingOptOut());
            changed.add("rankingOptOut");
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.PROFILE_UPDATED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("fields", changed)));
        return UserView.of(u);
    }

    private static java.util.Optional<String> url(String raw, String field, Map<String, Object> fields) {
        String v = raw.trim();
        if (v.isEmpty()) {
            return java.util.Optional.of("");
        }
        if (v.length() > 500 || !(v.startsWith("https://") || v.startsWith("/"))) {
            fields.put(field, "Use uma URL https:// ou um caminho interno.");
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(v);
    }

    // ------------------------------------------------------------------ dados sensíveis (step-up)
    /** E-mail/telefone exigem a senha atual no mesmo bloqueio do login (RF3.CA02/CA08): 6º erro → 429. */
    @Transactional(noRollbackFor = ApiException.class)
    public UserView updateSensitive(CurrentUser current, SensitiveUpdate cmd, RequestContext ctx) {
        User u = authorizer.confirmOwn(current, identity.reauthenticate(current, cmd.currentPassword(), "dados_sensiveis", ctx));
        Guard.requireNotDeletionScheduled(u);
        Map<String, Object> fields = new LinkedHashMap<>();
        List<String> changed = new ArrayList<>();
        if (cmd.email() != null) {
            String email = EmailHasher.normalize(cmd.email());
            if (!RegistrationService.EMAIL.matcher(email).matches() || email.length() > 320) {
                fields.put("email", "Informe um e-mail válido.");
            } else if (!email.equals(EmailHasher.normalize(u.getEmail()))) {
                String hash = emailHasher.hash(email);
                if (users.existsByEmailHash(hash)) {
                    throw new ApiException("EMAIL_EM_USO", 409, "Este e-mail já está em uso.");
                }
                u.setEmail(email);
                u.setEmailHash(hash);
                u.setEmailVerified(false);
                changed.add("email");
            }
        }
        if (cmd.phone() != null) {
            String phone = cmd.phone().replaceAll("[\\s()-]", "");
            if (phone.isEmpty()) {
                u.setPhone(null);
                changed.add("phone");
            } else if (!RegistrationService.PHONE_E164.matcher(phone).matches()) {
                fields.put("phone", "Informe o telefone no formato internacional (+55…).");
            } else {
                u.setPhone(phone);
                changed.add("phone");
            }
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
        users.save(u);
        if (changed.contains("email")) {
            registration.resendVerification(u.getEmail(), ctx);
        }
        audit.record(AuditEvent.of(u.getId(), AuditActions.SENSITIVE_DATA_UPDATED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("fields", changed, "email", Masking.maskEmail(u.getEmail()))));
        return UserView.of(u);
    }

    // ------------------------------------------------------------------ exclusão (D-18)
    @Transactional(noRollbackFor = ApiException.class)
    public DeletionReceipt requestDeletion(CurrentUser current, DeletionRequest cmd, RequestContext ctx) {
        User u = authorizer.confirmOwn(current, identity.reauthenticate(current, cmd.currentPassword(), "exclusao", ctx));
        if (u.isDeletionScheduled()) {
            throw new ApiException(AuthCodes.EXCLUSAO_AGENDADA, 409, "A exclusão desta conta já está agendada.");
        }
        Instant now = clock.instant();
        u.setStatus(AccountStatus.DELETION_SCHEDULED);
        u.setDeletionRequestedAt(now);
        u.setDeletionScheduledAt(now.plus(DELETION_GRACE));
        u.setDeletionReason(cmd.reason() == null || cmd.reason().isBlank() ? null
                : cmd.reason().trim().substring(0, Math.min(500, cmd.reason().trim().length())));
        users.save(u);
        identity.revokeOtherSessions(u.getId(), current.sessionId());
        audit.record(AuditEvent.of(u.getId(), AuditActions.ACCOUNT_DELETION_REQUESTED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("deletionScheduledAt", u.getDeletionScheduledAt().toString())));
        return new DeletionReceipt(u.getStatus().name(), now, u.getDeletionScheduledAt(), true);
    }

    @Transactional
    public DeletionReceipt cancelDeletion(CurrentUser current, RequestContext ctx) {
        User u = authorizer.ownAccount(current);
        if (!u.isDeletionScheduled()) {
            throw new ApiException(AuthCodes.EXCLUSAO_NAO_AGENDADA, 409, "Não há exclusão agendada para esta conta.");
        }
        if (IdentityService.reactivationExpired(u, clock.instant())) {
            throw new ApiException(AuthCodes.PRAZO_REATIVACAO_ENCERRADO, 409, "O prazo de 30 dias para reativar esta conta terminou.");
        }
        u.setStatus(!u.isEmailVerified() ? AccountStatus.PENDING_EMAIL_VERIFICATION
                : u.getProfileType().requiresValidation() && !u.isVerified() ? AccountStatus.PENDING_VALIDATION : AccountStatus.ACTIVE);
        u.setDeletionRequestedAt(null);
        u.setDeletionScheduledAt(null);
        u.setDeletionReason(null);
        users.save(u);
        audit.record(AuditEvent.of(u.getId(), AuditActions.ACCOUNT_DELETION_CANCELLED, "user", u.getId().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of("status", u.getStatus().name())));
        return new DeletionReceipt(u.getStatus().name(), null, null, false);
    }

    // ------------------------------------------------------------------ preferências
    public UserPreferences preferences(CurrentUser current) {
        authorizer.ownAccount(current);
        return preferences.findByUserId(current.id()).orElseGet(() -> {
            UserPreferences p = new UserPreferences();
            p.setUserId(current.id());
            return p;
        });
    }

    @Transactional
    public UserPreferences updatePreferences(CurrentUser current, UserPreferences cmd, RequestContext ctx) {
        authorizer.ownAccount(current);
        Map<String, Object> fields = new LinkedHashMap<>();
        UserPreferences p = preferences(current);
        if (cmd.getTheme() != null) {
            enumValue(cmd.getTheme(), THEMES, "theme", fields).ifPresent(p::setTheme);
        }
        if (cmd.getLanguage() != null) {
            enumValue(cmd.getLanguage(), LANGUAGES, "language", fields).ifPresent(p::setLanguage);
        }
        if (cmd.getDensity() != null) {
            enumValue(cmd.getDensity(), DENSITIES, "density", fields).ifPresent(p::setDensity);
        }
        if (cmd.getDeskSkin() != null) {
            enumValue(cmd.getDeskSkin(), DESK_SKINS, "deskSkin", fields).ifPresent(p::setDeskSkin);
        }
        if (cmd.getAiModeDefault() != null) {
            enumValue(cmd.getAiModeDefault(), AI_MODES, "aiModeDefault", fields).ifPresent(p::setAiModeDefault);
        }
        if (cmd.getFontScale() != null) {
            if (cmd.getFontScale().compareTo(new BigDecimal("0.50")) < 0 || cmd.getFontScale().compareTo(new BigDecimal("2.00")) > 0) {
                fields.put("fontScale", "Use um fator entre 0.50 e 2.00.");
            } else {
                p.setFontScale(cmd.getFontScale().setScale(2, java.math.RoundingMode.HALF_UP));
            }
        }
        if (cmd.getWipLimit() != 0) {
            if (cmd.getWipLimit() < 1 || cmd.getWipLimit() > 20) {
                fields.put("wipLimit", "Use um limite entre 1 e 20.");
            } else {
                p.setWipLimit(cmd.getWipLimit());
            }
        }
        if (cmd.getTimezone() != null) {
            try {
                p.setTimezone(ZoneId.of(cmd.getTimezone().trim()).getId());
            } catch (java.time.DateTimeException e) {
                fields.put("timezone", "Fuso horário desconhecido.");
            }
        }
        p.setReduceMotion(cmd.isReduceMotion());
        if (cmd.getDefaultCardSkin() != null) {
            p.setDefaultCardSkin(cmd.getDefaultCardSkin().isBlank() ? null : cmd.getDefaultCardSkin().trim());
        }
        if (cmd.getNotificationPrefsJson() != null) {
            p.setNotificationPrefsJson(cmd.getNotificationPrefsJson());
        }
        if (cmd.getDashboardLayoutJson() != null) {
            p.setDashboardLayoutJson(cmd.getDashboardLayoutJson());
        }
        if (!fields.isEmpty()) {
            throw ApiException.unprocessable(ApiException.VALIDACAO, "Revise os campos destacados.", Map.of("fields", fields));
        }
        UserPreferences saved = preferences.save(p);
        audit.record(AuditEvent.of(current.id(), AuditActions.PREFERENCES_UPDATED, "user", current.id().toString(), AuditEvent.OK, ctx.ip(),
                ctx.userAgent(), Map.of()));
        return saved;
    }

    private static java.util.Optional<String> enumValue(String raw, Set<String> allowed, String field, Map<String, Object> fields) {
        String v = raw.trim().toUpperCase(java.util.Locale.ROOT);
        if (!allowed.contains(v)) {
            fields.put(field, "Valor inválido. Use: " + String.join(", ", new java.util.TreeSet<>(allowed)) + ".");
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(v);
    }
}
