package br.gov.pr.secid.workstation.web.messaging;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.messaging.ConversationService;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.ConversationView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.MessageView;
import br.gov.pr.secid.workstation.application.messaging.ConversationService.Started;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF46 na fatia MVC com a segurança real: 401 sem token, 201/200 ao iniciar, 404 do serviço para quem não participa, 204 ao sair. */
@WebMvcTest(controllers = ConversationController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class ConversationControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    ConversationService conversations;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final UUID convId = UUID.randomUUID();
    final UUID msgId = UUID.randomUUID();

    @BeforeEach
    void liveSession() {
        sessions.save(new RefreshRecord("h-" + sid, sid, userId, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
    }

    private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder b) {
        return b.with(jwt().jwt(j -> j.subject(userId.toString()).claim("role", "USER").claim("sid", sid.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private static String json(Map<String, ?> m) {
        return new tools.jackson.databind.ObjectMapper().writeValueAsString(m);
    }

    private ConversationView view() {
        return new ConversationView(convId, ConversationKind.DIRETA, null, List.of(), null, 0, Instant.now(), true);
    }

    @Test
    void semTokenRecebe401EmTodoEndpoint() throws Exception {
        List<MockHttpServletRequestBuilder> all = List.of(get("/api/conversations"), get("/api/conversations/unread"),
                post("/api/conversations").contentType(MediaType.APPLICATION_JSON).content("{}"), get("/api/conversations/" + convId),
                get("/api/conversations/" + convId + "/messages"), get("/api/conversations/" + convId + "/messages/changes?since=x"),
                post("/api/conversations/" + convId + "/messages").contentType(MediaType.APPLICATION_JSON).content("{}"),
                put("/api/conversations/" + convId + "/messages/" + msgId).contentType(MediaType.APPLICATION_JSON).content("{}"),
                delete("/api/conversations/" + convId + "/messages/" + msgId), post("/api/conversations/" + convId + "/read"),
                delete("/api/conversations/" + convId + "/participants/me"));
        for (MockHttpServletRequestBuilder b : all) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
        }
    }

    @Test
    void iniciar201QuandoNovaE200QuandoReaproveita() throws Exception {
        String body = json(Map.of("participantIds", List.of(UUID.randomUUID().toString())));
        when(conversations.start(any(), any(), any(), any())).thenReturn(new Started(view(), true), new Started(view(), false));
        mvc.perform(authed(post("/api/conversations")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(convId.toString()));
        mvc.perform(authed(post("/api/conversations")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.kind").value("DIRETA"));
    }

    @Test
    void enviarComTrilhaDevolve201EQuemNaoParticipaRecebe404() throws Exception {
        Instant t = Instant.parse("2026-10-31T12:00:00Z");
        when(conversations.send(any(), eq(convId), eq("olá"))).thenAnswer(inv -> {
            AuthorizationTrail.record("CONVERSATION");
            return new MessageView(msgId, convId, userId, "olá", true, false, false, t, null, t);
        });
        mvc.perform(authed(post("/api/conversations/" + convId + "/messages")).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("body", "olá"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.body").value("olá")).andExpect(jsonPath("$.mine").value(true));

        UUID other = UUID.randomUUID();
        when(conversations.get(any(), eq(other))).thenAnswer(inv -> {
            AuthorizationTrail.record("CONVERSATION");
            throw ApiException.notFound("Conversa");
        });
        mvc.perform(authed(get("/api/conversations/" + other))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
    }

    @Test
    void sairDevolve204() throws Exception {
        doAnswer(inv -> {
            AuthorizationTrail.record("CONVERSATION");
            return null;
        }).when(conversations).leave(any(), eq(convId), any());
        mvc.perform(authed(delete("/api/conversations/" + convId + "/participants/me"))).andExpect(status().isNoContent());
        verify(conversations).leave(any(), eq(convId), any());
    }
}
