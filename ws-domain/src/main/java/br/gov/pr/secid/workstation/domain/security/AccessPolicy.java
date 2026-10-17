package br.gov.pr.secid.workstation.domain.security;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Visibility;

/**
 * Política de acesso a recursos autorais (BOLA/BFLA, D-65/D-66) — pura, sem Spring, relida por {@code ResourceAuthorizer}.
 *
 * <p><b>Visibilidade</b> (quem sabe que o recurso existe): dono, colaboradores explícitos e ADMIN sempre; os demais pela
 * {@link Visibility} efetiva — PUBLICA = qualquer autenticado, EMPRESA = mesma empresa, DEPARTAMENTO = lotado no departamento,
 * PRIVADA = ninguém mais. A {@link AccessClassification} limita a visibilidade: RESTRITO nunca passa de DEPARTAMENTO e SIGILOSO
 * equivale a PRIVADA — só dono e colaboradores explícitos; o ADMIN não tem acesso implícito a SIGILOSO (Q-166/Q-238, RF51; D-139).
 *
 * <p><b>Ações</b> (sobre recurso visível): VIEW = todos que veem; EDIT = dono, colaborador, ADMIN; DELETE = dono, ADMIN;
 * MANAGE = dono, ADMIN, CHEFE/CURADOR do departamento do recurso quando a visibilidade efetiva não é PRIVADA. Ações de decisão
 * (EDIT_STRUCTURE, ASSESS, DECIDE, REOPEN) só existem em {@link DecisionAccessPolicy}: aqui são sempre FORBIDDEN.
 *
 * <p>Recurso invisível → {@link AccessDecision#NOT_FOUND} (mesma resposta de id inexistente); visível sem permissão →
 * {@link AccessDecision#FORBIDDEN}.
 */
public final class AccessPolicy {

    private AccessPolicy() {
    }

    /** Visibilidade efetiva: a classificação nunca alarga, só restringe. */
    public static Visibility effectiveVisibility(Visibility visibility, AccessClassification classification) {
        Visibility v = visibility == null ? Visibility.PRIVADA : visibility;
        if (classification == AccessClassification.SIGILOSO) {
            return Visibility.PRIVADA;
        }
        if (classification == AccessClassification.RESTRITO && (v == Visibility.EMPRESA || v == Visibility.PUBLICA)) {
            return Visibility.DEPARTAMENTO;
        }
        return v;
    }

    /** Dono ou colaborador explícito (antes de qualquer escopo). */
    static boolean explicit(Viewer viewer, ScopedResource r) {
        return viewer.is(r.ownerId()) || r.collaborators().contains(viewer.userId());
    }

    public static boolean visible(Viewer viewer, ScopedResource r) {
        if (viewer == null || r == null) {
            return false;
        }
        if (explicit(viewer, r) || (viewer.isAdmin() && !sigiloso(r))) {
            return true;
        }
        return switch (effectiveVisibility(r.visibility(), r.classification())) {
            case PUBLICA -> true;
            case EMPRESA -> viewer.inCompany(r.companyId());
            case DEPARTAMENTO -> viewer.memberOf(r.departmentId());
            case PRIVADA -> false;
        };
    }

    /** SIGILOSO: nenhum papel administrativo entra sem vínculo explícito (D-139). */
    static boolean sigiloso(ScopedResource r) {
        return r.classification() == AccessClassification.SIGILOSO;
    }

    public static AccessDecision decide(Viewer viewer, ScopedResource r, ResourceAction action) {
        boolean visible = visible(viewer, r);
        if (!visible) {
            return AccessDecision.NOT_FOUND;
        }
        boolean owner = viewer.is(r.ownerId());
        boolean admin = viewer.isAdmin() && !sigiloso(r);
        boolean permitted = switch (action) {
            case VIEW -> true;
            case EDIT -> owner || admin || r.collaborators().contains(viewer.userId());
            case DELETE -> owner || admin;
            case MANAGE -> owner || admin || (viewer.managesDepartment(r.departmentId())
                    && effectiveVisibility(r.visibility(), r.classification()) != Visibility.PRIVADA);
            case EDIT_STRUCTURE, ASSESS, DECIDE, REOPEN -> false;
        };
        return AccessDecision.of(true, permitted);
    }
}
