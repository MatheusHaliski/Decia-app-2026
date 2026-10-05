package br.gov.pr.secid.workstation.web.oidc;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.OidcAccountLinker;
import br.gov.pr.secid.workstation.application.identity.OidcService;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.SecurityConfig;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.error.GlobalExceptionHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAccessDeniedHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAuthenticationEntryPoint;
import br.gov.pr.secid.workstation.web.security.CurrentUserArgumentResolver;
import br.gov.pr.secid.workstation.web.security.HashBulkhead;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import br.gov.pr.secid.workstation.web.support.CorrelationIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF2.CA03/CA12: rota pública atrás da flag (404 OIDC_DESLIGADO) e verificador Nimbus conferindo nonce/claims sem vazar o token. */
@WebMvcTest(controllers = OidcController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class OidcWebTest {

    @Autowired
    MockMvc mvc;
    @MockitoBean
    OidcService oidc;

    @Test
    void rotaPublicaDevolve404ComAFlagDesligadaE422SemCorpoValido() throws Exception {
        when(oidc.login(any(), any(), any(), any())).thenThrow(new ApiException(AuthCodes.OIDC_DESLIGADO, 404, "x"));
        mvc.perform(post("/api/auth/oidc/login").contentType(MediaType.APPLICATION_JSON)
                        .content(new tools.jackson.databind.ObjectMapper().writeValueAsString(Map.of("idToken", "t", "nonce", "n"))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("OIDC_DESLIGADO"));
        mvc.perform(post("/api/auth/oidc/login").contentType(MediaType.APPLICATION_JSON).content("{\"idToken\":\"t\"}"))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.details.fields.nonce").exists());
    }

    @Test
    void verificadorNimbusConfereNonceEClaimsSemVazarOToken() {
        Jwt jwt = Jwt.withTokenValue("segredo-do-token").header("alg", "RS256").issuer("https://idp.exemplo.gov.br").subject("sub-1")
                .claim("email", "pessoa@exemplo.gov.br").claim("email_verified", true).claim("name", "Pessoa").claim("nonce", "n-1")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        JwtDecoder ok = token -> jwt;
        NimbusIdTokenVerifier verifier = new NimbusIdTokenVerifier(() -> ok);
        OidcAccountLinker.OidcClaims claims = verifier.verify("segredo-do-token", "n-1");
        assertThat(claims.issuer()).isEqualTo("https://idp.exemplo.gov.br");
        assertThat(claims.subject()).isEqualTo("sub-1");
        assertThat(claims.email()).isEqualTo("pessoa@exemplo.gov.br");
        assertThat(claims.emailVerified()).isTrue();
        ApiException nonce = catchThrowableOfType(ApiException.class, () -> verifier.verify("segredo-do-token", "outro"));
        assertThat(nonce.code()).isEqualTo(AuthCodes.OIDC_TOKEN_INVALIDO);
        assertThat(nonce.getMessage()).doesNotContain("segredo-do-token");
        JwtDecoder bad = token -> {
            throw new JwtException("assinatura inválida: " + token);
        };
        ApiException invalid = catchThrowableOfType(ApiException.class, () -> new NimbusIdTokenVerifier(() -> bad).verify("segredo-do-token", "n-1"));
        assertThat(invalid.status()).isEqualTo(401);
        assertThat(invalid.getMessage()).doesNotContain("segredo-do-token");
        Jwt semVerificado = Jwt.withTokenValue("t").header("alg", "RS256").issuer("i").subject("s").claim("nonce", "n-1")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        assertThat(new NimbusIdTokenVerifier(() -> token -> semVerificado).verify("t", "n-1").emailVerified()).isFalse();
    }
}
