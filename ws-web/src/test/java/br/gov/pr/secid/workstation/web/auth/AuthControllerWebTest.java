package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthenticatedUser;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.LoginCommand;
import br.gov.pr.secid.workstation.application.identity.TokenIssuerPort;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.SecurityConfig;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.error.GlobalExceptionHandler;
import br.gov.pr.secid.workstation.web.ratelimit.RateLimitConfig;
import br.gov.pr.secid.workstation.web.security.ApiErrorAccessDeniedHandler;
import br.gov.pr.secid.workstation.web.security.ApiErrorAuthenticationEntryPoint;
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

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code POST /api/auth/login} na fatia MVC com a segurança real: rota pública, corpo validado (422), erros do
 * IdentityService no formato ApiError, resposta com no-store, e o AuthRateLimitFilter real barrando o 31º pedido do IP.
 */
@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class,
        ApiErrorAuthenticationEntryPoint.class, ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class,
        RateLimitConfig.class, ClientIpResolver.class})
class AuthControllerWebTest {
    private static final AuthenticatedUser MARIA = new AuthenticatedUser(UUID.randomUUID(), "maria", Role.USER, ProfileType.EMPREGADO);

    @Autowired
    MockMvc mvc;

    @MockitoBean
    IdentityService identity;

    @MockitoBean
    TokenIssuerPort tokens;

    private static String body(String identifier, String password) {
        return "{\"identifier\":\"" + identifier + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void loginCertoRespondeTokenCartaoDaContaESemCache() throws Exception {
        when(identity.login(any(LoginCommand.class), anyString(), any())).thenReturn(MARIA);
        when(tokens.issueAccessToken(eq(MARIA), any(UUID.class))).thenReturn("jwt-de-teste");
        when(tokens.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "Senha-certa-1"))
                        .header("X-Real-IP", "203.0.113.9").header("User-Agent", "teste/1.0"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().exists(CorrelationIdFilter.HEADER))
                .andExpect(jsonPath("$.accessToken").value("jwt-de-teste"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.id").value(MARIA.id().toString()))
                .andExpect(jsonPath("$.user.username").value("maria"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.profileType").value("EMPREGADO"));
        ArgumentCaptor<LoginCommand> cmd = ArgumentCaptor.forClass(LoginCommand.class);
        verify(identity).login(cmd.capture(), eq("203.0.113.9"), eq("teste/1.0"));
        assertThat(cmd.getValue().identifier()).isEqualTo("maria");
        assertThat(cmd.getValue().password().toString()).isEqualTo("Senha-certa-1");
        assertThat(cmd.getValue().toString()).doesNotContain("Senha-certa-1");
    }

    @Test
    void credenciaisInvalidasEContaIndisponivelSaemComoApiError() throws Exception {
        when(identity.login(any(LoginCommand.class), anyString(), any()))
                .thenThrow(new ApiException(IdentityService.CREDENCIAIS_INVALIDAS, 401, "E-mail/usuário ou senha incorretos."))
                .thenThrow(new ApiException(IdentityService.CONTA_INDISPONIVEL, 403, "Esta conta não está disponível."));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "errada")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("CREDENCIAIS_INVALIDAS"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "certa")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CONTA_INDISPONIVEL"));
    }

    @Test
    void corpoSemIdentificadorOuSenhaDa422SemChegarAoServico() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("", "x")))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VALIDACAO"))
                .andExpect(jsonPath("$.details.fields.identifier").exists());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"identifier\":\"maria\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.details.fields.password").exists());
        verify(identity, org.mockito.Mockito.never()).login(any(), any(), any());
    }

    @Test
    void trigesimoPrimeiroLoginDoMesmoIpRecebe429AntesDoServico() throws Exception {
        when(identity.login(any(LoginCommand.class), anyString(), any()))
                .thenThrow(new ApiException(IdentityService.CREDENCIAIS_INVALIDAS, 401, "x"));
        for (int i = 0; i < 30; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "errada"))
                    .header("X-Real-IP", "198.51.100.77")).andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "errada"))
                        .header("X-Real-IP", "198.51.100.77"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("MUITAS_TENTATIVAS"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
        verify(identity, org.mockito.Mockito.times(30)).login(any(), any(), any());
        // outro IP segue livre
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body("maria", "errada"))
                .header("X-Real-IP", "198.51.100.78")).andExpect(status().isUnauthorized());
    }
}
