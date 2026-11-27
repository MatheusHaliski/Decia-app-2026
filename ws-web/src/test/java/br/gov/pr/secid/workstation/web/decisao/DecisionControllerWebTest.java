package br.gov.pr.secid.workstation.web.decisao;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.decisao.DecisionCommand;
import br.gov.pr.secid.workstation.application.decisao.DecisionService;
import br.gov.pr.secid.workstation.application.decisao.DecisionView;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
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
import org.springframework.dao.OptimisticLockingFailureException;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF29 fase 7 na fatia MVC com a segurança real: 401/403 em toda rota, 201, 400/422 de corpo, 404 uniforme, 403 BFLA e 409 de versão. */
@WebMvcTest(controllers = DecisionController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class DecisionControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    DecisionService decisions;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final UUID decisionId = UUID.randomUUID();

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

    private DecisionView view(long version, DecisionLifecycle status) {
        DecisionView.Root root = new DecisionView.Root(decisionId, version, "Fornecedor", "Qual fornecedor contratar?", null, null, null, null,
                List.of(), null, userId, userId, UUID.randomUUID(), null, null, null, status, DecisionComplexity.RAPIDA, DecisionKind.OPERACIONAL,
                DecisionLevel.MEDIO, DecisionLevel.MEDIO, Visibility.PRIVADA, AccessClassification.INTERNO, false, false, null, null, null, null,
                null, null, Instant.now(), Instant.now());
        return new DecisionView(root, List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(),
                new DecisionView.Permissions(true, true, true, false, true));
    }

    private static String commands(long version) {
        return json(Map.of("version", version, "commands", List.of(Map.of("type", "TRANSITION", "to", "ENQUADRAMENTO"))));
    }

    private List<MockHttpServletRequestBuilder> allEndpoints() {
        return List.of(
                get("/api/decisions"),
                get("/api/decisions/" + decisionId),
                post("/api/decisions").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("question", "Qual fornecedor contratar?", "complexity", "RAPIDA", "impact", "MEDIO"))),
                post("/api/decisions/" + decisionId + "/commands").contentType(MediaType.APPLICATION_JSON).content(commands(0)));
    }

    @Test
    void semTokenRecebe401EPapelDesconhecido403() throws Exception {
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
        verify(decisions, never()).list(any(), eq(50));
    }

    @Test
    void criaDevolve201EValidaCorpo() throws Exception {
        when(decisions.create(any(), any(), any())).thenReturn(view(0, DecisionLifecycle.RASCUNHO));
        mvc.perform(authed(post("/api/decisions"), "USER").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("question", "Qual fornecedor contratar?", "complexity", "RAPIDA", "impact", "MEDIO",
                                "criteria", List.of("Custo")))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.decision.id").value(decisionId.toString()))
                .andExpect(jsonPath("$.decision.status").value("RASCUNHO")).andExpect(jsonPath("$.permissions.decide").value(true));
        mvc.perform(authed(post("/api/decisions"), "USER").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("question", "x"))))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDACAO"))
                .andExpect(jsonPath("$.details.fields.complexity").exists());
        mvc.perform(authed(post("/api/decisions"), "USER").contentType(MediaType.APPLICATION_JSON).content("{nao-json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("JSON_INVALIDO"));
        mvc.perform(authed(post("/api/decisions"), "USER").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("question", "Qual?", "complexity", "ENORME", "impact", "MEDIO"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listaEAbreComTrilhaE404Uniforme() throws Exception {
        when(decisions.list(any(), eq(20))).thenReturn(List.of(view(3, DecisionLifecycle.COMPARACAO)));
        mvc.perform(authed(get("/api/decisions?limit=20"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].decision.version").value(3));
        mvc.perform(authed(get("/api/decisions?limit=x"), "USER")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PARAMETRO_INVALIDO"));

        when(decisions.get(any(), eq(decisionId))).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:VIEW");
            return view(3, DecisionLifecycle.COMPARACAO);
        });
        mvc.perform(authed(get("/api/decisions/" + decisionId), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.decision.status").value("COMPARACAO"));

        UUID other = UUID.randomUUID();
        when(decisions.get(any(), eq(other))).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:VIEW");
            throw ApiException.notFound("Decisão");
        });
        mvc.perform(authed(get("/api/decisions/" + other), "USER")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
        mvc.perform(authed(get("/api/decisions/nao-uuid"), "USER")).andExpect(status().isBadRequest());
    }

    @Test
    void comandosValidamCorpoEPropagam403409E422() throws Exception {
        String url = "/api/decisions/" + decisionId + "/commands";
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("version", 1, "commands", List.of()))))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.details.fields.commands").exists());
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("commands", List.of(Map.of("type", "REOPEN"))))))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.details.fields.version").exists());
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("version", 1, "commands", List.of(Map.of("type", "APAGAR_TUDO"))))))
                .andExpect(status().isBadRequest());
        verify(decisions, never()).apply(any(), any(), anyLong(), anyList(), any());

        when(decisions.apply(any(), eq(decisionId), eq(4L), anyList(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:EDIT");
            return view(5, DecisionLifecycle.ENQUADRAMENTO);
        });
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON).content(commands(4)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.decision.version").value(5));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<DecisionCommand>> cap = ArgumentCaptor.forClass(List.class);
        verify(decisions).apply(any(), eq(decisionId), eq(4L), cap.capture(), any());
        assertThat(cap.getValue()).singleElement().satisfies(c -> {
            assertThat(c.type()).isEqualTo(DecisionCommand.Type.TRANSITION);
            assertThat(c.to()).isEqualTo(DecisionLifecycle.ENQUADRAMENTO);
        });

        when(decisions.apply(any(), eq(decisionId), eq(1L), anyList(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:DECIDE");
            throw ApiException.forbidden("Você não tem permissão para esta ação.");
        });
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON).content(commands(1)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));

        when(decisions.apply(any(), eq(decisionId), eq(2L), anyList(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:VIEW");
            throw new OptimisticLockingFailureException("stale");
        });
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON).content(commands(2)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EDICAO_CONCORRENTE"));

        when(decisions.apply(any(), eq(decisionId), eq(3L), anyList(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:DECIDE");
            throw ApiException.unprocessable("DECISAO_INCOMPLETA", "Faltam itens obrigatórios para decidir.",
                    Map.of("blocking", List.of("MOTIVO_VAZIO")));
        });
        mvc.perform(authed(post(url), "USER").contentType(MediaType.APPLICATION_JSON).content(commands(3)))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.details.blocking[0]").value("MOTIVO_VAZIO"));

        UUID other = UUID.randomUUID();
        when(decisions.apply(any(), eq(other), anyLong(), anyList(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("DECISION:VIEW");
            throw ApiException.notFound("Decisão");
        });
        mvc.perform(authed(post("/api/decisions/" + other + "/commands"), "USER").contentType(MediaType.APPLICATION_JSON).content(commands(0)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
    }
}
