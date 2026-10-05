package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.account.AccountService;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.domain.identity.UserPreferences;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF3 na fatia MVC com a segurança real: 401 sem token, 403 para papel desconhecido em CADA endpoint, BOLA no /api/users/{id}. */
@WebMvcTest(controllers = MeController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class MeControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    AccountService account;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final String password = "pw-" + UUID.randomUUID();

    @BeforeEach
    void liveSession() {
        sessions.save(new RefreshRecord("h-" + sid, sid, userId, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
    }

    private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b, String role) {
        return b.with(jwt().jwt(j -> j.subject(userId.toString()).claim("role", role).claim("sid", sid.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private static String json(Map<String, ?> m) {
        return new tools.jackson.databind.ObjectMapper().writeValueAsString(m);
    }

    private UserView view() {
        return new UserView(userId, "maria", "Maria", null, "maria@exemplo.gov.br", true, null, "EMPREGADO", "USER", "ACTIVE", null, null,
                null, null, false, false, "SO_EU", false, null, "1.0", "1.0", null, Instant.now());
    }

    private List<MockHttpServletRequestBuilder> allEndpoints() {
        return List.of(
                get("/api/me"),
                get("/api/users/" + userId),
                patch("/api/me").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("displayName", "M"))),
                patch("/api/me/sensitive").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("currentPassword", password, "phone", "+5541999990000"))),
                post("/api/me/deletion").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("currentPassword", password))),
                delete("/api/me/deletion"),
                get("/api/me/preferences"),
                put("/api/me/preferences").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("theme", "ESCURO"))));
    }

    @Test
    void semTokenRecebe401EmTodosOsEndpoints() throws Exception {
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
        }
    }

    @Test
    void papelDesconhecidoRecebe403AcessoNegadoEmTodosOsEndpoints() throws Exception {
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void sidRevogadoRecebe401SessaoEncerrada() throws Exception {
        sessions.revokeFamily(sid, Instant.now());
        mvc.perform(authed(get("/api/me"), "USER")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("SESSAO_ENCERRADA"));
    }

    @Test
    void perfilDeTerceiroDa403PeloGuardEOProprioOuAdminPassa() throws Exception {
        UUID other = UUID.randomUUID();
        when(account.profile(any(), eq(other))).thenThrow(ApiException.forbidden("x"));
        when(account.profile(any(), eq(userId))).thenReturn(view());
        mvc.perform(authed(get("/api/users/" + other), "USER")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        mvc.perform(authed(get("/api/users/" + userId), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$.username").value("maria"));
        ArgumentCaptor<CurrentUser> actor = ArgumentCaptor.forClass(CurrentUser.class);
        verify(account).profile(actor.capture(), eq(userId));
        assertThat(actor.getValue().id()).isEqualTo(userId);
        assertThat(actor.getValue().sessionId()).isEqualTo(sid);
        mvc.perform(authed(get("/api/users/nao-uuid"), "USER")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("PARAMETRO_INVALIDO"));
    }

    @Test
    void contratoDosEndpoints() throws Exception {
        when(account.me(any())).thenReturn(view());
        mvc.perform(authed(get("/api/me"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("maria@exemplo.gov.br"))
                .andExpect(jsonPath("$.termsVersion").value("1.0"));
        when(account.update(any(), any(), any())).thenReturn(view());
        mvc.perform(authed(patch("/api/me").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("displayName", "M"))), "ADMIN"))
                .andExpect(status().isOk());
        mvc.perform(authed(patch("/api/me").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("bio", "x".repeat(1001)))), "USER"))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.details.fields.bio").exists());
        when(account.updateSensitive(any(), any(), any()))
                .thenThrow(new ApiException(AuthCodes.MUITAS_TENTATIVAS, 429, "x", Map.of("retryAfterSeconds", 300L)));
        mvc.perform(authed(patch("/api/me/sensitive").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("currentPassword", password, "email", "nova@exemplo.gov.br"))), "USER"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "300"));
        mvc.perform(authed(patch("/api/me/sensitive").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("email", "x@y.z"))), "USER"))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.details.fields.currentPassword").exists());
        Instant now = Instant.now();
        when(account.requestDeletion(any(), any(), any()))
                .thenReturn(new AccountService.DeletionReceipt("DELETION_SCHEDULED", now, now.plus(Duration.ofDays(30)), true));
        mvc.perform(authed(post("/api/me/deletion").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("currentPassword", password))), "USER"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("DELETION_SCHEDULED")).andExpect(jsonPath("$.cancelable").value(true));
        when(account.cancelDeletion(any(), any())).thenReturn(new AccountService.DeletionReceipt("ACTIVE", null, null, false));
        mvc.perform(authed(delete("/api/me/deletion"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        UserPreferences p = new UserPreferences();
        p.setUserId(userId);
        when(account.preferences(any())).thenReturn(p);
        when(account.updatePreferences(any(), any(), any())).thenReturn(p);
        mvc.perform(authed(get("/api/me/preferences"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$.theme").value("AUTO"))
                .andExpect(jsonPath("$.wipLimit").value(3));
        mvc.perform(authed(put("/api/me/preferences").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("theme", "ESCURO", "wipLimit", 5))), "USER"))
                .andExpect(status().isOk());
        ArgumentCaptor<UserPreferences> prefs = ArgumentCaptor.forClass(UserPreferences.class);
        verify(account).updatePreferences(any(), prefs.capture(), any());
        assertThat(prefs.getValue().getTheme()).isEqualTo("ESCURO");
        assertThat(prefs.getValue().getWipLimit()).isEqualTo(5);
    }
}
