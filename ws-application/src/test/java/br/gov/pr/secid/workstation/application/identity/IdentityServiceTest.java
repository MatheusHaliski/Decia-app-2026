package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEntry;
import br.gov.pr.secid.workstation.application.audit.AuditPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.ratelimit.InMemoryRateLimit;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.identity.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Login sem oráculo e bloqueio atômico (SEG RN49.02/RN49.03, CA01–CA03): 401 genérico e mesmo caminho para conta
 * inexistente, senha errada e conta bloqueada; reserva antes do hash; 40 pedidos em paralelo avaliam no máximo 5
 * senhas reais; 403/2FA só após a senha certa; reconferência com 429.
 */
class IdentityServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");
    private static final String SENHA = "Senha-certa-1";

    /** Hasher determinístico e barato que conta quantas vezes comparou contra um hash REAL (não o falso). */
    static final class CountingHasher implements PasswordHasherPort {
        final AtomicInteger realEvaluations = new AtomicInteger();
        final AtomicInteger dummyEvaluations = new AtomicInteger();
        boolean weakHashes;

        @Override
        public String hash(CharSequence raw) {
            return "h:" + raw;
        }

        @Override
        public boolean matches(CharSequence raw, String encoded) {
            if (encoded.startsWith("h:dummy-")) {
                dummyEvaluations.incrementAndGet();
                return false;
            }
            realEvaluations.incrementAndGet();
            return encoded.equals("h:" + raw);
        }

        @Override
        public boolean needsRehash(String encoded) {
            return weakHashes;
        }
    }

    /** Auditoria em memória. */
    static final class RecordingAudit implements AuditPort {
        final List<AuditEntry> entries = new CopyOnWriteArrayList<>();

        @Override
        public void record(AuditEntry entry) {
            entries.add(entry);
        }

        AuditEntry last() {
            return entries.get(entries.size() - 1);
        }
    }

    private final UserRepository users = mock(UserRepository.class);
    private final CountingHasher hasher = new CountingHasher();
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final InMemoryRateLimit rateLimit = new InMemoryRateLimit(clock, 1_000);
    private final RecordingAudit audit = new RecordingAudit();
    private IdentityService service;
    private User maria;

    @BeforeEach
    void setUp() throws Exception {
        service = new IdentityService(users, hasher, rateLimit, audit, clock);
        maria = user("maria", "maria.silva@pr.gov.br", AccountStatus.ACTIVE);
        when(users.findByEmailHash(anyString())).thenReturn(Optional.empty());
        when(users.findByUsernameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(users.findByEmailHash(Identifiers.emailHash("maria.silva@pr.gov.br"))).thenReturn(Optional.of(maria));
        when(users.findByUsernameIgnoreCase("maria")).thenReturn(Optional.of(maria));
        when(users.findById(maria.getId())).thenReturn(Optional.of(maria));
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private User user(String username, String email, AccountStatus status) throws Exception {
        User u = new User();
        Field id = u.getClass().getSuperclass().getDeclaredField("id");
        id.setAccessible(true);
        id.set(u, UUID.randomUUID());
        u.setUsername(username);
        u.setFullName("Maria Silva");
        u.setEmailEnc("enc");
        u.setEmailHash(Identifiers.emailHash(email));
        u.setPasswordHash(hasher.hash(SENHA));
        u.setProfileType(ProfileType.EMPREGADO);
        u.setRole(Role.USER);
        u.setStatus(status);
        return u;
    }

    private static ApiException loginFails(IdentityService s, String identifier, String senha) {
        try {
            s.login(new LoginCommand(identifier, senha), "203.0.113.9", "ua");
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("esperava falha de login");
    }

    @Test
    void contaInexistenteRecebe401GenericoEAvaliaOHashFalso() {
        ApiException e = loginFails(service, "ninguem@pr.gov.br", SENHA);
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        assertThat(hasher.dummyEvaluations.get()).isEqualTo(1);
        assertThat(hasher.realEvaluations.get()).isZero();
        assertThat(audit.last().action()).isEqualTo(AuditActions.LOGIN_FALHA);
        assertThat(audit.last().actorId()).isNull();
        assertThat(audit.last().metadata()).containsEntry("reason", "usuario_inexistente");
        // identificador vazio e comando nulo seguem o mesmo caminho
        assertThat(loginFails(service, "   ", SENHA).code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        assertThatThrownBy(() -> service.login(null, "ip", "ua")).isInstanceOf(ApiException.class);
        assertThat(hasher.realEvaluations.get()).isZero();
    }

    @Test
    void senhaErradaRecebeOMesmo401EAReservaFica() {
        ApiException e = loginFails(service, "maria", "errada");
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        assertThat(e.getMessage()).isEqualTo(loginFails(service, "ninguem", "x").getMessage());
        assertThat(service.loginFailStatus(maria).used()).isEqualTo(1);
        assertThat(audit.entries.get(0).action()).isEqualTo(AuditActions.LOGIN_FALHA);
        assertThat(audit.entries.get(0).actorId()).isEqualTo(maria.getId());
        assertThat(audit.entries.get(0).metadata()).containsEntry("reason", "senha");
    }

    @Test
    void sextaTentativaBloqueiaENemASenhaCertaEntraSemAvaliarOHashReal() {
        for (int i = 0; i < 5; i++) {
            loginFails(service, "maria", "errada-" + i);
        }
        assertThat(hasher.realEvaluations.get()).isEqualTo(5);
        ApiException e = loginFails(service, "Maria.Silva@PR.gov.br", SENHA);   // senha certa, conta bloqueada
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        assertThat(hasher.realEvaluations.get()).as("bloqueada: só o hash falso é avaliado").isEqualTo(5);
        assertThat(hasher.dummyEvaluations.get()).isEqualTo(1);
        assertThat(audit.last().action()).isEqualTo(AuditActions.LOGIN_BLOQUEADO_TENTATIVAS);
        assertThat(audit.last().result()).isEqualTo(AuditEntry.NEGADO);
        assertThat(audit.last().metadata()).containsKey("resetAt");
        assertThat(service.loginFailStatus(maria).used()).isEqualTo(6);
        assertThat(maria.getLastLoginAt()).isNull();
    }

    @Test
    void senhaCertaDevolveAReservaZeraOBaldeEAudita() {
        loginFails(service, "maria", "errada");
        loginFails(service, "maria", "errada");
        AuthenticatedUser me = service.login(new LoginCommand("maria", SENHA), "203.0.113.9", "ua");
        assertThat(me.id()).isEqualTo(maria.getId());
        assertThat(me.username()).isEqualTo("maria");
        assertThat(me.role()).isEqualTo(Role.USER);
        assertThat(me.profileType()).isEqualTo(ProfileType.EMPREGADO);
        assertThat(service.loginFailStatus(maria).used()).isZero();
        assertThat(maria.getLastLoginAt()).isEqualTo(NOW);
        assertThat(maria.getPasswordHash()).isEqualTo("h:" + SENHA);
        assertThat(audit.last().action()).isEqualTo(AuditActions.LOGIN_OK);
        assertThat(audit.last().result()).isEqualTo(AuditEntry.OK);
        // login por e-mail com maiúsculas e espaços também encontra a conta
        assertThat(service.login(new LoginCommand("  MARIA.silva@pr.gov.br ", SENHA), "ip", "ua").id()).isEqualTo(maria.getId());
    }

    @Test
    void hashComParametrosFracosERefeitoNoLogin() {
        hasher.weakHashes = true;
        maria.setPasswordHash("h:" + SENHA);
        service.login(new LoginCommand("maria", SENHA), "ip", "ua");
        assertThat(maria.getPasswordHash()).isEqualTo("h:" + SENHA);   // refeito com a senha certa (hasher determinístico)
        assertThat(hasher.realEvaluations.get()).isEqualTo(1);
    }

    @Test
    void statusDaContaSoAparecemDepoisDaSenhaCerta() throws Exception {
        for (AccountStatus status : AccountStatus.values()) {
            if (status.canLogin()) {
                continue;
            }
            User u = user("u-" + status.name().toLowerCase(), status.name().toLowerCase() + "@pr.gov.br", status);
            when(users.findByUsernameIgnoreCase(u.getUsername())).thenReturn(Optional.of(u));
            assertThat(loginFails(service, u.getUsername(), "errada").status()).as("%s com senha errada", status).isEqualTo(401);
            ApiException e = loginFails(service, u.getUsername(), SENHA);
            assertThat(e.status()).as("%s com senha certa", status).isEqualTo(403);
            assertThat(audit.last().result()).isEqualTo(AuditEntry.NEGADO);
        }
        assertThat(loginFails(service, "u-pending_email_verification", SENHA).code()).isEqualTo(IdentityService.EMAIL_NAO_VERIFICADO);
        assertThat(loginFails(service, "u-pending_validation", SENHA).code()).isEqualTo(IdentityService.PERFIL_EM_VALIDACAO);
        assertThat(loginFails(service, "u-suspended", SENHA).code()).isEqualTo(IdentityService.CONTA_INDISPONIVEL);
        assertThat(loginFails(service, "u-deletion_scheduled", SENHA).code()).isEqualTo(IdentityService.CONTA_INDISPONIVEL);
        assertThat(loginFails(service, "u-anonymized", SENHA).code()).isEqualTo(IdentityService.CONTA_INDISPONIVEL);
        assertThat(IdentityService.statusDenial(null)).isNull();
        assertThat(IdentityService.statusDenial(AccountStatus.ACTIVE)).isNull();
    }

    @Test
    void contaSemSenhaLocalSegueOCaminhoDeContaInexistente() {
        maria.setPasswordHash(null);     // conta só OIDC (RF2)
        ApiException e = loginFails(service, "maria", SENHA);
        assertThat(e.code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        assertThat(hasher.dummyEvaluations.get()).isEqualTo(1);
        assertThat(audit.last().actorId()).isNull();
    }

    @Test
    void doisFatoresSoDepoisDaSenhaCerta() {
        maria.setTwoFactorEnabled(true);
        assertThat(loginFails(service, "maria", "errada").code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
        ApiException e = loginFails(service, "maria", SENHA);
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(IdentityService.DOIS_FATORES_NECESSARIO);
        assertThat(service.loginFailStatus(maria).used()).as("senha certa devolveu só a própria reserva; a falha anterior fica").isEqualTo(1);
    }

    @Test
    void quarentaLoginsEmParaleloAvaliamNoMaximoCincoSenhasReais() throws Exception {
        int pedidos = 40;
        ExecutorService pool = Executors.newFixedThreadPool(pedidos);
        try {
            CountDownLatch largada = new CountDownLatch(1);
            List<Future<ApiException>> futures = new ArrayList<>();
            for (int i = 0; i < pedidos; i++) {
                int n = i;
                futures.add(pool.submit(() -> {
                    largada.await();
                    return loginFails(service, "maria", "chute-" + n);
                }));
            }
            largada.countDown();
            for (Future<ApiException> f : futures) {
                ApiException e = f.get(30, TimeUnit.SECONDS);
                assertThat(e.status()).isEqualTo(401);                     // nenhum 500, nenhum código diferente
                assertThat(e.code()).isEqualTo(IdentityService.CREDENCIAIS_INVALIDAS);
            }
            assertThat(hasher.realEvaluations.get()).as("senhas avaliadas contra o hash real").isLessThanOrEqualTo(5);
            assertThat(hasher.realEvaluations.get() + hasher.dummyEvaluations.get())
                    .as("todo pedido avaliou algum hash (mesmo tempo)").isEqualTo(pedidos);
            assertThat(service.loginFailStatus(maria).used()).isEqualTo(pedidos);
            assertThat(audit.entries).hasSize(pedidos);
            assertThat(audit.entries.stream().filter(a -> a.action().equals(AuditActions.LOGIN_BLOQUEADO_TENTATIVAS)).count())
                    .isEqualTo(pedidos - hasher.realEvaluations.get());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void reconferenciaDeSenhaUsaAMesmaReservaEDa429NaSexta() {
        for (int i = 0; i < 5; i++) {
            ApiException e = catchApi(() -> service.reauthenticate(maria.getId(), "errada", "ip", "ua"));
            assertThat(e.status()).isEqualTo(401);
            assertThat(e.code()).isEqualTo(IdentityService.SENHA_ATUAL_INCORRETA);
        }
        ApiException blocked = catchApi(() -> service.reauthenticate(maria.getId(), SENHA, "ip", "ua"));
        assertThat(blocked.status()).isEqualTo(429);
        assertThat(blocked.code()).isEqualTo(IdentityService.MUITAS_TENTATIVAS);
        assertThat(blocked.details()).containsEntry("retryAfterSeconds", IdentityService.LOCK_WINDOW.toSeconds());
        assertThat(audit.last().action()).isEqualTo(AuditActions.REAUTH_FALHA);
        assertThat(audit.last().result()).isEqualTo(AuditEntry.NEGADO);
        assertThat(hasher.realEvaluations.get()).isEqualTo(5);
        // sessão de conta inexistente
        assertThat(catchApi(() -> service.reauthenticate(UUID.randomUUID(), SENHA, "ip", "ua")).status()).isEqualTo(401);
    }

    @Test
    void reconferenciaCertaDevolveAReserva() {
        catchApi(() -> service.reauthenticate(maria.getId(), "errada", "ip", "ua"));
        service.reauthenticate(maria.getId(), SENHA, "ip", "ua");
        assertThat(service.loginFailStatus(maria).used()).as("devolveu a própria reserva; a errada anterior fica").isEqualTo(1);
        assertThat(audit.last().action()).isEqualTo(AuditActions.REAUTH_OK);
        assertThat(catchApi(() -> service.reauthenticate(maria.getId(), null, "ip", "ua")).code()).isEqualTo(IdentityService.SENHA_ATUAL_INCORRETA);
        assertThat(service.loginFailStatus(maria).used()).isEqualTo(2);
    }

    @Test
    void identificadoresEComandoNaoVazamSegredos() {
        assertThat(Identifiers.normalize("  Maria.Silva@PR.gov.br ")).isEqualTo("maria.silva@pr.gov.br");
        assertThat(Identifiers.normalize(null)).isEmpty();
        assertThat(Identifiers.looksLikeEmail("maria@x")).isTrue();
        assertThat(Identifiers.looksLikeEmail("@x")).isFalse();
        assertThat(Identifiers.looksLikeEmail("maria@")).isFalse();
        assertThat(Identifiers.emailHash("Maria@PR.gov.br")).isEqualTo(Identifiers.emailHash("maria@pr.gov.br")).hasSize(64);
        assertThat(new LoginCommand("maria.silva@pr.gov.br", "segredo").toString()).doesNotContain("segredo").contains("m***@p***.br");
        assertThat(new LoginCommand(null, null).toString()).contains("null");
    }

    private static ApiException catchApi(Runnable r) {
        try {
            r.run();
        } catch (ApiException e) {
            return e;
        }
        return null;
    }
}
