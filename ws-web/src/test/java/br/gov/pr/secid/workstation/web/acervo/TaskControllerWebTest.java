package br.gov.pr.secid.workstation.web.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
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
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF4/RF12/RF41 na fatia MVC com a segurança real: 401/403 em todo endpoint, 201 no criador, 404/409/422 do serviço e trilha de autorização. */
@WebMvcTest(controllers = TaskController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class TaskControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    TaskService tasks;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final UUID taskId = UUID.randomUUID();

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

    private TaskView view(long version) {
        return new TaskView(taskId, version, userId, null, "Relatório", null, TaskType.DOCUMENTO, null, Priority.MEDIA, TaskState.DISPONIVEL,
                LocalDate.of(2026, 11, 1), null, AccessClassification.INTERNO, Visibility.PRIVADA, null, null, null, "Objetivo", WorkArea.PESQUISA,
                List.of(), List.of(), List.of(), Map.of(), true, Instant.now(), Instant.now());
    }

    private List<MockHttpServletRequestBuilder> allEndpoints() {
        return List.of(
                get("/api/tasks"),
                get("/api/tasks/" + taskId),
                post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "T", "type", "DOCUMENTO"))),
                put("/api/tasks/" + taskId).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "T", "version", 0))),
                post("/api/tasks/" + taskId + "/transitions").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("to", "EM_USO", "version", 0))));
    }

    @Test
    void semTokenRecebe401EPapelDesconhecido403() throws Exception {
        for (MockHttpServletRequestBuilder b : allEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void criaComBriefingEDevolve201() throws Exception {
        when(tasks.create(any(), any(), any())).thenReturn(view(1));
        String body = json(Map.of("title", "Relatório", "type", "DOCUMENTO", "area", "PESQUISA", "objective", "Objetivo",
                "deliverables", List.of(Map.of("text", "PDF")), "acceptanceCriteria", List.of(Map.of("text", "Revisado", "done", false)),
                "references", List.of(Map.of("label", "W3C", "url", "https://www.w3.org/")), "extensions", Map.of("method", "Survey")));
        mvc.perform(authed(post("/api/tasks"), "USER").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(taskId.toString())).andExpect(jsonPath("$.area").value("PESQUISA"));
        when(tasks.listMine(any(), anyInt())).thenReturn(List.of(view(1)));
        mvc.perform(authed(get("/api/tasks?limit=10"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$[0].title").value("Relatório"));
    }

    @Test
    void edicaoExigeVersaoEPropagaConflitoEAusencia() throws Exception {
        mvc.perform(authed(put("/api/tasks/" + taskId), "USER").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "x"))))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.details.fields.version").exists());
        verify(tasks, never()).update(any(), any(), any(), anyLong(), any());

        when(tasks.update(any(), eq(taskId), any(), eq(3L), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            throw new OptimisticLockingFailureException("stale");
        });
        mvc.perform(authed(put("/api/tasks/" + taskId), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "x", "type", "DOCUMENTO", "version", 3)))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EDICAO_CONCORRENTE"));

        when(tasks.get(any(), eq(taskId))).thenAnswer(inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            throw ApiException.notFound("Tarefa");
        });
        mvc.perform(authed(get("/api/tasks/" + taskId), "USER")).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
    }

    @Test
    void transicaoValidaCorpoEDevolveNovoEstado() throws Exception {
        mvc.perform(authed(post("/api/tasks/" + taskId + "/transitions"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("reason", "x")))).andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("VALIDACAO"));
        when(tasks.transition(any(), eq(taskId), any(), any())).thenAnswer(inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            return view(2);
        });
        mvc.perform(authed(post("/api/tasks/" + taskId + "/transitions"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("to", "EM_USO", "version", 1)))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(2));
    }

    @Test
    void handlerComIdSemAuthorizerEBloqueado() throws Exception {
        when(tasks.get(any(), eq(taskId))).thenReturn(view(1));
        mvc.perform(authed(get("/api/tasks/" + taskId), "USER")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.title").doesNotExist());
    }
}
