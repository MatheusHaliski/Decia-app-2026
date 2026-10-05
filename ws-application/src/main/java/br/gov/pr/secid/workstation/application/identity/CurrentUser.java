package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.Role;

import java.util.UUID;

/** Quem está autenticado: {@code sub} (id), claim {@code role} e {@code sid} (família da sessão) do JWT. */
public record CurrentUser(UUID id, Role role, UUID sessionId) {
    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
