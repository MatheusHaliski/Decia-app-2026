package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.institutional.DeptRole;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Quem pede acesso, com o papel RELIDO do banco (não só o claim do token — D-66): papel global, tipo de perfil, empresa e departamento
 * de lotação e os papéis vigentes por departamento ({@code department_memberships}).
 *
 * @param deptRoles papéis vigentes por departamento (MEMBRO, CHEFE, CURADOR); vazio quando não há lotação
 */
public record Viewer(UUID userId, Role role, ProfileType profileType, UUID companyId, UUID departmentId, Map<UUID, DeptRole> deptRoles) {

    public Viewer {
        Objects.requireNonNull(userId, "userId");
        role = role == null ? Role.USER : role;
        deptRoles = deptRoles == null ? Map.of() : Map.copyOf(deptRoles);
    }

    public static Viewer user(UUID userId) {
        return new Viewer(userId, Role.USER, ProfileType.EMPREGADO, null, null, Map.of());
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean is(UUID otherUserId) {
        return userId.equals(otherUserId);
    }

    /** Lotado no departamento (pela lotação principal ou por um vínculo vigente). */
    public boolean memberOf(UUID department) {
        return department != null && (department.equals(departmentId) || deptRoles.containsKey(department));
    }

    public boolean inCompany(UUID company) {
        return company != null && company.equals(companyId);
    }

    /** CHEFE ou CURADOR vigente do departamento: gere (MANAGE) o conteúdo departamental visível. */
    public boolean managesDepartment(UUID department) {
        DeptRole r = department == null ? null : deptRoles.get(department);
        return r == DeptRole.CHEFE || r == DeptRole.CURADOR;
    }
}
