package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RefreshTokenMirrorPort;
import br.gov.pr.secid.workstation.application.identity.SessionService;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RF2.CA05 pela fatia MVC com a segurança e o {@link SessionService} reais (Bloco 4, D-62): lista sem hash de token, encerra a própria
 * sessão (o refresh dela deixa de valer), 404 idêntico para sessão alheia ou inexistente e 401 sem token.
 */
@WebMvcTest(controllers = SessionsController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class, SessionService.class, ResourceAuthorizer.class})
class SessionsControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore store;
    @MockitoBean
    RefreshTokenMirrorPort mirror;
    @MockitoBean
    AuditLogPort audit;
    @MockitoBean
    UserRepositoryPort users;

    final UUID maria = UUID.randomUUID();
    final UUID joao = UUID.randomUUID();
    final UUID atual = UUID.randomUUID();
    final UUID celular = UUID.randomUUID();
    final UUID doJoao = UUID.randomUUID();

    private void live(UUID family, UUID user, String device) {
        Instant now = Instant.now();
        store.save(new RefreshRecord("hash-" + family, family, user, now, now.plus(Duration.ofDays(1)), null, null, false, device));
    }

    @BeforeEach
    void sessions() {
        live(atual, maria, "Notebook");
        live(celular, maria, "Celular");
        live(doJoao, joao, "Do João");
    }

    private MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder b, UUID user, UUID family) {
        return b.with(jwt().jwt(j -> j.subject(user.toString()).claim("role", "USER").claim("sid", family.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    void listaAsSessoesDaPessoaComAAtualMarcadaESemHash() throws Exception {
        mvc.perform(as(get("/api/auth/sessions"), maria, atual))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(atual.toString()))
                .andExpect(jsonPath("$[0].current").value(true))
                .andExpect(jsonPath("$[0].deviceName").value("Notebook"))
                .andExpect(jsonPath("$[1].id").value(celular.toString()))
                .andExpect(jsonPath("$[1].current").value(false))
                .andExpect(jsonPath("$[0].tokenHash").doesNotExist());
        mvc.perform(get("/api/auth/sessions")).andExpect(status().isUnauthorized());
    }

    @Test
    void encerrarSessaoPropriaRevogaAFamiliaEAlheiaDa404() throws Exception {
        mvc.perform(as(delete("/api/auth/sessions/" + celular), maria, atual)).andExpect(status().isNoContent());
        assertThat(store.familyActive(celular, Instant.now())).as("o refresh do celular deixa de valer").isFalse();
        // o access token da sessão encerrada cai no SessionActiveFilter
        mvc.perform(as(get("/api/auth/sessions"), maria, celular)).andExpect(status().isUnauthorized());

        String alheia = mvc.perform(as(delete("/api/auth/sessions/" + doJoao), maria, atual))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"))
                .andReturn().getResponse().getContentAsString();
        String inexistente = mvc.perform(as(delete("/api/auth/sessions/" + UUID.randomUUID()), maria, atual))
                .andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        tools.jackson.databind.ObjectMapper om = new tools.jackson.databind.ObjectMapper();
        assertThat(om.readTree(alheia).get("message")).as("mesma mensagem: não confirma que o id existe")
                .isEqualTo(om.readTree(inexistente).get("message"));
        assertThat(store.familyActive(doJoao, Instant.now())).as("a sessão do João continua viva").isTrue();
    }

    @Test
    void sairDosOutrosMantemSoAAtual() throws Exception {
        mvc.perform(as(delete("/api/auth/sessions"), maria, atual)).andExpect(status().isOk()).andExpect(jsonPath("$.sessionsEnded").value(1));
        assertThat(store.familyActive(atual, Instant.now())).isTrue();
        assertThat(store.familyActive(celular, Instant.now())).isFalse();
        assertThat(store.familyActive(doJoao, Instant.now())).isTrue();
    }
}
