package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** RF2.CA02 / D-144: ativar com o primeiro código, entrar com código ou código de recuperação, desligar e regenerar com step-up. */
class TwoFactorServiceTest {
    final String password = "pw-" + UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final Fakes.SpyHasher hasher = new Fakes.SpyHasher();
    final Fakes.Audit audit = new Fakes.Audit();
    final InMemoryRateLimit rateLimit = new InMemoryRateLimit();
    final InMemorySessionStore sessions = new InMemorySessionStore();
    final IdentityServiceTest.MutableClock clock = new IdentityServiceTest.MutableClock(Instant.parse("2026-10-17T12:00:05Z"));
    IdentityService identity;
    TwoFactorService twoFactor;
    User maria;

    @BeforeEach
    void setUp() {
        identity = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, sessions, Fakes.NO_MIRROR, Fakes.TOKENS, audit,
                SessionPolicy.defaults(), clock);
        twoFactor = new TwoFactorService(users, identity, new ResourceAuthorizer(users, Optional.empty()), audit, clock, "Work Station");
        maria = users.add(Fakes.user("maria.silva", "maria@exemplo.gov.br", hasher.hash(password)));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    Session login(String code) {
        return identity.login(new IdentityService.LoginCommand("maria.silva", password, false, "teste", code), ctx);
    }

    ApiException loginFails(String code) {
        return catchThrowableOfType(ApiException.class, () -> login(code));
    }

    CurrentUser me(Session s) {
        return new CurrentUser(maria.getId(), Role.USER, s.sessionId());
    }

    String codeNow(String secret) {
        return Totp.code(Totp.base32Decode(secret), Totp.step(clock.instant()), Totp.DIGITS);
    }

    @Test
    void ativarPedeSenhaEPrimeiroCodigoEntregaDezCodigosDeRecuperacaoEEncerraAsOutrasSessoes() {
        Session atual = login(null);
        Session outra = login(null);
        CurrentUser me = me(atual);
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.setup(me, "errada", ctx)).code()).isEqualTo(AuthCodes.REAUTENTICACAO_FALHOU);
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.enable(me, "123456", ctx)).code())
                .isEqualTo(AuthCodes.DOIS_FATORES_SEM_CONFIGURACAO);

        TwoFactorService.Setup setup = twoFactor.setup(me, password, ctx);
        assertThat(setup.secret()).matches("[A-Z2-7]{32}");
        assertThat(setup.otpauthUri()).startsWith("otpauth://totp/Work%20Station:maria.silva?secret=" + setup.secret());
        assertThat(twoFactor.status(me).pendingSetup()).isTrue();
        assertThat(maria.isTwoFactorEnabled()).as("só liga depois do primeiro código").isFalse();

        String bad = "000000".equals(codeNow(setup.secret())) ? "111111" : "000000";
        ApiException wrong = catchThrowableOfType(ApiException.class, () -> twoFactor.enable(me, bad, ctx));
        assertThat(wrong.status()).isEqualTo(422);
        assertThat(wrong.code()).isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);

        List<String> codes = twoFactor.enable(me, codeNow(setup.secret()), ctx).recoveryCodes();
        assertThat(codes).hasSize(10).doesNotHaveDuplicates().allMatch(c -> c.matches("[a-z2-9]{4}-[a-z2-9]{4}"));
        assertThat(maria.getTwoFactorRecoveryHashes()).doesNotContain(codes.get(0).replace("-", ""));
        TwoFactorService.Status st = twoFactor.status(me);
        assertThat(st.enabled()).isTrue();
        assertThat(st.recoveryCodesLeft()).isEqualTo(10);
        assertThat(identity.sessionActive(outra.sessionId())).isFalse();
        assertThat(identity.sessionActive(atual.sessionId())).isTrue();
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.setup(me, password, ctx)).code()).isEqualTo(AuthCodes.DOIS_FATORES_JA_ATIVO);
        assertThat(audit.actions()).contains(AuditActions.TWO_FACTOR_SETUP_STARTED, AuditActions.TWO_FACTOR_ENABLED);
        assertThat(audit.dump()).doesNotContain(setup.secret()).doesNotContain(codes.get(0));
    }

    @Test
    void loginComDoisFatoresAceitaCodigoUmaVezECodigoDeRecuperacaoUmaVez() {
        CurrentUser me = me(login(null));
        String secret = twoFactor.setup(me, password, ctx).secret();
        List<String> codes = twoFactor.enable(me, codeNow(secret), ctx).recoveryCodes();

        ApiException semCodigo = loginFails(null);
        assertThat(semCodigo.code()).isEqualTo(AuthCodes.DOIS_FATORES_NECESSARIO);
        assertThat(semCodigo.details()).containsEntry("twoFactorRequired", true);
        assertThat(loginFails(codeNow(secret)).code()).as("o código usado para ativar não entra de novo").isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);

        clock.advance(Duration.ofSeconds(30));
        String code = codeNow(secret);
        assertThat(login(code).accessToken()).isNotBlank();
        assertThat(loginFails(code).code()).as("reuso do mesmo código").isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);

        String recovery = codes.get(3).toUpperCase();
        assertThat(login(recovery).accessToken()).isNotBlank();
        assertThat(loginFails(recovery).code()).as("código de recuperação vale uma vez").isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);
        assertThat(twoFactor.status(me).recoveryCodesLeft()).isEqualTo(9);
        assertThat(audit.actions()).contains(AuditActions.TWO_FACTOR_RECOVERY_USED);
    }

    @Test
    void codigosErradosContamNoMesmoBloqueioDaSenha() {
        CurrentUser me = me(login(null));
        String secret = twoFactor.setup(me, password, ctx).secret();
        twoFactor.enable(me, codeNow(secret), ctx);
        clock.advance(Duration.ofSeconds(60));
        for (int i = 0; i < 5; i++) {
            assertThat(loginFails("99999" + i).code()).isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);
        }
        ApiException bloqueada = loginFails(codeNow(secret));
        assertThat(bloqueada.code()).as("bloqueada: nem o código certo passa, e a resposta é a genérica").isEqualTo(AuthCodes.CREDENCIAIS_INVALIDAS);
        assertThat(bloqueada.details()).isEmpty();
    }

    @Test
    void desligarERegenerarPedemSenhaECodigo() {
        CurrentUser me = me(login(null));
        String secret = twoFactor.setup(me, password, ctx).secret();
        List<String> first = twoFactor.enable(me, codeNow(secret), ctx).recoveryCodes();
        clock.advance(Duration.ofSeconds(30));
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.regenerateRecoveryCodes(me, password, first.get(0), ctx)).code())
                .as("regenerar exige o aplicativo, não um código de recuperação").isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);
        List<String> second = twoFactor.regenerateRecoveryCodes(me, password, codeNow(secret), ctx).recoveryCodes();
        assertThat(second).doesNotContainAnyElementsOf(first);
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.disable(me, "errada", first.get(0), ctx)).code())
                .isEqualTo(AuthCodes.REAUTENTICACAO_FALHOU);
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.disable(me, password, first.get(0), ctx)).code())
                .as("os códigos antigos deixaram de valer").isEqualTo(AuthCodes.DOIS_FATORES_INVALIDO);
        assertThat(twoFactor.disable(me, password, second.get(0), ctx).enabled()).isFalse();
        assertThat(maria.getTwoFactorSecret()).isNull();
        assertThat(maria.getTwoFactorRecoveryHashes()).isNull();
        assertThat(login(null).accessToken()).as("sem 2FA o login volta a ser só a senha").isNotBlank();
        assertThat(catchThrowableOfType(ApiException.class, () -> twoFactor.disable(me, password, "123456", ctx)).code())
                .isEqualTo(AuthCodes.DOIS_FATORES_INATIVO);
        assertThat(audit.actions()).contains(AuditActions.TWO_FACTOR_RECOVERY_REGENERATED, AuditActions.TWO_FACTOR_DISABLED);
    }
}
