package br.gov.pr.secid.workstation.application.identity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Resposta de login/refresh. O {@code refreshToken} vai no corpo SÓ para o BFF (Bloco 4), que o guarda no cookie
 * {@code ws_rt} HttpOnly/Secure/SameSite=Strict e nunca o entrega ao navegador; o access token fica só em memória.
 */
public record Session(String accessToken, String tokenType, long expiresIn, String refreshToken, Instant refreshExpiresAt,
                      UUID sessionId, UserView user, List<String> warnings) {
}
