package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF2.CA03/CA12 (Q-30): vincula conta existente SÓ com email_verified=true; cria conta sem senha; flag desligada → 404. */
class OidcTest {
    static final String ISSUER = "https://login.exemplo.gov.br";
    final RequestContext ctx = new RequestContext("203.0.113.7", "JUnit/5");
    final Fakes.Users users = new Fakes.Users();
    final Fakes.Preferences prefs = new Fakes.Preferences();
    final Fakes.Audit audit = new Fakes.Audit();
    OidcAccountLinker linker;
    IdentityService identity;

    @BeforeEach
    void setUp() {
        linker = new OidcAccountLinker(users, prefs, Fakes.EMAIL_HASHER, audit, Clock.systemUTC());
        identity = new IdentityService(users, Fakes.EMAIL_HASHER, new Fakes.SpyHasher(), new InMemoryRateLimit(), new InMemorySessionStore(),
                Fakes.NO_MIRROR, Fakes.TOKENS, audit, SessionPolicy.defaults(), Clock.systemUTC());
    }

    @Test
    void contaExistenteSoEVinculadaComEmailVerificado() {
        User maria = users.add(Fakes.user("maria", "maria@exemplo.gov.br", "h:x"));
        ApiException e = catchThrowableOfType(ApiException.class, () -> linker.link(
                new OidcAccountLinker.OidcClaims(ISSUER, "sub-1", "maria@exemplo.gov.br", false, "Maria"), ctx));
        assertThat(e.status()).isEqualTo(401);
        assertThat(e.code()).isEqualTo(AuthCodes.OIDC_EMAIL_NAO_VERIFICADO);
        assertThat(maria.getOidcSubject()).isNull();
        assertThat(audit.actions()).contains(AuditActions.OIDC_LINK_RECUSADO);
        User linked = linker.link(new OidcAccountLinker.OidcClaims(ISSUER, "sub-1", "MARIA@exemplo.gov.br", true, "Maria"), ctx);
        assertThat(linked.getId()).isEqualTo(maria.getId());
        assertThat(maria.getOidcIssuer()).isEqualTo(ISSUER);
        assertThat(maria.getOidcSubject()).isEqualTo("sub-1");
        // da próxima vez entra pelo (iss, sub), mesmo que o IdP não mande e-mail
        assertThat(linker.link(new OidcAccountLinker.OidcClaims(ISSUER, "sub-1", null, false, null), ctx).getId()).isEqualTo(maria.getId());
        maria.setStatus(AccountStatus.SUSPENDED);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> linker.link(new OidcAccountLinker.OidcClaims(ISSUER, "sub-1", null, false, null), ctx)).code())
                .isEqualTo(AuthCodes.CONTA_INDISPONIVEL);
    }

    @Test
    void contaNovaNasceAtivaSemSenhaEComUsernameLivreSoComEmailVerificado() {
        assertThat(catchThrowableOfType(ApiException.class, () -> linker.link(
                new OidcAccountLinker.OidcClaims(ISSUER, "sub-9", "novo@exemplo.gov.br", false, "Novo Servidor"), ctx)).code())
                .isEqualTo(AuthCodes.OIDC_EMAIL_NAO_VERIFICADO);
        assertThat(users.rows).isEmpty();
        users.add(Fakes.user("novo.servidor", "x@exemplo.gov.br", "h:x"));
        User u = linker.link(new OidcAccountLinker.OidcClaims(ISSUER, "sub-9", "novo@exemplo.gov.br", true, "Novo Servidor"), ctx);
        assertThat(u.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(u.getPasswordHash()).isNull();
        assertThat(u.isEmailVerified()).isTrue();
        assertThat(u.getUsername()).isEqualTo("novo.servidor.1");
        assertThat(prefs.rows).containsKey(u.getId());
        assertThat(u.getTermsVersion()).as("aceite vem da tela de conclusão (RF1.CA17)").isNull();
        for (String[] bad : new String[][] {{null, "s"}, {ISSUER, " "}}) {
            assertThat(catchThrowableOfType(ApiException.class,
                    () -> linker.link(new OidcAccountLinker.OidcClaims(bad[0], bad[1], "a@b.co", true, null), ctx)).code())
                    .isEqualTo(AuthCodes.OIDC_TOKEN_INVALIDO);
        }
        assertThat(catchThrowableOfType(ApiException.class,
                () -> linker.link(new OidcAccountLinker.OidcClaims(ISSUER, "sub-x", "sem-email", true, null), ctx)).code())
                .isEqualTo(AuthCodes.OIDC_TOKEN_INVALIDO);
    }

    @Test
    void servicoAtrasDaFlagValidaONonceEAbreSessao() {
        @SuppressWarnings("unchecked")
        ObjectProvider<IdTokenVerifier> none = mock(ObjectProvider.class);
        when(none.getIfAvailable()).thenReturn(null);
        OidcService off = new OidcService(new OidcProperties(false, ISSUER, "cid", "", null), none, linker, identity);
        assertThat(off.enabled()).isFalse();
        ApiException e = catchThrowableOfType(ApiException.class, () -> off.login("t", "n", null, ctx));
        assertThat(e.status()).isEqualTo(404);
        assertThat(e.code()).isEqualTo(AuthCodes.OIDC_DESLIGADO);

        IdTokenVerifier verifier = (token, nonce) -> {
            if (!"n-123".equals(nonce) || !"tok".equals(token)) {
                throw new ApiException(AuthCodes.OIDC_TOKEN_INVALIDO, 401, "x");
            }
            return new OidcAccountLinker.OidcClaims(ISSUER, "sub-7", "pessoa@exemplo.gov.br", true, "Pessoa");
        };
        @SuppressWarnings("unchecked")
        ObjectProvider<IdTokenVerifier> some = mock(ObjectProvider.class);
        when(some.getIfAvailable()).thenReturn(verifier);
        OidcService on = new OidcService(new OidcProperties(true, ISSUER, "cid", "", "gov"), some, linker, identity);
        assertThat(on.enabled()).isTrue();
        assertThat(catchThrowableOfType(ApiException.class, () -> on.login("tok", "", null, ctx)).code()).isEqualTo(AuthCodes.OIDC_TOKEN_INVALIDO);
        assertThat(catchThrowableOfType(ApiException.class, () -> on.login("tok", "outro", null, ctx)).code()).isEqualTo(AuthCodes.OIDC_TOKEN_INVALIDO);
        Session s = on.login("tok", "n-123", "Note", ctx);
        assertThat(s.user().email()).isEqualTo("pessoa@exemplo.gov.br");
        assertThat(identity.sessionActive(s.sessionId())).isTrue();
        assertThat(audit.actions()).contains(AuditActions.OIDC_LOGIN);
        assertThat(new OidcProperties(true, ISSUER, "cid", "segredo-" + UUID.randomUUID(), null).toString()).doesNotContain("segredo-");
    }
}
