package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.LegalProperties;
import br.gov.pr.secid.workstation.application.identity.MailMessage;
import br.gov.pr.secid.workstation.application.identity.PasswordHasher;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RefreshTokenMirrorPort;
import br.gov.pr.secid.workstation.application.identity.RegistrationService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.Session;
import br.gov.pr.secid.workstation.application.identity.SessionPolicy;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.application.identity.VerificationCode;
import br.gov.pr.secid.workstation.application.identity.VerificationCodeRepositoryPort;
import br.gov.pr.secid.workstation.application.media.MemoryMedia;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
import br.gov.pr.secid.workstation.domain.identity.VerificationPurpose;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** RF3.CA01–CA04/CA08/CA19–CA20 com fakes em memória: BOLA, step-up com bloqueio, exclusão agendada e preferências. */
class AccountServiceTest {
    final String password = "Senha-" + UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Map<UUID, User> userRows = new HashMap<>();
    final Map<UUID, UserPreferences> prefRows = new HashMap<>();
    final List<AuditEvent> audited = new ArrayList<>();
    final List<MailMessage> mails = new ArrayList<>();
    final InMemoryRateLimit rateLimit = new InMemoryRateLimit();
    final InMemorySessionStore sessions = new InMemorySessionStore();
    final EmailHasher emailHasher = e -> "eh:" + Hashing.sha256(e);
    final PasswordHasher hasher = new PasswordHasher() {
        public String hash(String raw) {
            return "h:" + raw;
        }

        public boolean matches(String raw, String enc) {
            return ("h:" + raw).equals(enc);
        }

        public boolean needsRehash(String enc) {
            return false;
        }
    };
    AccountService account;
    IdentityService identity;
    User maria;
    CurrentUser me;

    final UserRepositoryPort users = new UserRepositoryPort() {
        public Optional<User> findById(UUID id) {
            return Optional.ofNullable(userRows.get(id));
        }

        public Optional<User> findByUsername(String u) {
            return userRows.values().stream().filter(x -> u.equals(x.getUsername())).findFirst();
        }

        public Optional<User> findByEmailHash(String h) {
            return userRows.values().stream().filter(x -> h.equals(x.getEmailHash())).findFirst();
        }

        public Optional<User> findByOidc(String i, String s) {
            return Optional.empty();
        }

        public boolean existsByUsername(String u) {
            return findByUsername(u).isPresent();
        }

        public boolean existsByEmailHash(String h) {
            return findByEmailHash(h).isPresent();
        }

        public long countByRole(Role r) {
            return 0;
        }

        public java.util.List<User> searchInCompany(UUID companyId, String query, int limit) {
            return java.util.List.of();
        }

        public java.util.List<User> findDeletionDue(java.time.Instant now, int limit) {
            return userRows.values().stream().filter(u -> u.isDeletionScheduled() && !u.getDeletionScheduledAt().isAfter(now)).limit(limit).toList();
        }

        public User save(User u) {
            if (u.getId() == null) {
                u.setId(UUID.randomUUID());
            }
            userRows.put(u.getId(), u);
            return u;
        }
    };
    final UserPreferencesRepositoryPort prefs = new UserPreferencesRepositoryPort() {
        public Optional<UserPreferences> findByUserId(UUID id) {
            return Optional.ofNullable(prefRows.get(id));
        }

        public UserPreferences save(UserPreferences p) {
            prefRows.put(p.getUserId(), p);
            return p;
        }
    };
    final VerificationCodeRepositoryPort codes = new VerificationCodeRepositoryPort() {
        final Map<UUID, VerificationCode> rows = new HashMap<>();

        public VerificationCode save(VerificationCode c) {
            rows.put(c.id(), c);
            return c;
        }

        public Optional<VerificationCode> findByCodeHash(String h) {
            return rows.values().stream().filter(c -> c.codeHash().equals(h)).findFirst();
        }

        public List<VerificationCode> findOpen(UUID u, VerificationPurpose p) {
            return rows.values().stream().filter(c -> c.userId().equals(u) && c.purpose() == p && c.consumedAt() == null).toList();
        }
    };

    @BeforeEach
    void setUp() {
        AuditLogPort audit = audited::add;
        TokenIssuerPort tokens = new TokenIssuerPort() {
            public String issueAccessToken(User u, UUID sid) {
                return "jwt";
            }

            public Duration accessTokenTtl() {
                return Duration.ofMinutes(15);
            }
        };
        RefreshTokenMirrorPort mirror = new RefreshTokenMirrorPort() {
            public void saved(RefreshRecord r, RequestContext c) {
            }

            public void revoked(String h, Instant at) {
            }

            public void familyRevoked(UUID f, Instant at) {
            }

            public void userRevoked(UUID u, UUID k, Instant at) {
            }
        };
        identity = new IdentityService(users, emailHasher, hasher, rateLimit, sessions, mirror, tokens, audit, SessionPolicy.defaults(), Clock.systemUTC());
        RegistrationService registration = new RegistrationService(users, prefs, codes, emailHasher, hasher, rateLimit, mails::add, audit,
                identity, LegalProperties.defaults(), Clock.systemUTC(),
                new br.gov.pr.secid.workstation.application.identity.AccountInserter(users, prefs));
        account = new AccountService(users, prefs, emailHasher, identity, registration, audit, Clock.systemUTC(),
                new ResourceAuthorizer(users, Optional.empty()));
        maria = new User();
        maria.setUsername("maria");
        maria.setFullName("Maria da Silva");
        maria.setEmail("maria@exemplo.gov.br");
        maria.setEmailHash(emailHasher.hash("maria@exemplo.gov.br"));
        maria.setEmailVerified(true);
        maria.setPasswordHash(hasher.hash(password));
        maria.setProfileType(ProfileType.EMPREGADO);
        maria.setStatus(AccountStatus.ACTIVE);
        users.save(maria);
        Session s = identity.login(new IdentityService.LoginCommand("maria", password, false, null, null), ctx);
        me = new CurrentUser(maria.getId(), Role.USER, s.sessionId());
    }

    private List<String> actions() {
        return audited.stream().map(AuditEvent::action).toList();
    }

    private User persisted(String username, Role role) {
        User u = new User();
        u.setUsername(username);
        u.setFullName(username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setEmailHash(emailHasher.hash(username + "@exemplo.gov.br"));
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(AccountStatus.ACTIVE);
        u.setRole(role);
        return users.save(u);
    }

    @Test
    void perfilPorIdSoParaODonoOuAdmin() {
        AuthorizationTrail.clear();
        assertThat(account.me(me).username()).isEqualTo("maria");
        assertThat(AuthorizationTrail.last()).isEqualTo("SELF");
        assertThat(account.profile(me, maria.getId()).id()).isEqualTo(maria.getId());
        CurrentUser outro = new CurrentUser(persisted("joao", Role.USER).getId(), Role.USER, UUID.randomUUID());
        ApiException e = catchThrowableOfType(ApiException.class, () -> account.profile(outro, maria.getId()));
        assertThat(e.status()).isEqualTo(403);
        assertThat(e.code()).isEqualTo(ApiException.ACESSO_NEGADO);
        assertThat(catchThrowableOfType(ApiException.class, () -> account.profile(outro, UUID.randomUUID())).status())
                .as("id inexistente recebe o mesmo 403 — sem oráculo de existência").isEqualTo(403);
        CurrentUser admin = new CurrentUser(persisted("chefia", Role.ADMIN).getId(), Role.ADMIN, UUID.randomUUID());
        assertThat(account.profile(admin, maria.getId()).username()).isEqualTo("maria");
        assertThat(catchThrowableOfType(ApiException.class, () -> account.profile(admin, UUID.randomUUID())).status()).isEqualTo(404);
        AuthorizationTrail.clear();
    }

    @Test
    void papelAdminDoTokenSemAdminNoBancoNaoAbreContaDeTerceiro() {
        // BFLA (D-66): token emitido quando a pessoa era ADMIN, rebaixada depois — o papel relido do banco manda
        CurrentUser rebaixado = new CurrentUser(persisted("exadmin", Role.USER).getId(), Role.ADMIN, UUID.randomUUID());
        assertThat(catchThrowableOfType(ApiException.class, () -> account.profile(rebaixado, maria.getId())).status()).isEqualTo(403);
        // e o contrário também: ADMIN no banco com token de USER não ganha privilégio
        CurrentUser tokenUser = new CurrentUser(persisted("promovido", Role.ADMIN).getId(), Role.USER, UUID.randomUUID());
        assertThat(catchThrowableOfType(ApiException.class, () -> account.profile(tokenUser, maria.getId())).status()).isEqualTo(403);
        CurrentUser fantasma = new CurrentUser(UUID.randomUUID(), Role.ADMIN, UUID.randomUUID());
        assertThat(catchThrowableOfType(ApiException.class, () -> account.profile(fantasma, maria.getId())).status())
                .as("conta que não existe mais não age").isEqualTo(401);
        assertThat(catchThrowableOfType(ApiException.class, () -> account.preferences(fantasma)).status()).isEqualTo(404);
    }

    @Test
    void atualizaCamposNaoSensiveisComValidacaoEAuditoria() {
        UserView v = account.update(me, new AccountService.ProfileUpdate("Maria S.", "Mari", "Analista", "oi", "", "", "PUBLICO", true), ctx);
        assertThat(v.fullName()).isEqualTo("Maria S.");
        assertThat(v.avatarUrl()).as("limpar a foto pelo PATCH continua valendo").isNull();
        ApiException external = catchThrowableOfType(ApiException.class, () -> account.update(me,
                new AccountService.ProfileUpdate(null, null, null, null, "https://cdn.exemplo.com/rastreio.png", null, null, null), ctx));
        assertThat(((Map<?, ?>) external.details().get("fields")).keySet().stream().map(String::valueOf).toList())
                .as("RF3.CA05: foto externa não entra mais").containsExactly("avatarUrl");
        assertThat(v.displayName()).isEqualTo("Mari");
        assertThat(v.hypeVisibility()).isEqualTo("PUBLICO");
        assertThat(v.rankingOptOut()).isTrue();
        assertThat(v.coverUrl()).isEmpty();
        ApiException e = catchThrowableOfType(ApiException.class, () -> account.update(me,
                new AccountService.ProfileUpdate("ab", "x".repeat(81), "x".repeat(121), "x".repeat(1001), "http://inseguro", "javascript:x", "TODOS", null), ctx));
        assertThat(((Map<?, ?>) e.details().get("fields")).keySet().stream().map(String::valueOf).toList())
                .containsExactlyInAnyOrder("fullName", "displayName", "jobTitle", "bio", "avatarUrl", "coverUrl", "hypeVisibility");
        assertThat(actions()).contains(AuditActions.PROFILE_UPDATED);
        assertThat(audited.toString()).doesNotContain(password);
    }

    @Test
    void dadosSensiveisExigemSenhaAtualNoMesmoBloqueioDoLogin() {
        for (int i = 0; i < 5; i++) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> account.updateSensitive(me,
                    new AccountService.SensitiveUpdate("errada", "nova@exemplo.gov.br", null), ctx));
            assertThat(e.status()).isEqualTo(401);
            assertThat(e.code()).isEqualTo(AuthCodes.REAUTENTICACAO_FALHOU);
        }
        ApiException sixth = catchThrowableOfType(ApiException.class, () -> account.updateSensitive(me,
                new AccountService.SensitiveUpdate(password, "nova@exemplo.gov.br", null), ctx));
        assertThat(sixth.status()).isEqualTo(429);
        assertThat(sixth.code()).isEqualTo(AuthCodes.MUITAS_TENTATIVAS);
        assertThat(maria.getEmail()).isEqualTo("maria@exemplo.gov.br");
        identity.clearLockout(maria.getId());
        UserView v = account.updateSensitive(me, new AccountService.SensitiveUpdate(password, "Nova@Exemplo.gov.br", "+55 (41) 99999-0000"), ctx);
        assertThat(v.email()).isEqualTo("nova@exemplo.gov.br");
        assertThat(v.emailVerified()).isFalse();
        assertThat(v.phone()).isEqualTo("+5541999990000");
        assertThat(mails).hasSize(1);
        assertThat(mails.get(0).template()).isEqualTo("email-verification");
        assertThat(actions()).contains(AuditActions.SENSITIVE_DATA_UPDATED);
        ApiException invalid = catchThrowableOfType(ApiException.class, () -> account.updateSensitive(me,
                new AccountService.SensitiveUpdate(password, "nao-email", "123"), ctx));
        assertThat(((Map<?, ?>) invalid.details().get("fields")).keySet().stream().map(String::valueOf).toList()).containsExactlyInAnyOrder("email", "phone");
        User outra = new User();
        outra.setUsername("outra");
        outra.setEmail("ocupado@exemplo.gov.br");
        outra.setEmailHash(emailHasher.hash("ocupado@exemplo.gov.br"));
        outra.setProfileType(ProfileType.EMPREGADO);
        users.save(outra);
        assertThat(catchThrowableOfType(ApiException.class, () -> account.updateSensitive(me,
                new AccountService.SensitiveUpdate(password, "ocupado@exemplo.gov.br", null), ctx)).status()).isEqualTo(409);
    }

    @Test
    void exclusaoAgendaTrintaDiasBloqueiaEdicaoECancelaVoltandoAoStatus() {
        Session outra = identity.login(new IdentityService.LoginCommand("maria", password, true, "cel", null), ctx);
        ApiException wrong = catchThrowableOfType(ApiException.class, () -> account.requestDeletion(me, new AccountService.DeletionRequest("x", null), ctx));
        assertThat(wrong.code()).isEqualTo(AuthCodes.REAUTENTICACAO_FALHOU);
        AccountService.DeletionReceipt r = account.requestDeletion(me, new AccountService.DeletionRequest(password, "motivo"), ctx);
        assertThat(r.status()).isEqualTo("DELETION_SCHEDULED");
        assertThat(Duration.between(r.deletionRequestedAt(), r.deletionScheduledAt())).isEqualTo(Duration.ofDays(30));
        assertThat(maria.getStatus()).isEqualTo(AccountStatus.DELETION_SCHEDULED);
        assertThat(identity.sessionActive(outra.sessionId())).as("outras sessões encerradas").isFalse();
        assertThat(identity.sessionActive(me.sessionId())).as("a atual continua para cancelar").isTrue();
        ApiException blocked = catchThrowableOfType(ApiException.class,
                () -> account.update(me, new AccountService.ProfileUpdate("Nome Novo", null, null, null, null, null, null, null), ctx));
        assertThat(blocked.status()).isEqualTo(403);
        assertThat(blocked.code()).isEqualTo(AuthCodes.EXCLUSAO_AGENDADA);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> account.requestDeletion(me, new AccountService.DeletionRequest(password, null), ctx)).status()).isEqualTo(409);
        AccountService.DeletionReceipt c = account.cancelDeletion(me, ctx);
        assertThat(c.status()).isEqualTo("ACTIVE");
        assertThat(maria.getDeletionScheduledAt()).isNull();
        assertThat(catchThrowableOfType(ApiException.class, () -> account.cancelDeletion(me, ctx)).code()).isEqualTo(AuthCodes.EXCLUSAO_NAO_AGENDADA);
        assertThat(actions()).contains(AuditActions.ACCOUNT_DELETION_REQUESTED, AuditActions.ACCOUNT_DELETION_CANCELLED);
        maria.setProfileType(ProfileType.EMPRESA);
        account.requestDeletion(me, new AccountService.DeletionRequest(password, null), ctx);
        assertThat(account.cancelDeletion(me, ctx).status()).isEqualTo("PENDING_VALIDATION");
    }

    @Test
    void depoisDosTrintaDiasNaoReativaNaoEntraEAContaEAnonimizada() {
        account.requestDeletion(me, new AccountService.DeletionRequest(password, "motivo pessoal"), ctx);
        assertThat(identity.login(new IdentityService.LoginCommand("maria", password, false, null, null), ctx).accessToken())
                .as("dentro do prazo a pessoa entra para reativar").isNotBlank();
        ResourceAuthorizer authz = new ResourceAuthorizer(users, Optional.empty());
        MemoryMedia media = new MemoryMedia();
        AvatarService avatars = new AvatarService(users, authz, media.inspector, media.service(authz), audited::add);
        AccountAnonymizer anonymizer = new AccountAnonymizer(users, emailHasher, identity, audited::add, avatars, Clock.systemUTC());
        assertThat(anonymizer.anonymizeDue()).as("ainda no prazo").isZero();

        maria.setDeletionScheduledAt(Instant.now().minusSeconds(1));
        assertThat(catchThrowableOfType(ApiException.class, () -> account.cancelDeletion(me, ctx)).code()).isEqualTo(AuthCodes.PRAZO_REATIVACAO_ENCERRADO);
        ApiException login = catchThrowableOfType(ApiException.class,
                () -> identity.login(new IdentityService.LoginCommand("maria", password, false, null, null), ctx));
        assertThat(login.status()).isEqualTo(403);
        assertThat(login.code()).isEqualTo(AuthCodes.CONTA_INDISPONIVEL);

        assertThat(anonymizer.anonymizeDue()).isEqualTo(1);
        assertThat(maria.getStatus()).isEqualTo(AccountStatus.ANONYMIZED);
        assertThat(maria.getUsername()).startsWith("removido-");
        assertThat(maria.getFullName()).isEqualTo("Conta removida");
        assertThat(maria.getEmail()).doesNotContain("maria@").endsWith("@anonimizado.invalid");
        assertThat(maria.getPasswordHash()).isNull();
        assertThat(maria.getDeletionReason()).isNull();
        assertThat(maria.getAnonymizedAt()).isNotNull();
        assertThat(identity.sessionActive(me.sessionId())).as("todas as sessões caem").isFalse();
        assertThat(anonymizer.anonymizeDue()).as("idempotente").isZero();
        assertThat(actions()).contains(AuditActions.ACCOUNT_ANONYMIZED);
    }

    @Test
    void preferenciasNascemComOsPadroesDoV2ESaoValidadas() {
        UserPreferences p = account.preferences(me);
        assertThat(p.getTheme()).isEqualTo("AUTO");
        assertThat(p.getWipLimit()).isEqualTo(3);
        assertThat(p.getTimezone()).isEqualTo("America/Sao_Paulo");
        UserPreferences cmd = new UserPreferences();
        cmd.setTheme("escuro");
        cmd.setLanguage("EN");
        cmd.setDensity("COMPACTA");
        cmd.setDeskSkin("CORTICA");
        cmd.setAiModeDefault("AVANCADO");
        cmd.setFontScale(new BigDecimal("1.255"));
        cmd.setWipLimit(5);
        cmd.setTimezone("Europe/Lisbon");
        cmd.setReduceMotion(true);
        cmd.setDefaultCardSkin(" papel ");
        UserPreferences saved = account.updatePreferences(me, cmd, ctx);
        assertThat(saved.getTheme()).isEqualTo("ESCURO");
        assertThat(saved.getFontScale()).isEqualTo(new BigDecimal("1.26"));
        assertThat(saved.getWipLimit()).isEqualTo(5);
        assertThat(saved.getTimezone()).isEqualTo("Europe/Lisbon");
        assertThat(saved.isReduceMotion()).isTrue();
        assertThat(saved.getDefaultCardSkin()).isEqualTo("papel");
        assertThat(prefRows).containsKey(maria.getId());
        UserPreferences bad = new UserPreferences();
        bad.setTheme("NEON");
        bad.setLanguage("FR");
        bad.setDensity("X");
        bad.setDeskSkin("Y");
        bad.setAiModeDefault("Z");
        bad.setFontScale(new BigDecimal("3"));
        bad.setWipLimit(21);
        bad.setTimezone("Marte/Olympus");
        ApiException e = catchThrowableOfType(ApiException.class, () -> account.updatePreferences(me, bad, ctx));
        assertThat(((Map<?, ?>) e.details().get("fields")).keySet().stream().map(String::valueOf).toList())
                .containsExactlyInAnyOrder("theme", "language", "density", "deskSkin", "aiModeDefault", "fontScale", "wipLimit", "timezone");
        assertThat(actions()).contains(AuditActions.PREFERENCES_UPDATED);
    }
}
