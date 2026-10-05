package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;

import java.util.UUID;

/** Resultado de um login correto: o que o emissor de tokens e a resposta da API precisam saber da conta. */
public record AuthenticatedUser(UUID id, String username, Role role, ProfileType profileType) {
}
