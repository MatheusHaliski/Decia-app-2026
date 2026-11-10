package br.gov.pr.secid.workstation.web.connectors;

import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.connectors.ConnectorErrors;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorAccountView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorAuthorizeView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ConnectorProviderView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ExternalItemView;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ExternalItemsPage;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.ImportInput;
import br.gov.pr.secid.workstation.application.connectors.ConnectorService.LinkImportInput;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.connectors.ConnectionStatus;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorMode;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
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
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato REST dos conectores na fatia MVC com a segurança real: 401/403 nas rotas autenticadas, o callback público respondendo 302,
 * os formatos JSON (camelCase) do contrato, os códigos de erro (400/404/409/502/503) e a trilha de autorização nas rotas com id.
 */
@WebMvcTest(controllers = ConnectorController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class})
class ConnectorControllerWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    ConnectorService connectors;

    final UUID userId = UUID.randomUUID();
    final UUID sid = UUID.randomUUID();
    final UUID accountId = UUID.randomUUID();
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

    private TaskView imported(LinkMode mode) {
        return new TaskView(taskId, 1, userId, null, "Relatório", null, TaskType.DOCUMENTO, null, Priority.MEDIA, TaskState.DISPONIVEL, null, null,
                AccessClassification.INTERNO, Visibility.PRIVADA, SourceKind.GOOGLE_DOCS, mode, "https://docs.google.com/document/d/1/edit", null,
                null, null, null, null, List.of(), List.of(), List.of(), Map.of(), true, Instant.now(), Instant.now());
    }

    private void trail() {
        AuthorizationTrail.record("CONNECTOR");
    }

    private List<MockHttpServletRequestBuilder> authenticatedEndpoints() {
        return List.of(
                get("/api/connectors/providers"),
                get("/api/connectors"),
                post("/api/connectors/google/authorize").contentType(MediaType.APPLICATION_JSON).content("{}"),
                delete("/api/connectors/" + accountId),
                get("/api/connectors/" + accountId + "/items"),
                post("/api/connectors/" + accountId + "/import").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("externalId", "1", "linkMode", "VINCULADO"))),
                post("/api/connectors/link-import").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("url", "https://drive.google.com/x"))));
    }

    @Test
    void rotasAutenticadasRecusamSemTokenEPapelDesconhecido() throws Exception {
        for (MockHttpServletRequestBuilder b : authenticatedEndpoints()) {
            mvc.perform(b).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("NAO_AUTENTICADO"));
            mvc.perform(authed(b, "CONVIDADO")).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACESSO_NEGADO"));
        }
    }

    @Test
    void callbackEPublicoERespondeSempre302() throws Exception {
        when(connectors.callback(eq("st"), eq("cd"), isNull(), any()))
                .thenReturn("http://localhost:3000/tasks/new?importar=conta&conector=ok");
        mvc.perform(get("/api/connectors/oauth/callback").param("state", "st").param("code", "cd"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "http://localhost:3000/tasks/new?importar=conta&conector=ok"))
                .andExpect(header().string("Cache-Control", "no-store"));
        when(connectors.callback(isNull(), isNull(), eq("access_denied"), any()))
                .thenReturn("http://localhost:3000/settings?tab=conectores&conector=erro&motivo=ACESSO_NEGADO");
        mvc.perform(get("/api/connectors/oauth/callback").param("error", "access_denied")).andExpect(status().isFound())
                .andExpect(header().string("Location", "http://localhost:3000/settings?tab=conectores&conector=erro&motivo=ACESSO_NEGADO"));
    }

    @Test
    void provedoresContasEAutorizacaoNoFormatoDoContrato() throws Exception {
        when(connectors.providers()).thenReturn(List.of(
                new ConnectorProviderView(ConnectorProvider.GOOGLE, false, ConnectorMode.OAUTH, List.of("openid", "email")),
                new ConnectorProviderView(ConnectorProvider.APPLE_ICLOUD, true, ConnectorMode.LINK, List.of())));
        mvc.perform(authed(get("/api/connectors/providers"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].provider").value("GOOGLE")).andExpect(jsonPath("$[0].enabled").value(false))
                .andExpect(jsonPath("$[0].mode").value("OAUTH")).andExpect(jsonPath("$[0].scopes[1]").value("email"))
                .andExpect(jsonPath("$[1].mode").value("LINK"));

        when(connectors.accounts(any())).thenReturn(List.of(new ConnectorAccountView(accountId, ConnectorProvider.MICROSOFT, "ana@contoso.gov.br",
                ConnectionStatus.ATIVO, List.of("Files.Read"), Instant.parse("2026-11-09T12:00:00Z"), null, null)));
        mvc.perform(authed(get("/api/connectors"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(accountId.toString())).andExpect(jsonPath("$[0].accountEmail").value("ana@contoso.gov.br"))
                .andExpect(jsonPath("$[0].status").value("ATIVO")).andExpect(jsonPath("$[0].connectedAt").value("2026-11-09T12:00:00Z"))
                .andExpect(jsonPath("$[0].accessToken").doesNotExist()).andExpect(jsonPath("$[0].accessTokenSealed").doesNotExist());

        when(connectors.authorize(any(), eq("google"), eq("/tasks/new"))).thenReturn(new ConnectorAuthorizeView("https://accounts.example/auth?x=1"));
        mvc.perform(authed(post("/api/connectors/google/authorize"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("returnTo", "/tasks/new")))).andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://accounts.example/auth?x=1"));
        when(connectors.authorize(any(), eq("microsoft"), isNull())).thenReturn(new ConnectorAuthorizeView("https://login.example/x"));
        mvc.perform(authed(post("/api/connectors/microsoft/authorize"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://login.example/x"));
    }

    @Test
    void itensImportacaoELinkNoFormatoDoContrato() throws Exception {
        when(connectors.items(any(), eq(accountId), eq("relat"), eq("p2"), eq(10))).thenAnswer(inv -> {
            trail();
            return new ExternalItemsPage(List.of(new ExternalItemView("1AbC", "Relatório", "application/vnd.google-apps.document",
                    SourceKind.GOOGLE_DOCS, TaskType.DOCUMENTO, "https://docs.google.com/document/d/1AbC/edit", Instant.parse("2026-11-08T10:00:00Z"),
                    null, List.of("PDF"), true)), "p3");
        });
        mvc.perform(authed(get("/api/connectors/" + accountId + "/items?q=relat&pageToken=p2&pageSize=10"), "USER")).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].externalId").value("1AbC")).andExpect(jsonPath("$.items[0].sourceKind").value("GOOGLE_DOCS"))
                .andExpect(jsonPath("$.items[0].taskType").value("DOCUMENTO")).andExpect(jsonPath("$.items[0].exportFormats[0]").value("PDF"))
                .andExpect(jsonPath("$.items[0].linkable").value(true)).andExpect(jsonPath("$.items[0].modifiedAt").value("2026-11-08T10:00:00Z"))
                .andExpect(jsonPath("$.nextPageToken").value("p3"));

        when(connectors.importItem(any(), eq(accountId), any(), any())).thenAnswer(inv -> {
            trail();
            return imported(LinkMode.COPIADO);
        });
        mvc.perform(authed(post("/api/connectors/" + accountId + "/import"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("externalId", "1AbC", "linkMode", "COPIADO", "title", "Relatório")))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(taskId.toString())).andExpect(jsonPath("$.sourceKind").value("GOOGLE_DOCS"))
                .andExpect(jsonPath("$.linkMode").value("COPIADO")).andExpect(jsonPath("$.sourceRef").value("https://docs.google.com/document/d/1/edit"));
        ArgumentCaptor<ImportInput> in = ArgumentCaptor.forClass(ImportInput.class);
        verify(connectors).importItem(any(), eq(accountId), in.capture(), any());
        assertThat(in.getValue()).isEqualTo(new ImportInput("1AbC", "COPIADO", "Relatório"));

        when(connectors.linkImport(any(), any(), any())).thenReturn(imported(LinkMode.VINCULADO));
        mvc.perform(authed(post("/api/connectors/link-import"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("url", "https://docs.google.com/document/d/1/edit")))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.linkMode").value("VINCULADO"));
        ArgumentCaptor<LinkImportInput> link = ArgumentCaptor.forClass(LinkImportInput.class);
        verify(connectors).linkImport(any(), link.capture(), any());
        assertThat(link.getValue().url()).isEqualTo("https://docs.google.com/document/d/1/edit");

        doAnswer(inv -> {
            trail();
            return null;
        }).when(connectors).disconnect(any(), eq(accountId), any());
        mvc.perform(authed(delete("/api/connectors/" + accountId), "USER")).andExpect(status().isNoContent());
        verify(connectors).disconnect(any(), eq(accountId), any());
    }

    @Test
    void errosSaemComOsCodigosDoContrato() throws Exception {
        when(connectors.items(any(), eq(accountId), any(), any(), any())).thenAnswer(inv -> {
            trail();
            throw ConnectorErrors.expired();
        });
        mvc.perform(authed(get("/api/connectors/" + accountId + "/items"), "USER")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONECTOR_EXPIRADO"));

        when(connectors.authorize(any(), eq("google"), any())).thenThrow(ConnectorErrors.disabled());
        mvc.perform(authed(post("/api/connectors/google/authorize"), "USER")).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("CONECTOR_DESABILITADO")).andExpect(header().exists("Retry-After"));

        when(connectors.importItem(any(), eq(accountId), any(), any())).thenAnswer(inv -> {
            trail();
            throw ConnectorErrors.unavailable();
        });
        mvc.perform(authed(post("/api/connectors/" + accountId + "/import"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("externalId", "1", "linkMode", "VINCULADO")))).andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("PROVEDOR_INDISPONIVEL"));

        when(connectors.linkImport(any(), any(), any())).thenThrow(ConnectorErrors.invalid("url", "Link não aceito."));
        mvc.perform(authed(post("/api/connectors/link-import"), "USER").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("url", "https://evil.example/x")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDACAO")).andExpect(jsonPath("$.details.fields.url").value("Link não aceito."));

        mvc.perform(authed(get("/api/connectors/nao-e-uuid/items"), "USER")).andExpect(status().isBadRequest());
    }

    @Test
    void rotaComIdSemPassarPeloAutorizadorEBloqueada() throws Exception {
        when(connectors.items(any(), eq(accountId), any(), any(), any())).thenReturn(new ExternalItemsPage(List.of(), null));
        mvc.perform(authed(get("/api/connectors/" + accountId + "/items"), "USER")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.items").doesNotExist());
    }
}
