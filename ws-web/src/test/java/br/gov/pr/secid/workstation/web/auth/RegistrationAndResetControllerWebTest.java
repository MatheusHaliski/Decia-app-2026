package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.PasswordResetService;
import br.gov.pr.secid.workstation.application.identity.RegistrationService;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
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
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF1/RF2.CA08 na fatia MVC: rotas públicas (sem token), respostas 202 sem oráculo e erros no formato ApiError. */
@WebMvcTest(controllers = {RegistrationController.class, PasswordResetController.class})
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class RegistrationAndResetControllerWebTest {

    @Autowired
    MockMvc mvc;
    @MockitoBean
    RegistrationService registration;
    @MockitoBean
    PasswordResetService reset;

    final String password = "pw-" + UUID.randomUUID();

    private static String json(Map<String, ?> m) {
        return new tools.jackson.databind.ObjectMapper().writeValueAsString(m);
    }

    @Test
    void cadastroEPublicoERespondeOMesmo202ParaEmailNovoOuExistente() throws Exception {
        when(registration.register(any(), any())).thenReturn(RegistrationService.Receipt.verificationSent("maria@exemplo.gov.br"));
        Map<String, Object> body = Map.of("profileType", "EMPREGADO", "fullName", "Maria da Silva", "username", "maria", "email", "maria@exemplo.gov.br",
                "password", password, "confirmPassword", password, "acceptTerms", true);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(body)).header("User-Agent", "JUnit"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("VERIFICACAO_ENVIADA"))
                .andExpect(jsonPath("$.maskedEmail").value("m***@e***.br"));
        ArgumentCaptor<RequestContext> ctx = ArgumentCaptor.forClass(RequestContext.class);
        verify(registration).register(any(), ctx.capture());
        assertThat(ctx.getValue().userAgent()).isEqualTo("JUnit");
        org.mockito.Mockito.doThrow(ApiException.unprocessable(AuthCodes.NOME_RESERVADO, "reservado", Map.of("fields", Map.of("username", "x"))))
                .when(registration).register(any(), any());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("NOME_RESERVADO"));
        org.mockito.Mockito.doThrow(new ApiException(AuthCodes.USERNAME_EM_USO, 409, "x", Map.of("suggestions", List.of("maria.25"))))
                .when(registration).register(any(), any());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.details.suggestions[0]").value("maria.25"));
    }

    @Test
    void confirmacaoReenvioEUsernamesSaoPublicosEValidados() throws Exception {
        when(registration.confirmEmail(eq("maria@exemplo.gov.br"), eq("123456"), any(), any()))
                .thenThrow(new ApiException(AuthCodes.CODIGO_INVALIDO, 422, "x", Map.of("remainingAttempts", 4)));
        mvc.perform(post("/api/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "maria@exemplo.gov.br", "code", "123456"))))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("CODIGO_INVALIDO"))
                .andExpect(jsonPath("$.details.remainingAttempts").value(4));
        mvc.perform(post("/api/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("email", ""))))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("VALIDACAO"));
        when(registration.confirmEmail(any(), eq("000000"), any(), any()))
                .thenThrow(new ApiException(AuthCodes.MUITAS_TENTATIVAS, 429, "x", Map.of("retryAfterSeconds", 1200L)));
        mvc.perform(post("/api/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "maria@exemplo.gov.br", "code", "000000"))))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "1200"));
        mvc.perform(post("/api/auth/email-verification/resend").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("email", "x@exemplo.gov.br"))))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("VERIFICACAO_ENVIADA"));
        when(registration.availability("admin")).thenReturn(new RegistrationService.Availability("admin", false, "RESERVADO", List.of("admin.pr")));
        mvc.perform(get("/api/usernames/admin/availability")).andExpect(status().isOk()).andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.reason").value("RESERVADO")).andExpect(jsonPath("$.suggestions[0]").value("admin.pr"));
        when(registration.suggestions("Maria")).thenReturn(List.of("maria", "maria.25"));
        mvc.perform(get("/api/auth/username-suggestions").param("base", "Maria")).andExpect(status().isOk())
                .andExpect(jsonPath("$.suggestions[1]").value("maria.25"));
    }

    @Test
    void redefinicaoDeSenhaRespondeIgualEConfirmacaoDevolve204OuLinkInvalido() throws Exception {
        mvc.perform(post("/api/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("email", "ninguem@exemplo.gov.br"))))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("SE_O_EMAIL_EXISTIR_ENVIAMOS_INSTRUCOES"));
        verify(reset).request(eq("ninguem@exemplo.gov.br"), any());
        mvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "t", "newPassword", password, "confirmPassword", password))))
                .andExpect(status().isNoContent());
        org.mockito.Mockito.doThrow(new ApiException(AuthCodes.LINK_INVALIDO, 422, "x")).when(reset).confirm(eq("ruim"), any(), any(), any());
        mvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("token", "ruim", "newPassword", password, "confirmPassword", password))))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("LINK_INVALIDO"));
        mvc.perform(post("/api/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("token", "t"))))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.details.fields.newPassword").exists());
    }
}
