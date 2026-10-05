package br.gov.pr.secid.workstation.application.security;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;

import java.util.UUID;

/**
 * Guarda mínima contra BOLA/BFLA (ARQUITETURA §3.3): quem pode agir sobre um recurso. Toda recusa é
 * {@code 403 ACESSO_NEGADO}, sem dizer se o recurso existe. {@code requireRole/requireOwner/requireParticipant/requireIssuer}
 * crescem por RF; aqui entram {@link #ownerOrAdmin} e {@link #requireRole} (RF3) e {@link #requireNotDeletionScheduled} (D-18).
 */
public final class Guard {
    private Guard() {
    }

    public static void requireRole(CurrentUser actor, Role role) {
        if (actor == null || actor.role() != role) {
            throw denied();
        }
    }

    /** Só o dono do recurso ou um ADMIN. */
    public static void ownerOrAdmin(CurrentUser actor, UUID ownerId) {
        if (actor == null || ownerId == null || (!actor.isAdmin() && !ownerId.equals(actor.id()))) {
            throw denied();
        }
    }

    /** Conta com exclusão agendada só cancela, exporta e sai (D-18): mudar perfil/conteúdo → {@code 403 EXCLUSAO_AGENDADA}. */
    public static void requireNotDeletionScheduled(User user) {
        if (user.isDeletionScheduled()) {
            throw new ApiException(AuthCodes.EXCLUSAO_AGENDADA, 403,
                    "A exclusão desta conta está agendada. Cancele a exclusão para voltar a editar.");
        }
    }

    public static ApiException denied() {
        return ApiException.forbidden("Você não tem permissão para esta ação.");
    }
}
