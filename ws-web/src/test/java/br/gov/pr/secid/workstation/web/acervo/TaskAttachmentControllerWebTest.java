package br.gov.pr.secid.workstation.web.acervo;

import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService;
import br.gov.pr.secid.workstation.application.acervo.LegalDeadlineService.LegalDeadlineRuleView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.AttachmentView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceInput;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.EvidenceView;
import br.gov.pr.secid.workstation.application.acervo.TaskAttachmentService.FileContent;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RF41.CA06/CA04 na fatia MVC com a segurança real: 401/403 em todo endpoint, multipart, cabeçalhos do download e trilha de autorização. */
@WebMvcTest(controllers = {TaskAttachmentController.class, LegalDeadlineController.class})
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class TaskAttachmentControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    TaskAttachmentService attachments;
    @MockitoBean
    LegalDeadlineService legal;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final UUID taskId = UUID.randomUUID();
    final UUID attachmentId = UUID.randomUUID();
    final UUID evidenceId = UUID.randomUUID();

    @BeforeEach
    void liveSession() {
        sessions.save(new RefreshRecord("h-" + sid, sid, userId, Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
    }

    private RequestBuilder authed(AbstractMockHttpServletRequestBuilder<?> b, String role) {
        return b.with(jwt().jwt(j -> j.subject(userId.toString()).claim("role", role).claim("sid", sid.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private AttachmentView attachment(EvidenceView evidence) {
        return new AttachmentView(attachmentId, taskId, "Vistoria", "planta.png", "image/png", 120, true, true, MediaScanStatus.NAO_VERIFICADO, true,
                Instant.parse("2026-11-12T12:00:00Z"), evidence);
    }

    private EvidenceView evidence() {
        return new EvidenceView(evidenceId, taskId, attachmentId, "Fissura", Instant.parse("2026-11-12T13:15:00Z"), true, "-25.4284", "-49.2733",
                userId, Instant.parse("2026-11-12T13:20:00Z"));
    }

    private static MockMultipartFile file() {
        return new MockMultipartFile("file", "planta.png", "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'});
    }

    private List<AbstractMockHttpServletRequestBuilder<?>> allEndpoints() {
        String base = "/api/tasks/" + taskId;
        return List.of(
                get(base + "/attachments"),
                multipart(base + "/attachments").file(file()),
                delete(base + "/attachments/" + attachmentId),
                get(base + "/attachments/" + attachmentId + "/content"),
                post(base + "/attachments/" + attachmentId + "/evidence").contentType(MediaType.APPLICATION_JSON).content("{}"),
                get(base + "/evidences"),
                multipart(base + "/evidences").file(file()),
                delete(base + "/evidences/" + evidenceId),
                get("/api/attachments"),
                get("/api/legal-deadlines"));
    }

    /** O mock faz o que o serviço real faz antes de responder: passa pelo ResourceAuthorizer (marca a trilha). */
    private <T> org.mockito.stubbing.Answer<T> authorized(T value) {
        return inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            return value;
        };
    }

    @Test
    void semTokenRecebe401EPapelDesconhecido403() throws Exception {
        for (AbstractMockHttpServletRequestBuilder<?> b : allEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void enviaMultipartListaEApaga() throws Exception {
        when(attachments.upload(any(), eq(taskId), any(), any())).thenAnswer(authorized(attachment(null)));
        mvc.perform(authed(multipart("/api/tasks/" + taskId + "/attachments").file(file()), "USER"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.fileName").value("planta.png")).andExpect(jsonPath("$.image").value(true))
                .andExpect(jsonPath("$.scanStatus").value("NAO_VERIFICADO"));
        ArgumentCaptor<TaskAttachmentService.FileInput> in = ArgumentCaptor.forClass(TaskAttachmentService.FileInput.class);
        verify(attachments).upload(any(), eq(taskId), in.capture(), any());
        assertThat(in.getValue().fileName()).isEqualTo("planta.png");
        assertThat(in.getValue().content()).hasSize(4);

        when(attachments.list(any(), eq(taskId))).thenAnswer(authorized(List.of(attachment(evidence()))));
        mvc.perform(authed(get("/api/tasks/" + taskId + "/attachments"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].evidence.caption").value("Fissura")).andExpect(jsonPath("$[0].evidence.hasLocation").value(true));

        doAnswer(authorized(null)).when(attachments).remove(any(), eq(taskId), eq(attachmentId), any());
        mvc.perform(authed(delete("/api/tasks/" + taskId + "/attachments/" + attachmentId), "USER")).andExpect(status().isNoContent());
        verify(attachments).remove(any(), eq(taskId), eq(attachmentId), any());

        when(attachments.mine(any(), anyInt())).thenReturn(List.of(attachment(null)));
        mvc.perform(authed(get("/api/attachments?limit=20"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$[0].taskTitle").value("Vistoria"));
        verify(attachments).mine(any(), eq(20));
    }

    @Test
    void downloadNaoERenderizavelComoPaginaENomeVaiCodificado() throws Exception {
        when(attachments.content(any(), eq(taskId), eq(attachmentId))).thenAnswer(authorized(
                new FileContent("relatório final.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII), false)));
        mvc.perform(authed(get("/api/tasks/" + taskId + "/attachments/" + attachmentId + "/content"), "USER"))
                .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment;")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("UTF-8''relat%C3%B3rio%20final.pdf")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));

        when(attachments.content(any(), eq(taskId), eq(attachmentId))).thenAnswer(inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            throw new ApiException("MIDIA_EM_QUARENTENA", 423, "Arquivo em verificação.", Map.of());
        });
        mvc.perform(authed(get("/api/tasks/" + taskId + "/attachments/" + attachmentId + "/content"), "USER"))
                .andExpect(status().is(423)).andExpect(jsonPath("$.code").value("MIDIA_EM_QUARENTENA"));
    }

    @Test
    void evidenciaPorMultipartOuMarcandoOAnexo() throws Exception {
        when(attachments.addEvidence(any(), eq(taskId), any(), any(), any())).thenAnswer(authorized(evidence()));
        mvc.perform(authed(multipart("/api/tasks/" + taskId + "/evidences").file(file()).param("caption", "Fissura")
                        .param("takenAt", "2026-11-12T13:15:00Z").param("latitude", "-25.4284").param("longitude", "-49.2733"), "USER"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.latitude").value("-25.4284"));
        verify(attachments).addEvidence(any(), eq(taskId), any(), eq(new EvidenceInput("Fissura", "2026-11-12T13:15:00Z", "-25.4284", "-49.2733")),
                any());

        when(attachments.markEvidence(any(), eq(taskId), eq(attachmentId), any(), any())).thenAnswer(authorized(evidence()));
        mvc.perform(authed(post("/api/tasks/" + taskId + "/attachments/" + attachmentId + "/evidence")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"caption\":\"Fissura\"}"), "USER"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(evidenceId.toString()));

        doAnswer(authorized(null)).when(attachments).removeEvidence(any(), eq(taskId), eq(evidenceId), any());
        mvc.perform(authed(delete("/api/tasks/" + taskId + "/evidences/" + evidenceId), "USER")).andExpect(status().isNoContent());

        when(attachments.evidences(any(), eq(taskId))).thenAnswer(inv -> {
            AuthorizationTrail.record("TASK:" + taskId);
            throw ApiException.notFound("Tarefa");
        });
        mvc.perform(authed(get("/api/tasks/" + taskId + "/evidences"), "USER")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NAO_ENCONTRADO"));
    }

    @Test
    void handlerComIdSemAuthorizerEBloqueadoECatalogoDePrazos() throws Exception {
        when(attachments.list(any(), eq(taskId))).thenReturn(List.of(attachment(null)));
        mvc.perform(authed(get("/api/tasks/" + taskId + "/attachments"), "USER")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$[0]").doesNotExist());

        when(legal.rules(any())).thenReturn(List.of(new LegalDeadlineRuleView(UUID.randomUUID(), TaskCategory.OFICIO_MEMORANDO, "Pedido LAI", 20,
                false, "Lei nº 12.527/2011, art. 11, § 1º", "Resposta", false, null, null)));
        mvc.perform(authed(get("/api/legal-deadlines"), "USER")).andExpect(status().isOk()).andExpect(jsonPath("$[0].days").value(20))
                .andExpect(jsonPath("$[0].businessDays").value(false)).andExpect(jsonPath("$[0].legalBasis").value("Lei nº 12.527/2011, art. 11, § 1º"));
    }
}
