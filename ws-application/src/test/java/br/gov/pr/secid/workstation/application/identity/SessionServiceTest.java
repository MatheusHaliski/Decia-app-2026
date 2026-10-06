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

import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

/**
 * RF2.CA05 (Bloco 4, D-62) — testes-guarda das sessões: encerrar uma sessão derruba o refresh daquele navegador; a sessão de outra
 * pessoa responde 404 (igual a id inexistente) e continua viva; "sair dos outros" mantém só a atual.
 */
class SessionServiceTest {
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final Fakes.Audit audit = new Fakes.Audit();
    final InMemorySessionStore store = new InMemorySessionStore();
    IdentityService identity;
    SessionService sessions;
    User maria;
    User joao;

    @BeforeEach
    void setUp() {
        identity = new IdentityService(users, Fakes.EMAIL_HASHER, new Fakes.SpyHasher(), new InMemoryRateLimit(), store, Fakes.NO_MIRROR,
                Fakes.TOKENS, audit, SessionPolicy.defaults(), Clock.systemUTC());
        sessions = new SessionService(store, Fakes.NO_MIRROR, new ResourceAuthorizer(users, Optional.empty()), audit, Clock.systemUTC());
        maria = users.add(Fakes.user("maria", "maria@exemplo.gov.br", "h:x"));
        joao = users.add(Fakes.user("joao", "joao@exemplo.gov.br", "h:y"));
        AuthorizationTrail.clear();
    }

    @AfterEach
    void clearTrail() {
        AuthorizationTrail.clear();
    }

    private static CurrentUser as(User u, Session s) {
        return new CurrentUser(u.getId(), Role.USER, s.sessionId());
    }

    @Test
    void listaSoAsSessoesVivasDaPessoaComAAtualPrimeiroESemHashDoToken() {
        Session notebook = identity.openSession(maria, false, "Notebook", ctx);
        Session celular = identity.openSession(maria, true, "Celular", ctx);
        identity.openSession(joao, false, "Do João", ctx);
        List<SessionService.SessionView> list = sessions.list(as(maria, notebook));
        assertThat(list).extracting(SessionService.SessionView::id).containsExactly(notebook.sessionId(), celular.sessionId());
        assertThat(list.get(0).current()).isTrue();
        assertThat(list.get(1).current()).isFalse();
        assertThat(list).extracting(SessionService.SessionView::deviceName).containsExactly("Notebook", "Celular");
        assertThat(list.toString()).doesNotContain(notebook.refreshToken()).doesNotContain(celular.refreshToken());
        // a renovação continua a mesma sessão (família), não cria outra linha
        identity.refresh(celular.refreshToken(), ctx);
        assertThat(sessions.list(as(maria, notebook))).hasSize(2);
    }

    @Test
    void encerrarUmaSessaoDerrubaORefreshDaquelaSessaoEMantemAsOutras() {
        Session atual = identity.openSession(maria, false, "Notebook", ctx);
        Session outra = identity.openSession(maria, false, "Celular", ctx);
        sessions.revoke(as(maria, atual), outra.sessionId(), ctx);
        ApiException e = catchThrowableOfType(ApiException.class, () -> identity.refresh(outra.refreshToken(), ctx));
        assertThat(e).as("o refresh da sessão encerrada não renova mais").isNotNull();
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(AuthCodes.SESSAO_INVALIDA);
        assertThat(identity.sessionActive(outra.sessionId())).as("access token vivo cai no SessionActiveFilter").isFalse();
        assertThat(identity.refresh(atual.refreshToken(), ctx).sessionId()).isEqualTo(atual.sessionId());
        assertThat(AuthorizationTrail.checked()).isTrue();
        assertThat(audit.actions()).contains(AuditActions.SESSION_REVOKED);
    }

    @Test
    void sessaoDeOutraPessoaResponde404IgualAIdInexistenteENaoEEncerrada() {
        Session daMaria = identity.openSession(maria, false, "Notebook", ctx);
        Session doJoao = identity.openSession(joao, false, "Celular", ctx);
        ApiException alheia = catchThrowableOfType(ApiException.class, () -> sessions.revoke(as(maria, daMaria), doJoao.sessionId(), ctx));
        ApiException inexistente = catchThrowableOfType(ApiException.class, () -> sessions.revoke(as(maria, daMaria), UUID.randomUUID(), ctx));
        assertThat(alheia).isNotNull();
        assertThat(alheia.status()).isEqualTo(404);
        assertThat(alheia.code()).isEqualTo(inexistente.code());
        assertThat(alheia.getMessage()).as("mesma mensagem: não confirma que o id existe").isEqualTo(inexistente.getMessage());
        assertThat(identity.sessionActive(doJoao.sessionId())).isTrue();
        assertThat(identity.refresh(doJoao.refreshToken(), ctx).sessionId()).isEqualTo(doJoao.sessionId());
        assertThat(audit.actions()).doesNotContain(AuditActions.SESSION_REVOKED);
    }

    @Test
    void sairDosOutrosDispositivosMantemSoASessaoAtual() {
        Session atual = identity.openSession(maria, false, "Notebook", ctx);
        Session a = identity.openSession(maria, false, "Celular", ctx);
        Session b = identity.openSession(maria, false, "Tablet", ctx);
        Session doJoao = identity.openSession(joao, false, "Do João", ctx);
        assertThat(sessions.revokeOthers(as(maria, atual), ctx)).isEqualTo(2);
        assertThat(sessions.list(as(maria, atual))).extracting(SessionService.SessionView::id).containsExactly(atual.sessionId());
        for (Session s : List.of(a, b)) {
            assertThat(catchThrowableOfType(ApiException.class, () -> identity.refresh(s.refreshToken(), ctx)).status()).isEqualTo(401);
        }
        assertThat(identity.sessionActive(doJoao.sessionId())).isTrue();
    }

    @Test
    void semAutenticacao401() {
        assertThat(catchThrowableOfType(ApiException.class, () -> sessions.list(null)).status()).isEqualTo(401);
        assertThat(catchThrowableOfType(ApiException.class, () -> sessions.revoke(null, UUID.randomUUID(), ctx)).status()).isEqualTo(401);
        assertThat(catchThrowableOfType(ApiException.class, () -> sessions.revokeOthers(null, ctx)).status()).isEqualTo(401);
    }
}
