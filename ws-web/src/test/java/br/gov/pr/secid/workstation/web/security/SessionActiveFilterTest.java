package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.identity.InMemorySessionStore;
import br.gov.pr.secid.workstation.application.identity.RefreshRecord;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** RF2.CA05/CA13: token válido de família revogada (ou sem sid) é recusado com 401 SESSAO_ENCERRADA. */
class SessionActiveFilterTest {
    private final InMemorySessionStore sessions = new InMemorySessionStore();
    private final SessionActiveFilter filter = new SessionActiveFilter(sessions, new ErrorWriter(new ObjectMapper()), Clock.systemUTC());

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void authenticate(String sid) {
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "RS256").subject(UUID.randomUUID().toString()).claim("role", "USER");
        if (sid != null) {
            b.claim("sid", sid);
        }
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(b.build(), List.of()));
    }

    private MockHttpServletResponse send() throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/me"), res, new MockFilterChain());
        return res;
    }

    @Test
    void familiaVivaPassaERevogadaRecebe401() throws Exception {
        UUID family = UUID.randomUUID();
        Instant now = Instant.now();
        sessions.save(new RefreshRecord("h1", family, UUID.randomUUID(), now, now.plus(Duration.ofDays(1)), null, null, false, null));
        authenticate(family.toString());
        assertThat(send().getStatus()).isEqualTo(200);
        sessions.revokeFamily(family, now);
        authenticate(family.toString());
        MockHttpServletResponse res = send();
        assertThat(res.getStatus()).isEqualTo(401);
        assertThat(res.getContentAsString()).contains("SESSAO_ENCERRADA");
        assertThat(res.getHeader("WWW-Authenticate")).contains("invalid_token");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void tokenSemSidOuComSidInvalidoERecusadoERequisicaoAnonimaPassa() throws Exception {
        authenticate(null);
        assertThat(send().getStatus()).isEqualTo(401);
        authenticate("nao-e-uuid");
        assertThat(send().getStatus()).isEqualTo(401);
        authenticate(UUID.randomUUID().toString());
        assertThat(send().getStatus()).as("família desconhecida").isEqualTo(401);
        SecurityContextHolder.clearContext();
        assertThat(send().getStatus()).as("sem autenticação o filtro não decide nada").isEqualTo(200);
    }
}
