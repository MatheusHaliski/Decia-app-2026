package br.gov.pr.secid.workstation.web.institutional;

import br.gov.pr.secid.workstation.application.acervo.TaskService;
import br.gov.pr.secid.workstation.application.account.AvatarService;
import br.gov.pr.secid.workstation.application.account.PublicationService;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ClockConfig;
import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionDirectoryPort;
import br.gov.pr.secid.workstation.application.institutional.InstitutionPageService;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.people.PeopleService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.application.social.FollowRepositoryPort;
import br.gov.pr.secid.workstation.application.social.FollowService;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.ProfileVisibility;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.Company;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.domain.institutional.Department;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.social.Follow;
import br.gov.pr.secid.workstation.domain.social.FollowStatus;
import br.gov.pr.secid.workstation.domain.social.FollowTargetType;
import br.gov.pr.secid.workstation.web.account.AvatarController;
import br.gov.pr.secid.workstation.web.account.PublicationController;
import br.gov.pr.secid.workstation.web.config.JwtConfig;
import br.gov.pr.secid.workstation.web.config.SecurityConfig;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.error.GlobalExceptionHandler;
import br.gov.pr.secid.workstation.web.people.PeopleController;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fatia MVC com a segurança real e os serviços REAIS (pessoas, foto, seguir, institucional, publicação + ResourceAuthorizer): (1) o
 * controle de publicação do RF3 vale em TODAS as rotas de perfil — perfil por usuário, tarefas, foto e seguir (GET/PUT/DELETE) respondem
 * a quem é de fora da empresa o MESMO 404 de uma conta inexistente, e a mesma empresa passa; (2) RF14/RF15: páginas, equipe, seguir e
 * 404 uniforme de departamento/empresa; (3) {@code /api/me/publication}.
 */
@WebMvcTest(controllers = {PeopleController.class, AvatarController.class, InstitutionController.class, PublicationController.class})
@Import({SecurityConfig.class, JwtConfig.class, GlobalExceptionHandler.class, ErrorWriter.class, ApiErrorAuthenticationEntryPoint.class,
        ApiErrorAccessDeniedHandler.class, CorrelationIdFilter.class, ClockConfig.class, InMemoryRateLimit.class, InMemorySessionStore.class,
        ClientIpResolver.class, CurrentUserArgumentResolver.class, HashBulkhead.class, ResourceAuthorizer.class, PeopleService.class,
        AvatarService.class, FollowService.class, InstitutionPageService.class, PublicationService.class})
class InstitutionAndProfileVisibilityWebTest {
    static final String VOLATILE = "\"(correlationId|path|timestamp|traceId)\":\"[^\"]*\",?";

    @Autowired
    MockMvc mvc;
    @Autowired
    InMemorySessionStore sessions;
    @MockitoBean
    UserRepositoryPort users;
    @MockitoBean
    FollowRepositoryPort followRepo;
    @MockitoBean
    InstitutionDirectoryPort directory;
    @MockitoBean
    TaskService tasks;
    @MockitoBean
    MediaUploadInspector inspector;
    @MockitoBean
    MediaUploadService media;
    @MockitoBean
    AuditLogPort audit;

    final Map<UUID, User> rows = new HashMap<>();
    final Map<String, Follow> followRows = new LinkedHashMap<>();
    final UUID secid = UUID.randomUUID();
    final UUID outra = UUID.randomUUID();
    User dona;
    User ana;
    User colega;
    User fora;
    Company company;
    Department uts;

    User person(String username, UUID companyId, ProfileType type) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername(username);
        u.setFullName("Pessoa " + username);
        u.setEmail(username + "@exemplo.gov.br");
        u.setPhone("+5541999990000");
        u.setProfileType(type);
        u.setRole(Role.USER);
        u.setStatus(AccountStatus.ACTIVE);
        u.setCompanyId(companyId);
        rows.put(u.getId(), u);
        UUID sid = sid(u);
        sessions.save(new RefreshRecord("h-" + sid, sid, u.getId(), Instant.now(), Instant.now().plus(Duration.ofDays(1)), null, null, false, null));
        return u;
    }

    static UUID sid(User u) {
        return UUID.nameUUIDFromBytes(u.getId().toString().getBytes(StandardCharsets.UTF_8));
    }

    static String key(UUID follower, FollowTargetType type, UUID target) {
        return follower + "|" + type + "|" + target;
    }

    @BeforeEach
    void setUp() {
        dona = person("dona", null, ProfileType.EMPRESA);
        ana = person("ana", secid, ProfileType.EMPREGADO);
        ana.setProfileVisibility(ProfileVisibility.EMPRESA);
        ana.setSpecialties(List.of("BIM", "Licitações"));
        colega = person("colega", secid, ProfileType.EMPREGADO);
        fora = person("fora", outra, ProfileType.EMPREGADO);
        company = new Company(secid, dona.getId(), "Secretaria das Cidades", "secid", null, null, null, "Sobre", "https://secid.gov.br", "orange",
                null, null, null, null, null, CompanyStatus.ATIVA);
        uts = new Department(UUID.randomUUID(), secid, "Unidade Técnica", "UTS", "uts", "blue", "U", colega.getId(), "Sobre a UTS", null, true);

        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(rows.get(inv.<UUID>getArgument(0))));
        when(users.findByUsername(anyString())).thenAnswer(inv -> rows.values().stream()
                .filter(u -> u.getUsername().equals(inv.<String>getArgument(0))).findFirst());
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(followRepo.find(any(), any(), any())).thenAnswer(inv -> Optional.ofNullable(followRows.get(
                key(inv.getArgument(0), inv.getArgument(1), inv.getArgument(2)))));
        when(followRepo.save(any())).thenAnswer(inv -> {
            Follow f = inv.getArgument(0);
            followRows.put(key(f.followerId(), f.targetType(), f.targetId()), f);
            return f;
        });
        when(followRepo.countFollowers(any(), any())).thenAnswer(inv -> followRows.values().stream()
                .filter(f -> f.targetType() == inv.getArgument(0) && f.targetId().equals(inv.getArgument(1)) && f.status() == FollowStatus.ATIVO).count());

        when(directory.departmentsBySlug("uts")).thenReturn(List.of(uts));
        when(directory.departmentsBySlug("antigo")).thenReturn(List.of(new Department(UUID.randomUUID(), secid, "Antigo", "ANT", "antigo", null,
                null, null, null, null, false)));
        when(directory.company(secid)).thenReturn(Optional.of(company));
        when(directory.companyBySlug("secid")).thenReturn(Optional.of(company));
        when(directory.activeDepartmentsOf(secid)).thenReturn(List.of(uts));
        when(directory.activeMembers(eq(uts.id()), anyInt())).thenReturn(Map.of(colega.getId(), DeptRole.CHEFE, ana.getId(), DeptRole.MEMBRO));
        when(directory.countActiveMembers(uts.id())).thenReturn(2L);
        when(directory.countActivePeople(secid)).thenReturn(2L);
    }

    private MockHttpServletRequestBuilder as(User u, MockHttpServletRequestBuilder b) {
        return b.with(jwt().jwt(j -> j.subject(u.getId().toString()).claim("role", "USER").claim("sid", sid(u).toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_USER")));
    }

    private MvcResult call(User who, MockHttpServletRequestBuilder b) throws Exception {
        return mvc.perform(as(who, b)).andReturn();
    }

    private static String stable(MvcResult r) throws Exception {
        return r.getResponse().getContentAsString(StandardCharsets.UTF_8).replaceAll(VOLATILE, "");
    }

    @Test
    void perfilSoDaEmpresaResponde404IgualAContaInexistenteEmTodasAsRotasDePerfil() throws Exception {
        UUID ghost = UUID.randomUUID();
        Map<String, Function<String, MockHttpServletRequestBuilder>> routes = new LinkedHashMap<>();
        routes.put("GET perfil", id -> get("/api/people/by-username/" + (id.equals(ana.getId().toString()) ? "ana" : "ninguem")));
        routes.put("GET tarefas", id -> get("/api/people/" + id + "/tasks"));
        routes.put("GET foto", id -> get("/api/people/" + id + "/avatar"));
        routes.put("GET seguir", id -> get("/api/people/" + id + "/follow"));
        routes.put("PUT seguir", id -> put("/api/people/" + id + "/follow"));
        routes.put("DELETE seguir", id -> delete("/api/people/" + id + "/follow"));

        List<String> problems = new ArrayList<>();
        for (Map.Entry<String, Function<String, MockHttpServletRequestBuilder>> route : routes.entrySet()) {
            MvcResult hidden = call(fora, route.getValue().apply(ana.getId().toString()));
            MvcResult missing = call(fora, route.getValue().apply(ghost.toString()));
            if (hidden.getResponse().getStatus() != 404 || !stable(hidden).equals(stable(missing))) {
                problems.add(route.getKey() + ": de fora " + hidden.getResponse().getStatus() + " " + stable(hidden) + " × inexistente " + stable(missing));
            }
            if (stable(hidden).contains("ana") || stable(hidden).contains("BIM")) {
                problems.add(route.getKey() + ": a recusa vaza dados");
            }
            int inside = call(colega, route.getValue().apply(ana.getId().toString())).getResponse().getStatus();
            int expected = route.getKey().equals("GET foto") ? 404 : 200;      // sem foto enviada: o 404 é de "Foto", depois da regra
            if (inside != expected) {
                problems.add(route.getKey() + ": mesma empresa recebeu " + inside);
            }
        }
        assertThat(problems).isEmpty();
        assertThat(followRows).as("quem é de fora não grava seguir").allSatisfy((k, f) -> assertThat(f.followerId()).isEqualTo(colega.getId()));
        mvc.perform(as(colega, get("/api/people/by-username/ana"))).andExpect(jsonPath("$.specialties[0]").value("BIM"))
                .andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(as(colega, get("/api/people/" + ana.getId() + "/avatar"))).andExpect(jsonPath("$.message").value("Foto não encontrado(a)"));
    }

    @Test
    void departamentoEEmpresaComContadoresEquipeSeguirE404Uniforme() throws Exception {
        mvc.perform(as(fora, get("/api/departments/uts?company=secid"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.acronym").value("UTS")).andExpect(jsonPath("$.company.slug").value("secid"))
                .andExpect(jsonPath("$.members").value(2)).andExpect(jsonPath("$.followers").value(0))
                .andExpect(jsonPath("$.head.username").value("colega")).andExpect(jsonPath("$.head.email").doesNotExist());
        mvc.perform(as(fora, get("/api/departments/uts/members?company=secid"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].username").value("colega"));
        mvc.perform(as(colega, get("/api/departments/uts/members"))).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].role").value("CHEFE"));

        mvc.perform(as(fora, put("/api/departments/uts/follow?company=secid"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.following").value(true)).andExpect(jsonPath("$.followers").value(1));
        mvc.perform(as(fora, put("/api/departments/uts/follow?company=secid"))).andExpect(jsonPath("$.followers").value(1));
        mvc.perform(as(fora, get("/api/departments/uts?company=secid"))).andExpect(jsonPath("$.followers").value(1));
        mvc.perform(as(fora, delete("/api/departments/uts/follow?company=secid"))).andExpect(jsonPath("$.following").value(false));

        mvc.perform(as(fora, get("/api/companies/secid"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Secretaria das Cidades")).andExpect(jsonPath("$.departments").value(1))
                .andExpect(jsonPath("$.people").value(2)).andExpect(jsonPath("$.owner").value(false))
                .andExpect(jsonPath("$.websiteUrl").value("https://secid.gov.br"));
        mvc.perform(as(dona, get("/api/companies/secid"))).andExpect(jsonPath("$.owner").value(true));
        mvc.perform(as(fora, get("/api/companies/secid/departments"))).andExpect(jsonPath("$[0].slug").value("uts"))
                .andExpect(jsonPath("$[0].companySlug").value("secid"));
        mvc.perform(as(fora, put("/api/companies/secid/follow"))).andExpect(jsonPath("$.followers").value(1));
        mvc.perform(as(fora, get("/api/companies/secid/follow"))).andExpect(jsonPath("$.following").value(true));

        String inactive = stable(call(fora, get("/api/departments/antigo")));
        assertThat(inactive).contains("NAO_ENCONTRADO");
        assertThat(stable(call(fora, get("/api/departments/nao-existe")))).isEqualTo(inactive);
        assertThat(stable(call(fora, put("/api/departments/antigo/follow")))).isEqualTo(inactive);
        assertThat(stable(call(fora, get("/api/departments/uts?company=outra")))).isEqualTo(inactive);
        company = new Company(secid, dona.getId(), company.legalName(), "secid", null, null, null, null, null, null, null, null, null, null, null,
                CompanyStatus.SUSPENSA);
        when(directory.company(secid)).thenReturn(Optional.of(company));
        when(directory.companyBySlug("secid")).thenReturn(Optional.of(company));
        String suspended = stable(call(fora, get("/api/companies/secid")));
        assertThat(suspended).contains("NAO_ENCONTRADO");
        assertThat(stable(call(fora, get("/api/companies/nao-existe")))).isEqualTo(suspended);
        assertThat(stable(call(fora, get("/api/departments/uts?company=secid")))).as("departamento de empresa suspensa").isEqualTo(inactive);

        for (MockHttpServletRequestBuilder b : List.of(get("/api/departments/uts"), get("/api/companies/secid"), get("/api/me/institution"),
                get("/api/me/publication"))) {
            mvc.perform(b).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void perfilEmpresarialEPublicacaoDaPropriaConta() throws Exception {
        when(directory.companyOwnedBy(dona.getId())).thenReturn(Optional.of(company));
        mvc.perform(as(dona, get("/api/me/institution"))).andExpect(status().isOk()).andExpect(jsonPath("$.owner").value(true))
                .andExpect(jsonPath("$.company.slug").value("secid")).andExpect(jsonPath("$.departments[0].acronym").value("UTS"))
                .andExpect(jsonPath("$.people").value(2));
        mvc.perform(as(fora, get("/api/me/institution"))).andExpect(jsonPath("$.company").doesNotExist());

        mvc.perform(as(ana, get("/api/me/publication"))).andExpect(jsonPath("$.profileVisibility").value("EMPRESA"))
                .andExpect(jsonPath("$.specialties[1]").value("Licitações"));
        mvc.perform(as(fora, put("/api/me/publication")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"specialties\":[\" Gestão  pública \",\"gestao publica\",\"BIM\"],\"profileVisibility\":\"EMPRESA\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.specialties.length()").value(2))
                .andExpect(jsonPath("$.specialties[0]").value("Gestão pública"));
        assertThat(fora.getProfileVisibility()).isEqualTo(ProfileVisibility.EMPRESA);
        mvc.perform(as(fora, put("/api/me/publication")).contentType(MediaType.APPLICATION_JSON).content("{\"profileVisibility\":\"TODOS\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.details.fields.profileVisibility").exists());
        mvc.perform(as(colega, get("/api/people/by-username/fora"))).andExpect(status().isNotFound());
    }
}
