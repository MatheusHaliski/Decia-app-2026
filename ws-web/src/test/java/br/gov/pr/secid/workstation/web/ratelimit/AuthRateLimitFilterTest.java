package br.gov.pr.secid.workstation.web.ratelimit;

import br.gov.pr.secid.workstation.application.ratelimit.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.ratelimit.QuotaStatus;
import br.gov.pr.secid.workstation.application.ratelimit.RateLimitPort;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.support.ClientIpResolver;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** CA04: o 31º login em 10 min do mesmo IP recebe 429 + Retry-After; IPv6 do mesmo /64 é o mesmo balde; XFF forjado não muda nada. */
class AuthRateLimitFilterTest {
    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final InMemoryRateLimit rateLimit = new InMemoryRateLimit(clock, 1_000);
    private final HashBulkhead bulkhead = new HashBulkhead(2, 50);
    private final AuthRateLimitFilter filter = new AuthRateLimitFilter(rateLimit,
            new ClientIpResolver("", "X-Real-IP", List.of(), clock), bulkhead, new ErrorWriter(new ObjectMapper()), clock);

    private MockHttpServletResponse call(String method, String path, String ip, String... headers) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(method, path);
        req.setRequestURI(path);
        req.setRemoteAddr(ip);
        for (int i = 0; i < headers.length; i += 2) {
            req.addHeader(headers[i], headers[i + 1]);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res;
    }

    @Test
    void trigesimoPrimeiroLoginDoMesmoIpRecebe429ComRetryAfter() throws Exception {
        for (int i = 1; i <= 30; i++) {
            assertThat(call("POST", "/api/auth/login", "203.0.113.9").getStatus()).as("login %d", i).isEqualTo(200);
        }
        MockHttpServletResponse r = call("POST", "/api/auth/login", "203.0.113.9");
        assertThat(r.getStatus()).isEqualTo(429);
        assertThat(r.getHeader("Retry-After")).isEqualTo(String.valueOf(Duration.ofMinutes(10).toSeconds()));
        assertThat(r.getContentType()).startsWith("application/json");
        assertThat(r.getContentAsString()).contains("\"code\":\"MUITAS_TENTATIVAS\"").contains("\"status\":429");
        // outro IP e outra rota seguem livres
        assertThat(call("POST", "/api/auth/login", "203.0.113.10").getStatus()).isEqualTo(200);
        assertThat(call("POST", "/api/auth/refresh", "203.0.113.9").getStatus()).isEqualTo(200);
        assertThat(bulkhead.available()).as("vaga devolvida em todos os caminhos").isEqualTo(2);
    }

    @Test
    void mesmoPrefixoIpv6EOMesmoBaldeEOutroPrefixoNao() throws Exception {
        for (int i = 1; i <= 30; i++) {
            assertThat(call("POST", "/api/auth/login", "2001:db8:0:1::" + Integer.toHexString(i)).getStatus()).isEqualTo(200);
        }
        assertThat(call("POST", "/api/auth/login", "2001:db8:0:1:ffff:ffff:ffff:ffff").getStatus()).isEqualTo(429);
        assertThat(call("POST", "/api/auth/login", "2001:db8:0:2::1").getStatus()).isEqualTo(200);
        assertThat(rateLimit.status("ip:2001:db8:0:1::/64", "post:/api/auth/login", 30, Duration.ofMinutes(10)).used()).isEqualTo(31);
    }

    @Test
    void xForwardedForForjadoNaoAbreBaldeNovo() throws Exception {
        for (int i = 1; i <= 30; i++) {
            call("POST", "/api/auth/login", "203.0.113.9", "X-Forwarded-For", "10.0.0." + i);
        }
        assertThat(call("POST", "/api/auth/login", "203.0.113.9", "X-Forwarded-For", "10.9.9.9").getStatus()).isEqualTo(429);
    }

    @Test
    void rotasForaDasRegrasNaoContamNemPassamPeloBulkhead() throws Exception {
        for (int i = 0; i < 40; i++) {
            assertThat(call("GET", "/api/tasks", "203.0.113.9").getStatus()).isEqualTo(200);
        }
        assertThat(rateLimit.size()).isZero();
        assertThat(AuthRateLimitFilter.ruleFor("GET", "/api/auth/login")).isEmpty();
        assertThat(AuthRateLimitFilter.ruleFor("post", "/api/auth/login")).isPresent();
        assertThat(AuthRateLimitFilter.ruleFor("POST", "/api/auth/login").get().bucket()).isEqualTo("post:/api/auth/login");
        assertThat(AuthRateLimitFilter.bucketKey("2001:db8::1")).isEqualTo("ip:2001:db8:0:0::/64");
    }

    @Test
    void semVagaNoBulkheadRotaComHashRecebe503EOutrasSeguem() throws Exception {
        assertThat(bulkhead.tryAcquire()).isTrue();
        assertThat(bulkhead.tryAcquire()).isTrue();
        MockHttpServletResponse r = call("POST", "/api/auth/login", "203.0.113.9");
        assertThat(r.getStatus()).isEqualTo(503);
        assertThat(r.getHeader("Retry-After")).isEqualTo("1");
        assertThat(r.getContentAsString()).contains("\"code\":\"AUTENTICACAO_OCUPADA\"");
        assertThat(call("POST", "/api/auth/refresh", "203.0.113.9").getStatus()).as("rota sem hash não usa o bulkhead").isEqualTo(200);
        assertThat(call("GET", "/api/auth/username/availability", "203.0.113.9").getStatus()).isEqualTo(200);
        bulkhead.release();
        assertThat(call("POST", "/api/auth/login", "203.0.113.9").getStatus()).isEqualTo(200);
        bulkhead.release();
        assertThat(bulkhead.available()).isEqualTo(2);
    }

    @Test
    void vagaDoBulkheadVoltaMesmoQuandoARotaLancaEOContextPathEDescontado() throws Exception {
        AtomicInteger chamadas = new AtomicInteger();
        MockHttpServletRequest req = new MockHttpServletRequest("PUT", "/ws/api/me/password");
        req.setContextPath("/ws");
        req.setRequestURI("/ws/api/me/password");
        req.setRemoteAddr("203.0.113.9");
        assertThatThrownBy(() -> filter.doFilter(req, new MockHttpServletResponse(), (rq, rs) -> {
            chamadas.incrementAndGet();
            throw new ServletException("boom");
        })).isInstanceOf(ServletException.class);
        assertThat(chamadas.get()).isEqualTo(1);
        assertThat(bulkhead.available()).isEqualTo(2);
        assertThat(rateLimit.status("ip:203.0.113.9", "put:/api/me/password", 20, Duration.ofHours(1)).used()).isEqualTo(1);
    }

    @Test
    void armazenamentoDoLimiteForaDoArFechaARotaCom503NoContratoDeErro() throws Exception {
        RateLimitPort quebrado = new RateLimitPort() {
            @Override
            public boolean tryAcquire(String owner, String bucket, int limit, Duration window) {
                throw new org.springframework.dao.DataAccessResourceFailureException("redis fora do ar");
            }

            @Override
            public QuotaStatus status(String owner, String bucket, int limit, Duration window) {
                throw new IllegalStateException("não deve ser chamado");
            }

            @Override
            public void reset(String owner, String bucket) {
            }
        };
        AuthRateLimitFilter fechado = new AuthRateLimitFilter(quebrado, new ClientIpResolver("", "X-Real-IP", List.of(), clock),
                bulkhead, new ErrorWriter(new ObjectMapper()), clock);
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setRequestURI("/api/auth/login");
        req.setRemoteAddr("203.0.113.9");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicInteger chamadas = new AtomicInteger();
        fechado.doFilter(req, res, (rq, rs) -> chamadas.incrementAndGet());
        assertThat(chamadas.get()).as("fail closed: a rota não roda").isZero();
        assertThat(res.getStatus()).isEqualTo(503);
        assertThat(res.getHeader("Retry-After")).isEqualTo(String.valueOf(AuthRateLimitFilter.STORE_RETRY_AFTER_SECONDS));
        assertThat(res.getContentType()).startsWith("application/json");
        assertThat(res.getContentAsString()).contains("\"code\":\"SERVICO_INDISPONIVEL\"").contains("\"status\":503");
        assertThat(bulkhead.available()).isEqualTo(2);
        // rota fora das regras continua passando
        MockHttpServletRequest livre = new MockHttpServletRequest("GET", "/api/tasks");
        livre.setRequestURI("/api/tasks");
        fechado.doFilter(livre, new MockHttpServletResponse(), (rq, rs) -> chamadas.incrementAndGet());
        assertThat(chamadas.get()).isEqualTo(1);
    }
}
