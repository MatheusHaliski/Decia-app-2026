package br.gov.pr.secid.workstation.web.auth;

import br.gov.pr.secid.workstation.application.identity.AuthenticatedUser;

import java.util.UUID;

/**
 * Resposta do login: access token (só em memória no front — RN49.01), tipo, validade em segundos e o cartão da conta.
 * O refresh token em cookie {@code ws_rt} entra com o RF2 (rotação por família em Redis).
 *
 * @param accessToken JWT RS256
 * @param tokenType   sempre {@code Bearer}
 * @param expiresIn   segundos até expirar
 * @param user        id, nome de usuário, papel e tipo de perfil
 */
public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserCard user) {

    public record UserCard(UUID id, String username, String role, String profileType) {
        public static UserCard of(AuthenticatedUser u) {
            return new UserCard(u.id(), u.username(), u.role() == null ? null : u.role().name(),
                    u.profileType() == null ? null : u.profileType().name());
        }
    }
}
