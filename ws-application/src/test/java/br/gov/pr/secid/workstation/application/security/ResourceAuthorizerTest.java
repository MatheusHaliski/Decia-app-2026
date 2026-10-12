package br.gov.pr.secid.workstation.application.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.Decision;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** D-65/D-66: tradução 404/403, papel relido do banco, lotação, BFLA por perfil e trilha marcada em toda verificação. */
class ResourceAuthorizerTest {
    final Map<UUID, User> rows = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final UUID company = UUID.randomUUID();
    final UUID dept = UUID.randomUUID();

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(rows.get(inv.<UUID>getArgument(0))));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User user(Role role, ProfileType type) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(role);
        u.setProfileType(type);
        u.setCompanyId(company);
        u.setDepartmentId(null);
        rows.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u, Role tokenRole) {
        return new CurrentUser(u.getId(), tokenRole, UUID.randomUUID());
    }

    @Test
    void viewerReleOPapelELotacaoDoBanco() {
        User chefe = user(Role.USER, ProfileType.CHEFE_DEPARTAMENTO);
        MembershipPort m = id -> id.equals(chefe.getId()) ? Map.of(dept, DeptRole.CHEFE) : Map.of();
        ResourceAuthorizer a = new ResourceAuthorizer(users, Optional.of(m));
        Viewer v = a.viewer(cu(chefe, Role.ADMIN));
        assertThat(v.isAdmin()).as("token ADMIN sem ADMIN no banco = USER").isFalse();
        assertThat(v.companyId()).isEqualTo(company);
        assertThat(v.managesDepartment(dept)).isTrue();
        ScopedResource task = new ScopedResource(ScopedResource.Kind.TASK, UUID.randomUUID(), UUID.randomUUID(), company, dept,
                Visibility.DEPARTAMENTO, AccessClassification.INTERNO, Set.of());
        assertThatCode(() -> a.require(cu(chefe, Role.USER), task, ResourceAction.MANAGE)).doesNotThrowAnyException();
        assertThat(AuthorizationTrail.last()).isEqualTo("TASK:MANAGE");
        assertThat(catchThrowableOfType(ApiException.class, () -> a.require(cu(chefe, Role.USER), task, ResourceAction.DELETE)).status())
                .isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class, () -> a.viewer(null)).status()).isEqualTo(401);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> a.viewer(new CurrentUser(UUID.randomUUID(), Role.USER, UUID.randomUUID()))).status()).isEqualTo(401);
        assertThat(new ResourceAuthorizer(users, null).viewer(cu(chefe, Role.USER)).deptRoles()).isEmpty();
    }

    @Test
    void invisivelResponde404IdenticoAoInexistenteEVisivelSemPermissao403() {
        ResourceAuthorizer a = new ResourceAuthorizer(users, Optional.empty());
        User owner = user(Role.USER, ProfileType.EMPREGADO);
        User other = user(Role.USER, ProfileType.EMPREGADO);
        ScopedResource priv = new ScopedResource(ScopedResource.Kind.PROJECT, UUID.randomUUID(), owner.getId(), company, null, Visibility.PRIVADA,
                null, null);
        ApiException hidden = catchThrowableOfType(ApiException.class, () -> a.require(cu(other, Role.USER), priv, ResourceAction.VIEW));
        ApiException missing = ResourceAuthorizer.notFound(ScopedResource.Kind.PROJECT);
        assertThat(hidden.status()).isEqualTo(404);
        assertThat(hidden.code()).isEqualTo(missing.code());
        assertThat(hidden.getMessage()).isEqualTo(missing.getMessage());
        assertThat(hidden.details()).isEqualTo(missing.details());
        ScopedResource company = new ScopedResource(ScopedResource.Kind.PROJECT, UUID.randomUUID(), owner.getId(), this.company, null,
                Visibility.EMPRESA, null, null);
        ApiException denied = catchThrowableOfType(ApiException.class, () -> a.require(cu(other, Role.USER), company, ResourceAction.EDIT));
        assertThat(denied.status()).isEqualTo(403);
        assertThat(denied.code()).isEqualTo(ApiException.ACESSO_NEGADO);
    }

    @Test
    void decisaoEMidiaPassamPelasPoliticasDoDominio() {
        ResourceAuthorizer a = new ResourceAuthorizer(users, Optional.empty());
        UUID ownerId = UUID.randomUUID();
        Decision d = new Decision(UUID.randomUUID(), "Nuvem", "Qual nuvem usar?", null, null, null, null, null, null, null, null, ownerId, ownerId,
                company, null, null, null, null, null, DecisionLifecycle.AGUARDANDO_DECISAO, DecisionComplexity.PADRAO, DecisionKind.TATICA,
                DecisionLevel.ALTO, DecisionLevel.MEDIO, Visibility.PRIVADA, AccessClassification.INTERNO, true, true, null, null, null, null, null,
                null);
        Viewer informado = Viewer.user(UUID.randomUUID());
        assertThatCode(() -> a.requireDecision(informado, d, DecisionRole.INFORMADO, false, ResourceAction.VIEW)).doesNotThrowAnyException();
        assertThat(catchThrowableOfType(ApiException.class,
                () -> a.requireDecision(informado, d, DecisionRole.INFORMADO, false, ResourceAction.ASSESS)).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> a.requireDecision(informado, d, null, false, ResourceAction.VIEW)).status()).isEqualTo(404);
        assertThat(AuthorizationTrail.last()).isEqualTo("DECISION:VIEW");

        MediaObject restricted = new MediaObject(UUID.randomUUID(), ownerId, "b", "restricted/x", "image/png", 1, "0".repeat(64),
                MediaAccessClass.RESTRICTED, null);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> a.requireMedia(informado, restricted, true, ResourceAction.VIEW)).getMessage()).contains("Arquivo");
        assertThatCode(() -> a.requireMedia(Viewer.user(ownerId), restricted, false, ResourceAction.DELETE)).doesNotThrowAnyException();
    }

    @Test
    void bflaPorPapelEPerfil() {
        ResourceAuthorizer a = new ResourceAuthorizer(users, Optional.empty());
        Viewer empregado = Viewer.user(UUID.randomUUID());
        Viewer chefe = new Viewer(UUID.randomUUID(), Role.USER, ProfileType.CHEFE_DEPARTAMENTO, null, null, Map.of());
        Viewer admin = new Viewer(UUID.randomUUID(), Role.ADMIN, ProfileType.EMPREGADO, null, null, Map.of());
        assertThat(catchThrowableOfType(ApiException.class, () -> a.requireRole(empregado, Role.ADMIN)).status()).isEqualTo(403);
        assertThatCode(() -> a.requireRole(admin, Role.ADMIN)).doesNotThrowAnyException();
        assertThat(catchThrowableOfType(ApiException.class, () -> a.requireRole(null, Role.ADMIN)).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class,
                () -> a.requireProfile(empregado, ProfileType.CHEFE_DEPARTAMENTO)).status()).isEqualTo(403);
        assertThatCode(() -> a.requireProfile(chefe, ProfileType.CHEFE_DEPARTAMENTO)).doesNotThrowAnyException();
        assertThatCode(() -> a.requireProfile(admin, ProfileType.EMPRESA)).doesNotThrowAnyException();
        assertThat(catchThrowableOfType(ApiException.class, () -> a.requireProfile(null, ProfileType.EMPRESA)).status()).isEqualTo(403);
        assertThat(AuthorizationTrail.last()).startsWith("PROFILE:");
    }

    @Test
    void contaPropriaEConfirmacao() {
        ResourceAuthorizer a = new ResourceAuthorizer(users, Optional.empty());
        User me = user(Role.USER, ProfileType.EMPREGADO);
        User other = user(Role.USER, ProfileType.EMPREGADO);
        AuthorizationTrail.clear();
        assertThat(AuthorizationTrail.checked()).isFalse();
        assertThat(a.ownAccount(cu(me, Role.USER))).isSameAs(me);
        assertThat(AuthorizationTrail.checked()).isTrue();
        assertThat(catchThrowableOfType(ApiException.class, () -> a.ownAccount(null)).status()).isEqualTo(401);
        assertThat(a.confirmOwn(cu(me, Role.USER), me)).isSameAs(me);
        assertThat(catchThrowableOfType(ApiException.class, () -> a.confirmOwn(cu(me, Role.USER), other)).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class, () -> a.confirmOwn(null, me)).status()).isEqualTo(403);
        assertThat(catchThrowableOfType(ApiException.class, () -> a.requireSelfOrAdmin(cu(me, Role.USER), null)).status()).isEqualTo(403);
        AuthorizationTrail.record(" ");
        assertThat(AuthorizationTrail.last()).isEqualTo("?");
    }
}
