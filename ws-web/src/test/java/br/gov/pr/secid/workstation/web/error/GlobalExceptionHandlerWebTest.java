package br.gov.pr.secid.workstation.web.error;

import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.SecurityConfig;
import br.gov.pr.secid.workstation.web.security.ApiErrorAccessDeniedHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAuthenticationEntryPoint;
import br.gov.pr.secid.workstation.web.security.HashBulkhead;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import br.gov.pr.secid.workstation.web.support.CorrelationIdFilter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato de erro da API ponta a ponta na fatia MVC com a segurança real: todo status sai como ApiError
 * {@code {code, message, details, correlationId}}, sem stack trace nem mensagem interna, e com o header de correlação.
 */
@WebMvcTest(controllers = ProbeController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class,
        ApiErrorAuthenticationEntryPoint.class, ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class,
        InMemoryRateLimit.class, InMemorySessionStore.class, ClockConfig.class, ClientIpResolver.class, HashBulkhead.class})
class GlobalExceptionHandlerWebTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    InMemorySessionStore sessions;

    /** Toda sessão desta API tem família viva ({@code sid}); o SessionActiveFilter recusa as demais. */
    private static final java.util.UUID SID = java.util.UUID.randomUUID();

    @org.junit.jupiter.api.BeforeEach
    void liveSession() {
        java.time.Instant now = java.time.Instant.now();
        sessions.save(new RefreshRecord("h-probe", SID, java.util.UUID.randomUUID(), now, now.plus(java.time.Duration.ofDays(1)), null, null, false, null));
    }

    /** Token já validado com o papel dado — o mesmo que o JwtAuthenticationConverter produziria a partir do claim "role". */
    private static MockHttpServletRequestBuilder withRole(MockHttpServletRequestBuilder b, String role) {
        return b.with(jwt().jwt(j -> j.claim("role", role).claim("sid", SID.toString())).authorities(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private static MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b) {
        return withRole(b, "USER");
    }

    @Test
    void semTokenRecebe401EmJsonComCorrelacao() throws Exception {
        MvcResult r = mvc.perform(get("/probe/ok").header(CorrelationIdFilter.HEADER, "teste-correlacao-123"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(CorrelationIdFilter.HEADER, "teste-correlacao-123"))
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"))
                .andExpect(jsonPath("$.correlationId").value("teste-correlacao-123"))
                .andExpect(jsonPath("$.status").value(401))
                .andReturn();
        assertThat(r.getResponse().getContentType()).startsWith(MediaType.APPLICATION_JSON_VALUE);
    }

    @Test
    void healthEPublicoERestoDoActuatorExigeAdmin() throws Exception {
        // sem Actuator neste módulo a rota não existe (404), mas a segurança não a barra (nunca 401/403)
        mvc.perform(get("/actuator/health")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
        mvc.perform(authed(get("/actuator/metrics"))).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        mvc.perform(withRole(get("/actuator/metrics"), "ADMIN")).andExpect(status().isNotFound());
        // papel desconhecido no claim (BFLA): 403 mesmo com token válido
        mvc.perform(withRole(get("/probe/ok"), "CONVIDADO")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
    }

    @Test
    void cabecalhosDeSegurancaEmTodaResposta() throws Exception {
        mvc.perform(authed(get("/probe/ok")))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.containsString("frame-ancestors 'none'")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().exists("Permissions-Policy"))
                .andExpect(header().exists(CorrelationIdFilter.HEADER));
        mvc.perform(authed(get("/probe/ok")).secure(true))
                .andExpect(header().string("Strict-Transport-Security", org.hamcrest.Matchers.containsString("max-age=31536000")));
    }

    @Test
    void validacaoDoCorpoDa422ComCampos() throws Exception {
        mvc.perform(authed(post("/probe/body")).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDACAO"))
                .andExpect(jsonPath("$.details.fields.name").exists());
    }

    @Test
    void jsonQuebradoEParametroErradoDao400() throws Exception {
        mvc.perform(authed(post("/probe/body")).contentType(MediaType.APPLICATION_JSON).content("{nao é json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("JSON_INVALIDO"));
        mvc.perform(authed(get("/probe/param")).param("n", "abc"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PARAMETRO_INVALIDO"))
                .andExpect(jsonPath("$.details.parameter").value("n"));
        mvc.perform(authed(get("/probe/param")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details.parameter").value("n"));
        mvc.perform(authed(post("/probe/body")).contentType(MediaType.TEXT_PLAIN).content("x"))
                .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.code").value("FORMATO_NAO_SUPORTADO"));
    }

    @ParameterizedTest
    @CsvSource({"400", "401", "403", "404", "409", "422", "429", "503"})
    void apiExceptionPreservaStatusCodigoEDetalhes(int status) throws Exception {
        mvc.perform(authed(get("/probe/api")).param("status", String.valueOf(status)))
                .andExpect(status().is(status))
                .andExpect(jsonPath("$.code").value("CODIGO_DE_TESTE"))
                .andExpect(jsonPath("$.message").value("Mensagem de negócio"))
                .andExpect(jsonPath("$.details.k").value("v"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @ParameterizedTest
    @CsvSource({
            "/probe/unauthenticated, 401, NAO_AUTENTICADO",
            "/probe/forbidden, 403, ACESSO_NEGADO",
            "/nao/existe, 404, NAO_ENCONTRADO",
            "/probe/conflict, 409, CONFLITO",
            "/probe/concurrent, 409, EDICAO_CONCORRENTE",
            "/probe/unavailable, 503, SERVICO_INDISPONIVEL",
            "/probe/boom, 500, ERRO_INTERNO",
    })
    void excecoesDoFrameworkViramApiError(String path, int status, String code) throws Exception {
        MvcResult r = mvc.perform(authed(get(path)))
                .andExpect(status().is(status))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.path").value(path))
                .andReturn();
        String body = r.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Exception").doesNotContain("supersecreta").doesNotContain("segredo=")
                .doesNotContain("\tat ");
    }

    @Test
    void metodoNaoSuportadoDa405() throws Exception {
        mvc.perform(authed(delete("/probe/ok"))).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METODO_NAO_SUPORTADO"));
    }
}
