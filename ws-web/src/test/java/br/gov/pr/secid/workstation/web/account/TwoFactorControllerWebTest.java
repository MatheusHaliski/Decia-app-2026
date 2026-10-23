package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.TwoFactorService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF2.CA02 / D-144 na fatia MVC com a segurança real: 401 sem token, 403 para papel desconhecido, validação e erros de negócio. */
@WebMvcTest(controllers = TwoFactorController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class TwoFactorControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    TwoFactorService twoFactor;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();

    @BeforeEach
    void liveSession() {
        sessions.save(new RefreshRecord("h-" + sid, sid, userId, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
    }

    private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b, String role) {
        return b.with(jwt().jwt(j -> j.subject(userId.toString()).claim("role", role).claim("sid", sid.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private static MockHttpServletRequestBuilder postJson(String path, Map<String, ?> body) {
        return post(path).contentType(MediaType.APPLICATION_JSON).content(new tools.jackson.databind.ObjectMapper().writeValueAsString(body));
    }

    private List<MockHttpServletRequestBuilder> allEndpoints() {
        return List.of(get("/api/me/2fa"),
                postJson("/api/me/2fa/setup", Map.of("currentPassword", "x")),
                postJson("/api/me/2fa/enable", Map.of("code", "123456")),
                postJson("/api/me/2fa/disable", Map.of("currentPassword", "x", "code", "123456")),
                postJson("/api/me/2fa/recovery-codes", Map.of("currentPassword", "x", "code", "123456")));
    }

    @Test
    void semTokenRecebe401EPapelDesconhecido403EmTodosOsEndpoints() throws Exception {
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
        }
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void ativacaoDevolveSegredoECodigosEErrosDeNegocioSaemComCodigo() throws Exception {
        when(twoFactor.status(any())).thenReturn(new TwoFactorService.Status(false, null, 0, false));
        when(twoFactor.setup(any(), eq("certa"), any())).thenReturn(new TwoFactorService.Setup("ABC234", "otpauth://totp/x", "Work Station",
                "maria", 6, 30));
        when(twoFactor.enable(any(), eq("000000"), any())).thenThrow(new ApiException(AuthCodes.DOIS_FATORES_INVALIDO, 422, "Código inválido."));
        when(twoFactor.enable(any(), eq("123456"), any())).thenReturn(new TwoFactorService.RecoveryCodes(List.of("abcd-efgh")));

        mvc.perform(authed(get("/api/me/2fa"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(authed(postJson("/api/me/2fa/setup", Map.of("currentPassword", "certa")), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.secret").value("ABC234")).andExpect(jsonPath("$.otpauthUri").value("otpauth://totp/x"));
        mvc.perform(authed(postJson("/api/me/2fa/setup", Map.of("currentPassword", "")), "USER")).andExpect(status().isUnprocessableContent());
        mvc.perform(authed(postJson("/api/me/2fa/enable", Map.of("code", "000000")), "USER")).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value(AuthCodes.DOIS_FATORES_INVALIDO));
        mvc.perform(authed(postJson("/api/me/2fa/enable", Map.of("code", "123456")), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.recoveryCodes[0]").value("abcd-efgh"));
    }
}
