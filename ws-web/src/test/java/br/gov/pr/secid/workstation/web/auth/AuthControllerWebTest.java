package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.Session;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.SecurityConfig;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.error.GlobalExceptionHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAccessDeniedHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAuthenticationEntryPoint;
import br.gov.pr.secid.workstation.web.security.CurrentUserArgumentResolver;
import br.gov.pr.secid.workstation.web.security.HashBulkhead;
import br.gov.pr.secid.workstation.web.support.AuthRateLimitFilter;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import br.gov.pr.secid.workstation.web.support.CorrelationIdFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fatia MVC com a segurança real e o IdentityService falso: contrato HTTP do RF2, 60 logins paralelos sem nenhum 500
 * (bulkhead), 401/403 nos endpoints autenticados e sid revogado recusado pelo SessionActiveFilter.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, AuthControllerWebTest.Bulkhead.class})
class AuthControllerWebTest {

    @TestConfiguration
    static class Bulkhead {
        @Bean
        HashBulkhead hashBulkhead() {
            return new HashBulkhead(2, 60);     // 2 vagas, espera curta: o excedente recebe 503 em vez de fila
        }
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    IdentityService identity;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    /** Senha de teste gerada por execução. */
    final String password = "pw-" + UUID.randomUUID();

    private Session session() {
        UserView view = new UserView(userId, "maria.silva", "Maria", null, "maria@exemplo.gov.br", true, null, "EMPREGADO", "USER",
                "ACTIVE", null, null, null, null, false, false, "SO_EU", false, null, null, null, null, Instant.now());
        return new Session("jwt", "Bearer", 900, "refresh-" + UUID.randomUUID(), Instant.now().plus(Duration.ofDays(1)), sid, view, List.of());
    }

    @BeforeEach
    void liveSession() {
        sessions.save(new RefreshRecord("h-" + sid, sid, userId, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
    }

    private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b, String role, UUID family) {
        return b.with(jwt().jwt(j -> j.subject(userId.toString()).claim("role", role).claim("sid", family.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private static String json(Map<String, ?> m) {
        return new tools.jackson.databind.ObjectMapper().writeValueAsString(m);
    }

    @Test
    void loginDevolveSessaoEErrosDoServicoSaemNoFormatoApiError() throws Exception {
        when(identity.login(any(), any())).thenReturn(session());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("identifier", "maria.silva", "password", password, "rememberMe", true))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.sessionId").value(sid.toString()))
                .andExpect(jsonPath("$.user.username").value("maria.silva"));
        ArgumentCaptor<RequestContext> ctx = ArgumentCaptor.forClass(RequestContext.class);
        verify(identity).login(any(), ctx.capture());
        assertThat(ctx.getValue().ip()).isNotBlank();

        when(identity.login(any(), any())).thenThrow(new ApiException(AuthCodes.CREDENCIAIS_INVALIDAS, 401, "Credenciais inválidas."));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("identifier", "x", "password", "y"))).header(CorrelationIdFilter.HEADER, "corr-login-0001"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CREDENCIAIS_INVALIDAS"))
                .andExpect(jsonPath("$.correlationId").value("corr-login-0001"));
        // corpo inválido: 422 VALIDACAO com os campos, antes de chegar ao serviço
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("identifier", ""))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDACAO"))
                .andExpect(jsonPath("$.details.fields.password").exists());
    }

    @Test
    void sessentaLoginsParalelosNuncaDao500() throws Exception {
        when(identity.login(any(), any())).thenAnswer(inv -> {
            Thread.sleep(120);                                   // Argon2 "lento": força a disputa pelas 2 vagas
            return session();
        });
        int n = 60;
        Map<Integer, Integer> statuses = new ConcurrentHashMap<>();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(n);
        try {
            List<Future<Integer>> fs = new java.util.ArrayList<>();
            for (int i = 0; i < n; i++) {
                final int ip = i;
                fs.add(pool.submit(() -> {
                    start.await(5, TimeUnit.SECONDS);
                    // IPs distintos: o teste é do bulkhead, não do limite por IP
                    MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .header("X-Real-IP", "198.51.100." + (ip % 250 + 1))
                            .content(json(Map.of("identifier", "u" + ip, "password", password)))).andReturn();
                    return r.getResponse().getStatus();
                }));
            }
            start.countDown();
            for (Future<Integer> f : fs) {
                statuses.merge(f.get(30, TimeUnit.SECONDS), 1, Integer::sum);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(statuses.keySet()).as("statuses vistos: " + statuses).containsAnyOf(200, 503).doesNotContain(500);
        assertThat(statuses.getOrDefault(503, 0)).as("o excedente recebeu 503 AUTENTICACAO_OCUPADA: " + statuses).isPositive();
        assertThat(statuses.getOrDefault(200, 0)).isPositive();
    }

    @Test
    void refreshEPublicoELogoutExigeTokenComSidVivo() throws Exception {
        when(identity.refresh(any(), any())).thenReturn(session());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("refreshToken", "abc"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sessionId").value(sid.toString()));
        mvc.perform(post("/api/auth/logout")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
        mvc.perform(authed(post("/api/auth/logout"), "USER", sid)).andExpect(status().isNoContent());
        ArgumentCaptor<CurrentUser> who = ArgumentCaptor.forClass(CurrentUser.class);
        verify(identity).logout(who.capture(), any());
        assertThat(who.getValue().id()).isEqualTo(userId);
        assertThat(who.getValue().sessionId()).isEqualTo(sid);
        // família revogada: o SessionActiveFilter recusa antes do controller
        sessions.revokeFamily(sid, Instant.now());
        mvc.perform(authed(post("/api/auth/logout"), "USER", sid)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("SESSAO_ENCERRADA"));
    }

    @Test
    void papelDesconhecidoRecebe403EmTodoEndpointAutenticado() throws Exception {
        for (MockHttpServletRequestBuilder b : List.of(post("/api/auth/logout"),
                put("/api/auth/password").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("currentPassword", password, "newPassword", "n1" + password, "confirmPassword", "n1" + password))))) {
            mvc.perform(authed(b, "CONVIDADO", sid)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void trocaDeSenhaPropagaBloqueioComRetryAfterEDevolveSessoesEncerradas() throws Exception {
        when(identity.changePassword(any(), any(), any(), any(), any())).thenReturn(2);
        String body = json(Map.of("currentPassword", password, "newPassword", "n1" + password, "confirmPassword", "n1" + password));
        mvc.perform(authed(put("/api/auth/password").contentType(MediaType.APPLICATION_JSON).content(body), "USER", sid))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sessionsEnded").value(2));
        when(identity.changePassword(any(), any(), any(), any(), any())).thenThrow(new ApiException(AuthCodes.MUITAS_TENTATIVAS, 429,
                "Muitas tentativas.", Map.of("retryAfterSeconds", 540L)));
        mvc.perform(authed(put("/api/auth/password").contentType(MediaType.APPLICATION_JSON).content(body), "USER", sid))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("MUITAS_TENTATIVAS"))
                .andExpect(header().string("Retry-After", "540"));
        mvc.perform(put("/api/auth/password").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
    }

    @Test
    void limitePorIpAntesDaSegurancaTrigesimoPrimeiroLoginDa429() throws Exception {
        when(identity.login(any(), any())).thenReturn(session());
        String body = json(Map.of("identifier", "maria.silva", "password", password));
        for (int i = 0; i < AuthRateLimitFilter.ruleFor("POST", "/api/auth/login").orElseThrow().limit(); i++) {
            mvc.perform(post("/api/auth/login").header("X-Real-IP", "203.0.113.99").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/api/auth/login").header("X-Real-IP", "203.0.113.99").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.code").value("MUITAS_TENTATIVAS"))
                .andExpect(header().exists("Retry-After"));
    }
}
