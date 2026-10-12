package br.gov.pr.secid.workstation.application.security;

import br.gov.pr.secid.workstation.domain.institutional.DeptRole;

import java.util.Map;
import java.util.UUID;

/** Lotações vigentes ({@code department_memberships} com {@code ended_at} nulo) — papel por departamento para o {@code Viewer}. */
public interface MembershipPort {

    /** Departamento → papel vigente (MEMBRO, CHEFE, CURADOR); vazio sem lotação. */
    Map<UUID, DeptRole> activeRoles(UUID userId);
}
