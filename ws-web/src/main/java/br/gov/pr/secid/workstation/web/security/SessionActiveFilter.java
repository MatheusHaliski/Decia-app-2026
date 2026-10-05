package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.identity.AuthCodes;
import br.gov.pr.secid.workstation.application.identity.SessionStorePort;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.util.UUID;

/**
 * Depois da validação do JWT (RF2.CA05/CA13): recusa access tokens cuja família ({@code sid}) foi revogada — logout,
 * reuso de refresh detectado, troca de senha — com {@code 401 SESSAO_ENCERRADA}. Token sem {@code sid} ou com
 * {@code sid} inválido também é recusado: toda sessão desta API nasce com família. Não é {@code @Component}: entra só
 * na cadeia do Spring Security (SecurityConfig), para não rodar duas vezes.
 */
public class SessionActiveFilter extends OncePerRequestFilter {
    private final SessionStorePort sessions;
    private final ErrorWriter errors;
    private final Clock clock;

    public SessionActiveFilter(SessionStorePort sessions, ErrorWriter errors, Clock clock) {
        this.sessions = sessions;
        this.errors = errors;
        this.clock = clock;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken token && !active(token.getToken().getClaimAsString("sid"))) {
            SecurityContextHolder.clearContext();
            response.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
            errors.write(request, response, 401, AuthCodes.SESSAO_ENCERRADA, "Sua sessão foi encerrada. Entre de novo.");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean active(String sid) {
        if (sid == null || sid.isBlank()) {
            return false;
        }
        try {
            return sessions.familyActive(UUID.fromString(sid), clock.instant());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
