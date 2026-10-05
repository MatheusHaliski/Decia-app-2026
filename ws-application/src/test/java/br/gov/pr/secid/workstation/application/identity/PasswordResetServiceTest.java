package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/** Redefinição por e-mail: resposta idêntica, token de 1 uso que expira, limpa o bloqueio e encerra as sessões. */
class PasswordResetServiceTest {
    final String password = "Senha-" + UUID.randomUUID();
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final InMemoryCodes codes = new InMemoryCodes();
    final Fakes.SpyHasher hasher = new Fakes.SpyHasher();
    final InMemoryRateLimit rateLimit = new InMemoryRateLimit();
    final Fakes.Mails mails = new Fakes.Mails();
    final Fakes.Audit audit = new Fakes.Audit();
    IdentityService identity;
    PasswordResetService reset;
    User maria;

    @BeforeEach
    void setUp() {
        identity = new IdentityService(users, Fakes.EMAIL_HASHER, hasher, rateLimit, new InMemorySessionStore(), Fakes.NO_MIRROR,
                Fakes.TOKENS, audit, SessionPolicy.defaults(), Clock.systemUTC());
        reset = new PasswordResetService(users, codes, Fakes.EMAIL_HASHER, hasher, rateLimit, mails, audit, identity, Clock.systemUTC(),
                "https://app.exemplo.gov.br");
        maria = users.add(Fakes.user("maria", "maria@exemplo.gov.br", hasher.hash(password)));
    }

    @Test
    void pedidoRespondeIgualExistaOuNaoEEnviaTokenSoParaContaReal() {
        reset.request("ninguem@exemplo.gov.br", ctx);
        assertThat(mails.sent).isEmpty();
        reset.request("MARIA@exemplo.gov.br", ctx);
        assertThat(mails.last().template()).isEqualTo("password-reset");
        assertThat(mails.last().secret()).hasSize(64);
        assertThat(mails.last().params()).containsEntry("link", "https://app.exemplo.gov.br/reset-password");
        assertThat(audit.actions()).contains(AuditActions.PASSWORD_RESET_REQUESTED);
        assertThat(audit.dump()).doesNotContain(mails.last().secret());
        for (int i = 0; i < 10; i++) {
            reset.request("maria@exemplo.gov.br", ctx);
        }
        assertThat(mails.sent).as("5 pedidos por hora por pessoa").hasSize(PasswordResetService.REQUESTS_PER_HOUR);
    }

    @Test
    void confirmarTrocaASenhaConsomeOTokenLimpaOBloqueioEEncerraSessoes() {
        Session s = identity.login(new IdentityService.LoginCommand("maria", password, false, null, null), ctx);
        for (int i = 0; i < 5; i++) {
            catchThrowableOfType(ApiException.class, () -> identity.login(new IdentityService.LoginCommand("maria", "x", false, null, null), ctx));
        }
        assertThat(catchThrowableOfType(ApiException.class, () -> identity.login(new IdentityService.LoginCommand("maria", password, false, null, null), ctx)))
                .as("bloqueada").isNotNull();
        reset.request("maria@exemplo.gov.br", ctx);
        String token = mails.last().secret();
        String nova = "Nova-" + UUID.randomUUID();
        ApiException fraca = catchThrowableOfType(ApiException.class, () -> reset.confirm(token, "curta", "curta", ctx));
        assertThat(fraca.code()).isEqualTo(ApiException.VALIDACAO);
        reset.confirm(token, nova, nova, ctx);
        assertThat(maria.getPasswordHash()).isEqualTo("h:" + nova);
        assertThat(identity.sessionActive(s.sessionId())).as("sessões antigas encerradas").isFalse();
        assertThat(identity.login(new IdentityService.LoginCommand("maria", nova, false, null, null), ctx).accessToken())
                .as("saiu do bloqueio").isNotBlank();
        ApiException reuse = catchThrowableOfType(ApiException.class, () -> reset.confirm(token, nova, nova, ctx));
        assertThat(reuse.status()).isEqualTo(422);
        assertThat(reuse.code()).isEqualTo(AuthCodes.LINK_INVALIDO);
        assertThat(catchThrowableOfType(ApiException.class, () -> reset.confirm("inexistente", nova, nova, ctx)).code()).isEqualTo(AuthCodes.LINK_INVALIDO);
        assertThat(catchThrowableOfType(ApiException.class, () -> reset.confirm(null, nova, nova, ctx)).code()).isEqualTo(AuthCodes.LINK_INVALIDO);
        assertThat(audit.actions()).contains(AuditActions.PASSWORD_RESET_COMPLETED);
        assertThat(audit.dump()).doesNotContain(nova).doesNotContain(token);
    }

    @Test
    void tokenAnteriorMorreQuandoUmNovoEUsadoEUsuarioComRoleAdminTambemRedefine() {
        maria.setRole(Role.ADMIN);
        reset.request("maria@exemplo.gov.br", ctx);
        String first = mails.last().secret();
        reset.request("maria@exemplo.gov.br", ctx);
        String second = mails.last().secret();
        String nova = "Nova-" + UUID.randomUUID();
        reset.confirm(second, nova, nova, ctx);
        assertThat(catchThrowableOfType(ApiException.class, () -> reset.confirm(first, nova, nova, ctx)).code()).isEqualTo(AuthCodes.LINK_INVALIDO);
    }
}
