package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.account.AccountService;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import br.gov.pr.secid.workstation.application.identity.IdentityService;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.RegistrationService;
import br.gov.pr.secid.workstation.application.identity.UserPreferencesRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Matriz endpoint × perfil (Bloco 5, D-65/D-66) com o AccountService e o ResourceAuthorizer REAIS na fatia MVC com a segurança real:
 * sem token → 401; papel desconhecido → 403; conta de terceiro → 403 uniforme (exista ou não o id); ADMIN relido do banco → 200
 * (id inexistente → 404); token ADMIN de quem foi rebaixado → 403. Cada célula falharia se o controle correspondente sumisse.
 */
@WebMvcTest(controllers = MeController.class)
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class, AccountService.class, ResourceAuthorizer.class})
class AuthorizationMatrixWebTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    UserRepositoryPort users;
    @MockitoBean
    UserPreferencesRepositoryPort prefs;
    @MockitoBean
    EmailHasher emailHasher;
    @MockitoBean
    IdentityService identity;
    @MockitoBean
    RegistrationService registration;
    @MockitoBean
    AuditLogPort audit;

    final Map<UUID, User> rows = new HashMap<>();

    /** Quem pede: papel no token e papel no banco (nulo = não tem conta). */
    record Persona(String name, UUID id, String tokenRole, Role dbRole) {
    }

    final Persona owner = new Persona("dono", UUID.randomUUID(), "USER", Role.USER);
    final Persona other = new Persona("terceiro", UUID.randomUUID(), "USER", Role.USER);
    final Persona admin = new Persona("admin", UUID.randomUUID(), "ADMIN", Role.ADMIN);
    final Persona stale = new Persona("ex-admin", UUID.randomUUID(), "ADMIN", Role.USER);
    final Persona unknown = new Persona("papel-desconhecido", UUID.randomUUID(), "CONVIDADO", Role.USER);
    final Persona anon = new Persona("anonimo", null, null, null);
    final List<Persona> personas = List.of(owner, other, admin, stale, unknown, anon);

    @BeforeEach
    void setUp() {
        seed();
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(rows.get(inv.<UUID>getArgument(0))));
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(prefs.findByUserId(any())).thenReturn(Optional.empty());
        when(prefs.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emailHasher.hash(anyString())).thenReturn("h");
        when(identity.reauthenticate(any(), anyString(), anyString(), any()))
                .thenAnswer(inv -> rows.get(inv.<CurrentUser>getArgument(0).id()));
    }

    /** Contas e sessões vivas de cada persona (refeito entre as linhas da matriz). */
    void seed() {
        for (Persona p : personas) {
            if (p.id() == null) {
                continue;
            }
            User u = new User();
            u.setId(p.id());
            u.setUsername(p.name());
            u.setFullName(p.name());
            u.setEmail(p.name() + "@exemplo.gov.br");
            u.setEmailVerified(true);
            u.setProfileType(ProfileType.EMPREGADO);
            u.setRole(p.dbRole());
            u.setStatus(AccountStatus.ACTIVE);
            rows.put(p.id(), u);
            UUID sid = UUID.nameUUIDFromBytes(p.id().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            sessions.save(new RefreshRecord("h-" + sid, sid, p.id(), Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
        }
    }

    private MockHttpServletRequestBuilder as(Persona p, MockHttpServletRequestBuilder b) {
        if (p.id() == null) {
            return b;
        }
        UUID sid = UUID.nameUUIDFromBytes(p.id().toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return b.with(jwt().jwt(j -> j.subject(p.id().toString()).claim("role", p.tokenRole()).claim("sid", sid.toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_" + p.tokenRole())));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void matrizEndpointPorPerfil() throws Exception {
        UUID ghost = UUID.randomUUID();
        // linha → função que monta a requisição; colunas na ordem de `personas`: dono, terceiro, admin, ex-admin, papel desconhecido, anônimo
        Map<String, Function<Persona, MockHttpServletRequestBuilder>> rowsOfMatrix = new LinkedHashMap<>();
        Map<String, int[]> expected = new LinkedHashMap<>();
        rowsOfMatrix.put("GET /api/me", p -> get("/api/me"));
        expected.put("GET /api/me", new int[] {200, 200, 200, 200, 403, 401});
        rowsOfMatrix.put("GET /api/users/{dono}", p -> get("/api/users/" + owner.id()));
        expected.put("GET /api/users/{dono}", new int[] {200, 403, 200, 403, 403, 401});
        rowsOfMatrix.put("GET /api/users/{inexistente}", p -> get("/api/users/" + ghost));
        expected.put("GET /api/users/{inexistente}", new int[] {403, 403, 404, 403, 403, 401});
        rowsOfMatrix.put("PATCH /api/me", p -> json(patch("/api/me"), "{\"displayName\":\"Novo\"}"));
        expected.put("PATCH /api/me", new int[] {200, 200, 200, 200, 403, 401});
        rowsOfMatrix.put("PATCH /api/me/sensitive", p -> json(patch("/api/me/sensitive"), "{\"currentPassword\":\"x\",\"phone\":\"+5541999990000\"}"));
        expected.put("PATCH /api/me/sensitive", new int[] {200, 200, 200, 200, 403, 401});
        rowsOfMatrix.put("GET /api/me/preferences", p -> get("/api/me/preferences"));
        expected.put("GET /api/me/preferences", new int[] {200, 200, 200, 200, 403, 401});
        rowsOfMatrix.put("PUT /api/me/preferences", p -> json(put("/api/me/preferences"), "{\"theme\":\"ESCURO\"}"));
        expected.put("PUT /api/me/preferences", new int[] {200, 200, 200, 200, 403, 401});
        rowsOfMatrix.put("DELETE /api/me/deletion", p -> delete("/api/me/deletion"));
        expected.put("DELETE /api/me/deletion", new int[] {409, 409, 409, 409, 403, 401});
        rowsOfMatrix.put("POST /api/me/deletion", p -> json(post("/api/me/deletion"), "{\"currentPassword\":\"x\"}"));
        expected.put("POST /api/me/deletion", new int[] {202, 202, 202, 202, 403, 401});

        List<String> mismatches = new ArrayList<>();
        for (Map.Entry<String, Function<Persona, MockHttpServletRequestBuilder>> row : rowsOfMatrix.entrySet()) {
            int[] want = expected.get(row.getKey());
            for (int i = 0; i < personas.size(); i++) {
                Persona p = personas.get(i);
                int got = mvc.perform(as(p, row.getValue().apply(p))).andReturn().getResponse().getStatus();
                if (got != want[i]) {
                    mismatches.add(row.getKey() + " × " + p.name() + ": esperado " + want[i] + ", veio " + got);
                }
            }
            seed();                                  // POST /deletion agenda a exclusão: cada linha começa do mesmo estado
        }
        assertThat(mismatches).isEmpty();
    }

    @Test
    void respostaDe403ParaTerceiroEIdenticaExistaOuNaoOId() throws Exception {
        String existing = mvc.perform(as(other, get("/api/users/" + owner.id()))).andReturn().getResponse().getContentAsString();
        String missing = mvc.perform(as(other, get("/api/users/" + UUID.randomUUID()))).andReturn().getResponse().getContentAsString();
        String volatileFields = "\"(correlationId|path|timestamp)\":\"[^\"]*\"";
        assertThat(existing.replaceAll(volatileFields, "")).isEqualTo(missing.replaceAll(volatileFields, ""));
        assertThat(existing).contains("ACESSO_NEGADO").doesNotContain(owner.name());
    }
}
