package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** RF2.CA07 (sem oráculo), CA08 (bloqueio atômico antes do hash), CA09 (reconferência), CA04 (reuso), CA14 (auditoria sem segredo). */
class IdentityServiceTest {
    /** Senha e refresh de teste gerados por execução — nada fixo no repositório. */
    final String password = "pw-" + UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final Fakes.SpyHasher hasher = new Fakes.SpyHasher();
    final Fakes.Audit audit = new Fakes.Audit();
    final InMemoryRateLimit rateLimit = new InMemoryRateLimit();
    final InMemorySessionStore sessions = new InMemorySessionStore();
    /** Relógio controlável: a janela de tolerância ao reuso (D-140) depende do tempo entre rotação e reuso. */
    final MutableClock clock = new MutableClock(Instant.now());
    IdentityService identity;
    User maria;

    static final class MutableClock extends Clock {
        private volatile Instant now;

        MutableClock(Instant start) {
            this.now = start;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    @BeforeEach
    void setUp() {
        identity = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, sessions, Fakes.NO_MIRROR, Fakes.TOKENS,
                audit, SessionPolicy.defaults(), clock);
        maria = users.add(Fakes.user("maria.silva", "Maria.Silva@Exemplo.gov.br", hasher.hash(password)));
        hasher.matchesCalls.set(0);
    }

    private ApiException login(String identifier, String pw) {
        return catchThrowableOfType(ApiException.class, () -> identity.login(new IdentityService.LoginCommand(identifier, pw, false, null, null), ctx));
    }

    @Test
    void contaInexistenteSenhaErradaEContaBloqueadaRespondemOMesmo401() {
        ApiException inexistente = login("ninguem@exemplo.gov.br", password);
        assertThat(hasher.matchesCalls.get()).as("hash falso avaliado para conta inexistente").isEqualTo(1);
        ApiException senhaErrada = login("maria.silva", "errada-" + password);
        for (int i = 0; i < 4; i++) {
            login("maria.silva", "errada-" + password);
        }
        ApiException bloqueadaComSenhaCerta = login("MARIA.SILVA", password);
        for (ApiException e : List.of(inexistente, senhaErrada, bloqueadaComSenhaCerta)) {
            assertThat(e.status()).isEqualTo(401);
            assertThat(e.code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
            assertThat(e.getMessage()).isEqualTo(inexistente.getMessage());
            assertThat(e.details()).isEmpty();
        }
        assertThat(audit.actions()).contains(AuditActions.LOGIN_FALHA, AuditActions.LOGIN_BLOQUEADO_TENTATIVAS)
                .doesNotContain(AuditActions.LOGIN_OK);
        assertThat(audit.dump()).contains("usuario_inexistente").contains("m***@e***.br").doesNotContain("Maria.Silva@");
    }

    @Test
    void contaIndisponivelEDoisFatoresSoAparecemDepoisDaSenhaCertaEForaDoBloqueio() {
        maria.setStatus(AccountStatus.SUSPENDED);
        assertThat(login("maria.silva", "errada-" + password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        ApiException suspensa = login("maria.silva", password);
        assertThat(suspensa.status()).isEqualTo(403);
        assertThat(suspensa.code()).isEqualTo(AuthCodes.CONTA_INDISPONIVEL);

        maria.setStatus(AccountStatus.ACTIVE);
        maria.setTwoFactorEnabled(true);
        assertThat(login("maria.silva", "errada-" + password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        ApiException dois = login("maria.silva", password);
        assertThat(dois.status()).isEqualTo(401);
        assertThat(dois.code()).isEqualTo(AuthCodes.DOIS_FATORES_NECESSARIO);
        assertThat(dois.details()).containsEntry("twoFactorRequired", true);

        // bloqueada: nem o 403 nem o 2FA vazam
        for (int i = 0; i < 5; i++) {
            login("maria.silva", "x" + i);
        }
        assertThat(login("maria.silva", password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        maria.setTwoFactorEnabled(false);
        maria.setStatus(AccountStatus.SUSPENDED);
        assertThat(login("maria.silva", password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
    }

    @Test
    void quarentaPedidosParalelosComSenhaErradaAvaliamNoMaximoCincoHashes() throws Exception {
        hasher.delayMillis = 30;                                   // abre a janela entre ler e somar (corrida)
        int threads = 40;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<ApiException>> results = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                final int n = i;
                results.add(pool.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    return login("maria.silva", "errada-" + n);
                }));
            }
            start.countDown();
            for (Future<ApiException> f : results) {
                ApiException e = f.get(10, TimeUnit.SECONDS);
                assertThat(e.status()).isEqualTo(401);
                assertThat(e.code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(hasher.matchesCalls.get()).as("reserva atômica antes do hash").isLessThanOrEqualTo(5);
        assertThat(audit.actions()).filteredOn(AuditActions.LOGIN_BLOQUEADO_TENTATIVAS::equals).hasSize(threads - 5);
    }

    @Test
    void loginCertoZeraOBloqueioRefazHashAntigoEAbreSessao() {
        for (int i = 0; i < 4; i++) {
            login("maria.silva", "errada" + i);
        }
        hasher.rehash = true;
        Session s = identity.login(new IdentityService.LoginCommand("maria.silva@exemplo.gov.br", password, true, "Note", null), ctx);
        assertThat(s.accessToken()).isEqualTo("jwt:" + maria.getId() + ":" + s.sessionId());
        assertThat(s.tokenType()).isEqualTo("Bearer");
        assertThat(s.expiresIn()).isEqualTo(900);
        assertThat(s.refreshToken()).hasSize(64);
        assertThat(s.user().id()).isEqualTo(maria.getId());
        assertThat(s.warnings()).isEmpty();
        assertThat(maria.getLastLoginAt()).isNotNull();
        assertThat(maria.getPasswordHash()).isEqualTo("h:" + password);
        assertThat(rateLimit.status(maria.getId(), IdentityService.LOGIN_FAIL_BUCKET, 5, SessionPolicy.defaults().lockWindow()).used()).isZero();
        assertThat(identity.sessionActive(s.sessionId())).isTrue();
        assertThat(audit.actions()).contains(AuditActions.LOGIN_OK);
        // depois do reset, 5 erros novos são permitidos antes de bloquear
        for (int i = 0; i < 5; i++) {
            login("maria.silva", "errada" + i);
        }
        assertThat(login("maria.silva", password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
    }

    @Test
    void semLembrarMeORefreshDura24hEComLembrarMe30d() {
        Session curta = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        Session longa = identity.login(new IdentityService.LoginCommand("maria.silva", password, true, null, null), ctx);
        assertThat(java.time.Duration.between(java.time.Instant.now(), curta.refreshExpiresAt()).toHours()).isBetween(23L, 24L);
        assertThat(java.time.Duration.between(java.time.Instant.now(), longa.refreshExpiresAt()).toDays()).isBetween(29L, 30L);
    }

    @Test
    void refreshRotacionaEReusoDoTokenAntigoRevogaAFamiliaInteira() {
        Session s1 = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        Session s2 = identity.refresh(s1.refreshToken(), ctx);
        assertThat(s2.sessionId()).isEqualTo(s1.sessionId());
        assertThat(s2.refreshToken()).isNotEqualTo(s1.refreshToken());
        assertThat(identity.sessionActive(s1.sessionId())).isTrue();

        clock.advance(SessionPolicy.defaults().reuseGraceWindow().plusSeconds(1)); // fora da janela de tolerância (D-140)
        ApiException reuso = catchThrowableOfType(ApiException.class, () -> identity.refresh(s1.refreshToken(), ctx));
        assertThat(reuso.status()).isEqualTo(401);
        assertThat(reuso.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(s1.sessionId())).as("família inteira revogada").isFalse();
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh(s2.refreshToken(), ctx)).code())
                .as("o token novo também morre").isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(audit.actions()).contains(AuditActions.REFRESH_REUSO);
        assertThat(audit.dump()).doesNotContain(s1.refreshToken()).doesNotContain(s2.refreshToken());

        assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh("nao-existe", ctx)).code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh(" ", ctx)).code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(null)).isFalse();
    }

    /** D-140 (Q-237): resposta da rotação perdida → reuso dentro da janela emite um irmão sem derrubar a família; só uma vez. */
    @Test
    void reusoDentroDaJanelaEhToleradoUmaVezESemFamiliaVivaNunca() {
        Session s1 = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        Session s2 = identity.refresh(s1.refreshToken(), ctx);
        clock.advance(Duration.ofSeconds(5));
        Session sibling = identity.refresh(s1.refreshToken(), ctx);
        assertThat(sibling.sessionId()).isEqualTo(s1.sessionId());
        assertThat(sibling.refreshToken()).isNotEqualTo(s2.refreshToken());
        assertThat(identity.sessionActive(s1.sessionId())).as("família preservada").isTrue();
        assertThat(audit.actions()).contains(AuditActions.REFRESH_REUSO_TOLERADO).doesNotContain(AuditActions.REFRESH_REUSO);

        // segundo reuso do mesmo token, ainda na janela: a reivindicação já foi usada → revogação normal
        clock.advance(Duration.ofSeconds(1));
        ApiException again = catchThrowableOfType(ApiException.class, () -> identity.refresh(s1.refreshToken(), ctx));
        assertThat(again.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(s1.sessionId())).isFalse();
        assertThat(audit.actions()).contains(AuditActions.REFRESH_REUSO);

        // depois do logout, reuso recente nunca revive a sessão
        Session t1 = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        Session t2 = identity.refresh(t1.refreshToken(), ctx);
        identity.logout(new CurrentUser(maria.getId(), maria.getRole(), t2.sessionId()), ctx);
        clock.advance(Duration.ofSeconds(2));
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh(t1.refreshToken(), ctx)).code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(t1.sessionId())).isFalse();
    }

    @Test
    void janelaDeToleranciaTemTetoEZeroDesliga() {
        assertThat(catchThrowableOfType(IllegalArgumentException.class, () -> new SessionPolicy(null, null, 0, null, Duration.ofMinutes(5)))).isNotNull();
        IdentityService strict = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, sessions, Fakes.NO_MIRROR, Fakes.TOKENS,
                audit, new SessionPolicy(null, null, 0, null, Duration.ZERO), clock);
        Session s1 = strict.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        strict.refresh(s1.refreshToken(), ctx);
        assertThat(catchThrowableOfType(ApiException.class, () -> strict.refresh(s1.refreshToken(), ctx)).code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(strict.sessionActive(s1.sessionId())).isFalse();
    }

    /**
     * Achado P1 (Codex): duas requisições com o MESMO refresh não podem ganhar as duas. Com o tombstone (D-32) o resultado
     * legítimo é 0 OU 1 sucesso: se uma perdedora detecta o reuso antes de a vencedora salvar o sucessor, a vencedora
     * também recebe SESSAO_INVALIDA (ver sucessorEmVooDepoisDoReusoDetectadoNaoVale). Nunca 2.
     */
    @Test
    void vinteRefreshesParalelosComOMesmoTokenNoMaximoUmGanhaEAFamiliaEhRevogada() throws Exception {
        Session s = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        int threads = 20;
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        java.util.concurrent.atomic.AtomicInteger ok = new java.util.concurrent.atomic.AtomicInteger();
        java.util.concurrent.atomic.AtomicInteger invalid = new java.util.concurrent.atomic.AtomicInteger();
        try {
            List<Future<?>> fs = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                fs.add(pool.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    try {
                        identity.refresh(s.refreshToken(), ctx);
                        ok.incrementAndGet();
                    } catch (ApiException e) {
                        assertThat(e.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
                        invalid.incrementAndGet();
                    }
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> f : fs) {
                f.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdownNow();
        }
        // um consumo vence; a tolerância (D-140) admite no máximo UM irmão (reivindicação atômica); os demais revogam a família
        assertThat(ok.get()).as("no máximo o rotacionado e um tolerado; nunca três").isLessThanOrEqualTo(2);
        assertThat(ok.get() + invalid.get()).as("toda requisição terminou com sucesso ou SESSAO_INVALIDA").isEqualTo(threads);
        assertThat(identity.sessionActive(s.sessionId())).as("reuso em massa: família inteira revogada").isFalse();
        assertThat(audit.actions()).filteredOn(AuditActions.REFRESH_REUSO::equals)
                .as("cada perdedora do consume audita o reuso").hasSizeGreaterThanOrEqualTo(threads - 2);
        assertThat(audit.actions()).filteredOn(AuditActions.REFRESH_REUSO_TOLERADO::equals).as("tolerância vale uma vez").hasSizeLessThanOrEqualTo(1);
    }

    /**
     * Achado P1 (Codex, PR #18): a vencedora do consume pausa antes de salvar o sucessor; a perdedora detecta reuso e revoga a
     * família; a vencedora então salva. Com o tombstone (D-32) o sucessor NÃO vale e a vencedora também recebe SESSAO_INVALIDA.
     */
    @Test
    void sucessorEmVooDepoisDoReusoDetectadoNaoVale() throws Exception {
        CountDownLatch winnerAtSave = new CountDownLatch(1);
        CountDownLatch loserDone = new CountDownLatch(1);
        SessionStorePort instrumented = new SessionStorePort() {
            @Override
            public void save(RefreshRecord record) {
                if (record.rotatedFromHash() != null) {            // só o sucessor espera a perdedora terminar
                    winnerAtSave.countDown();
                    try {
                        assertThat(loserDone.await(5, TimeUnit.SECONDS)).isTrue();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
                sessions.save(record);
            }

            @Override
            public java.util.Optional<RefreshRecord> find(String h) {
                return sessions.find(h);
            }

            @Override
            public void revoke(String h, java.time.Instant at) {
                sessions.revoke(h, at);
            }

            @Override
            public Consume consume(String h, java.time.Instant now) {
                return sessions.consume(h, now);
            }

            @Override
            public boolean claimReuseGrace(String h) {
                return sessions.claimReuseGrace(h);
            }

            @Override
            public void revokeFamily(UUID f, java.time.Instant at) {
                sessions.revokeFamily(f, at);
            }

            @Override
            public int revokeAllOfUser(UUID u, UUID keep, java.time.Instant at) {
                return sessions.revokeAllOfUser(u, keep, at);
            }

            @Override
            public boolean familyActive(UUID f, java.time.Instant now) {
                return sessions.familyActive(f, now);
            }

            @Override
            public List<RefreshRecord> activeOfUser(UUID u, java.time.Instant now) {
                return sessions.activeOfUser(u, now);
            }
        };
        IdentityService racing = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, instrumented, Fakes.NO_MIRROR, Fakes.TOKENS,
                audit, SessionPolicy.defaults(), clock);
        Session s = racing.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            Future<ApiException> winner = pool.submit(() -> catchThrowableOfType(ApiException.class, () -> racing.refresh(s.refreshToken(), ctx)));
            assertThat(winnerAtSave.await(5, TimeUnit.SECONDS)).as("vencedora consumiu e está prestes a salvar").isTrue();
            ApiException loser = catchThrowableOfType(ApiException.class, () -> racing.refresh(s.refreshToken(), ctx));
            assertThat(loser.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
            assertThat(audit.actions()).contains(AuditActions.REFRESH_REUSO);
            loserDone.countDown();
            ApiException winnerOutcome = winner.get(10, TimeUnit.SECONDS);
            assertThat(winnerOutcome).as("o sucessor em voo foi recusado pelo tombstone").isNotNull();
            assertThat(winnerOutcome.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        } finally {
            pool.shutdownNow();
        }
        assertThat(racing.sessionActive(s.sessionId())).isFalse();
        assertThat(racing.activeSessions(maria.getId())).as("nenhum token da família vale").isEmpty();
        assertThat(sessions.find(Hashing.sha256(s.refreshToken())).orElseThrow().revokedAt()).isNotNull();
    }

    @Test
    void refreshDeContaSuspensaEncerraASessaoELogoutRevogaAFamilia() {
        Session s = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        maria.setStatus(AccountStatus.SUSPENDED);
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh(s.refreshToken(), ctx)).code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(s.sessionId())).isFalse();

        maria.setStatus(AccountStatus.ACTIVE);
        Session t = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        identity.logout(new CurrentUser(maria.getId(), Role.USER, t.sessionId()), ctx);
        assertThat(identity.sessionActive(t.sessionId())).isFalse();
        assertThat(audit.actions()).contains(AuditActions.LOGOUT);
    }

    @Test
    void sextoChuteDaSenhaAtualNaTrocaRecebe429ComRetryAfter() {
        Session s = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        CurrentUser current = new CurrentUser(maria.getId(), Role.USER, s.sessionId());
        String nova = "Nova-" + UUID.randomUUID();
        for (int i = 0; i < 5; i++) {
            ApiException e = catchThrowableOfType(ApiException.class,
                    () -> identity.changePassword(current, "errada", nova, nova, ctx));
            assertThat(e.status()).isEqualTo(422);
            assertThat(e.code()).isEqualTo(AuthCodes.SENHA_ATUAL_INCORRETA);
        }
        ApiException sexto = catchThrowableOfType(ApiException.class, () -> identity.changePassword(current, password, nova, nova, ctx));
        assertThat(sexto.status()).isEqualTo(429);
        assertThat(sexto.code()).isEqualTo(AuthCodes.MUITAS_TENTATIVAS);
        assertThat((Long) sexto.details().get("retryAfterSeconds")).isBetween(1L, 900L);
        assertThat(maria.getPasswordHash()).as("nem a senha certa passa bloqueada").isEqualTo("h:" + password);
        // a mesma reserva vale para o login
        assertThat(login("maria.silva", password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        // a redefinição por e-mail tira do bloqueio
        identity.clearLockout(maria.getId());
        assertThat(identity.changePassword(current, password, nova, nova, ctx)).isZero();
        assertThat(maria.getPasswordHash()).isEqualTo("h:" + nova);
        assertThat(audit.actions()).contains(AuditActions.PASSWORD_CHANGED);
    }

    @Test
    void trocaDeSenhaEncerraAsOutrasSessoesEValidaASenhaNova() {
        Session atual = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        Session outra = identity.login(new IdentityService.LoginCommand("maria.silva", password, true, "Celular", null), ctx);
        CurrentUser current = new CurrentUser(maria.getId(), Role.USER, atual.sessionId());
        ApiException fraca = catchThrowableOfType(ApiException.class, () -> identity.changePassword(current, password, "curta", "curta", ctx));
        assertThat(fraca.code()).isEqualTo(ApiException.VALIDACAO);
        String nova = "Nova-" + UUID.randomUUID();
        ApiException diferente = catchThrowableOfType(ApiException.class, () -> identity.changePassword(current, password, nova, nova + "x", ctx));
        assertThat(diferente.details().toString()).contains("confirmPassword");
        assertThat(identity.changePassword(current, password, nova, nova, ctx)).isEqualTo(1);
        assertThat(identity.sessionActive(atual.sessionId())).isTrue();
        assertThat(identity.sessionActive(outra.sessionId())).isFalse();
        assertThat(identity.activeSessions(maria.getId())).hasSize(1);
        assertThat(identity.reauthenticate(current, nova, "teste", ctx).getId()).isEqualTo(maria.getId());
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.reauthenticate(current, "x", "teste", ctx)).code())
                .isEqualTo(AuthCodes.REAUTENTICACAO_FALHOU);
    }

    @Test
    void contaSoOidcSemSenhaNuncaEntraPorSenhaNemViraOraculo() {
        maria.setPasswordHash(null);
        assertThat(login("maria.silva", "").code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        assertThat(login("maria.silva", password).code()).isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        assertThat(hasher.matchesCalls.get()).as("o hash falso é avaliado mesmo assim").isEqualTo(2);
    }

    @Test
    void auditoriaNuncaContemSenhaNemToken() {
        login("maria.silva", "errada-" + password);
        Session s = identity.login(new IdentityService.LoginCommand("maria.silva", password, false, null, null), ctx);
        identity.refresh(s.refreshToken(), ctx);
        catchThrowableOfType(ApiException.class, () -> identity.refresh(s.refreshToken(), ctx));
        String dump = audit.dump();
        assertThat(dump).doesNotContain(password).doesNotContain("errada-").doesNotContain(s.refreshToken())
                .doesNotContain(s.accessToken()).doesNotContain("h:");
        assertThat(audit.events).allSatisfy(e -> {
            assertThat(e.ip()).isEqualTo("203.0.113.7");
            assertThat(e.userAgent()).isEqualTo("JUnit/5");
        });
    }
}
