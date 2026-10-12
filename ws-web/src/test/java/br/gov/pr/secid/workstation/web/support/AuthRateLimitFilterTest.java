package br.gov.pr.secid.workstation.web.support;

import br.gov.pr.secid.workstation.application.identity.InMemoryRateLimit;
import br.gov.pr.secid.workstation.application.identity.RateLimitPort;
import br.gov.pr.secid.workstation.application.identity.RateLimitPort.QuotaStatus;
import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import br.gov.pr.secid.workstation.web.error.ErrorWriter;
import br.gov.pr.secid.workstation.web.security.HashBulkhead;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** Limite por IP + método + rota antes do Spring Security (RF2.CA10) e bulkhead de hashes (RF2.CA11). */
class AuthRateLimitFilterTest {
    private final RateLimitPort rateLimit = new InMemoryRateLimit();
    private final WsSecurityProperties props = new WsSecurityProperties(null,
            new WsSecurityProperties.Cors(List.of("http://localhost:3000")));
    private final ErrorWriter errors = new ErrorWriter(new ObjectMapper());
    private final AuthRateLimitFilter filter = new AuthRateLimitFilter(rateLimit, new ClientIpResolver("", "X-Real-IP", List.of("10.0.0.0/8")),
            new HashBulkhead(8, 2000), errors, props, true);

    private static MockHttpServletRequest login(String rawUri, String servletPath, String xff) {
        MockHttpServletRequest r = new MockHttpServletRequest("POST", rawUri);
        r.setServletPath(servletPath);
        r.setRemoteAddr("10.0.0.9");
        if (xff != null) {
            r.addHeader("X-Forwarded-For", xff);
        }
        return r;
    }

    private static MockHttpServletRequest from(String method, String path, String realIp) {
        MockHttpServletRequest r = new MockHttpServletRequest(method, path);
        r.setServletPath(path);
        r.setRemoteAddr("10.0.0.9");
        r.addHeader("X-Real-IP", realIp);
        return r;
    }

    private MockHttpServletResponse send(AuthRateLimitFilter f, MockHttpServletRequest r) throws Exception {
        MockHttpServletResponse res = new MockHttpServletResponse();
        f.doFilter(r, res, new MockFilterChain());
        return res;
    }

    private int status(MockHttpServletRequest r) throws Exception {
        return send(filter, r).getStatus();
    }

    @Test
    void trigesimoPrimeiroLoginDoMesmoIpEm10MinRecebe429ComRetryAfter() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(status(from("POST", "/api/auth/login", "203.0.113.9"))).isEqualTo(200);
        }
        MockHttpServletRequest r = from("POST", "/api/auth/login", "203.0.113.9");
        r.addHeader("Origin", "http://localhost:3000");
        r.addHeader(CorrelationIdFilter.HEADER, "corr-rate-limit-1");
        MockHttpServletResponse res = send(filter, r);
        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(Long.parseLong(res.getHeader("Retry-After"))).isBetween(1L, 600L);
        assertThat(res.getContentAsString()).contains("\"code\":\"MUITAS_TENTATIVAS\"").contains("\"status\":429");
        assertThat(res.getHeader("Access-Control-Allow-Origin")).isEqualTo("http://localhost:3000");
        // outro IP continua livre
        assertThat(status(from("POST", "/api/auth/login", "203.0.113.10"))).isEqualTo(200);
    }

    @Test
    void xForwardedForForjadoNaoAbreBaldeNovo() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(status(login("/api/auth/login", "/api/auth/login", "203.0.113." + i))).isEqualTo(200);
        }
        assertThat(status(login("/api/auth/login", "/api/auth/login", "198.51.100.1"))).isEqualTo(429);
    }

    @Test
    void uriCodificadaOuComBarrasNaoEscapaDaRegra() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(status(login("/api/auth/login", "/api/auth/login", null))).isEqualTo(200);
        }
        assertThat(status(login("/api/auth/%6cogin", "/api/auth/login", null))).isEqualTo(429);
        assertThat(status(login("/api/auth/login/", "/api/auth/login/", null))).isEqualTo(429);
        assertThat(status(login("/api//auth/LOGIN", "/api//auth/LOGIN", null))).isEqualTo(429);
        assertThat(status(login("/api/auth/%6Cogin", "", null))).isEqualTo(429);
    }

    /** Um cliente IPv6 controla um /64 inteiro: trocar o fim do endereço não pode abrir balde novo. */
    @Test
    void ipv6ContaPorPrefixo64() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(status(from("POST", "/api/auth/login", "2001:db8:1:2::" + Integer.toHexString(i + 1)))).isEqualTo(200);
        }
        assertThat(status(from("POST", "/api/auth/login", "2001:db8:1:2:ffff:ffff:ffff:1"))).isEqualTo(429);
        assertThat(status(from("POST", "/api/auth/login", "2001:db8:1:3::1"))).as("outro /64 = outro cliente").isEqualTo(200);
        assertThat(AuthRateLimitFilter.bucketKey("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(AuthRateLimitFilter.bucketKey("2001:db8:1:2::abcd")).isEqualTo("20010db800010002::/64");
        assertThat(AuthRateLimitFilter.bucketKey("fe80::1%eth0")).isEqualTo("fe80000000000000::/64");
        assertThat(AuthRateLimitFilter.bucketKey("10.0.0.1")).isEqualTo("10.0.0.1");
        assertThat(AuthRateLimitFilter.bucketKey(null)).isNull();
    }

    @Test
    void tabelaDoBriefLimitaCadaRotaSeparadamente() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertThat(status(from("PUT", "/api/auth/password", "198.51.100.7"))).isEqualTo(200);
        }
        assertThat(status(from("PUT", "/api/auth/password", "198.51.100.7"))).isEqualTo(429);
        for (int i = 0; i < 120; i++) {
            assertThat(status(from("GET", "/api/usernames/alvo" + i + "/availability", "198.51.100.8"))).isEqualTo(200);
        }
        assertThat(status(from("GET", "/api/usernames/outro/availability", "198.51.100.8"))).isEqualTo(429);
        assertThat(status(from("GET", "/api/usernames/a/b/availability", "198.51.100.8"))).as("* é um segmento só").isEqualTo(200);
        for (int i = 0; i < 10; i++) {
            assertThat(status(from("POST", "/api/auth/register", "198.51.100.9"))).isEqualTo(200);
        }
        assertThat(status(from("POST", "/api/auth/register", "198.51.100.9"))).isEqualTo(429);
        assertThat(status(from("POST", "/api/me/deletion", "198.51.100.9"))).as("balde por rota").isEqualTo(200);
        assertThat(AuthRateLimitFilter.RULES).extracting(r -> r.method() + " " + r.path()).contains(
                "POST /api/auth/login", "POST /api/auth/register", "POST /api/auth/refresh",
                "POST /api/auth/password-reset/request", "POST /api/auth/password-reset/confirm", "PUT /api/auth/password",
                "PATCH /api/me/sensitive", "POST /api/me/deletion", "GET /api/usernames/*/availability",
                "GET /api/auth/username-suggestions", "POST /api/auth/uploads", "POST /api/auth/oidc/login",
                "POST /api/auth/email-verification/confirm");
        assertThat(AuthRateLimitFilter.ruleFor("POST", "/api/auth/login").orElseThrow().limit()).isEqualTo(30);
        assertThat(AuthRateLimitFilter.ruleFor("POST", "/api/auth/refresh").orElseThrow().limit()).isEqualTo(120);
    }

    @Test
    void outrasRotasEFiltroDesligadoNaoLimitam() throws Exception {
        for (int i = 0; i < 40; i++) {
            assertThat(status(login("/api/feed", "/api/feed", null))).isEqualTo(200);
        }
        AuthRateLimitFilter off = new AuthRateLimitFilter(rateLimit, new ClientIpResolver("", "X-Real-IP", List.of("10.0.0.0/8")),
                new HashBulkhead(1, 10), errors, props, false);
        for (int i = 0; i < 40; i++) {
            assertThat(send(off, from("POST", "/api/auth/login", "203.0.113.50")).getStatus()).isEqualTo(200);
        }
    }

    /** Bulkhead: com as vagas ocupadas, o pedido seguinte recebe 503 + Retry-After em vez de segurar conexão do banco. */
    @Test
    void hashesSimultaneosAcimaDoTetoRecebem503() throws Exception {
        AuthRateLimitFilter oneSlot = new AuthRateLimitFilter(rateLimit, new ClientIpResolver("", "X-Real-IP", List.of("10.0.0.0/8")),
                new HashBulkhead(1, 50), errors, props, true);
        CountDownLatch inside = new CountDownLatch(1);
        CountDownLatch leave = new CountDownLatch(1);
        ExecutorService pool = Executors.newSingleThreadExecutor();
        try {
            Future<Integer> slow = pool.submit(() -> {
                MockHttpServletResponse res = new MockHttpServletResponse();
                oneSlot.doFilter(from("POST", "/api/auth/login", "198.51.100.20"), res, (rq, rs) -> {
                    inside.countDown();
                    try {
                        leave.await(5, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
                return res.getStatus();
            });
            assertThat(inside.await(5, TimeUnit.SECONDS)).isTrue();
            MockHttpServletResponse busy = send(oneSlot, from("POST", "/api/auth/login", "198.51.100.21"));
            assertThat(busy.getStatus()).isEqualTo(503);
            assertThat(busy.getHeader("Retry-After")).isEqualTo("2");
            assertThat(busy.getContentAsString()).contains("AUTENTICACAO_OCUPADA");
            assertThat(send(oneSlot, from("POST", "/api/auth/refresh", "198.51.100.21")).getStatus())
                    .as("rota sem hash não disputa a vaga").isEqualTo(200);
            leave.countDown();
            assertThat(slow.get(5, TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(send(oneSlot, from("POST", "/api/auth/login", "198.51.100.21")).getStatus())
                    .as("a vaga volta depois do pedido").isEqualTo(200);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void tetoPadraoDoBulkheadSobraConexaoNoPool() {
        assertThat(HashBulkhead.defaultPermits(4, 10)).isEqualTo(4);
        assertThat(HashBulkhead.defaultPermits(16, 10)).isEqualTo(5);
        assertThat(HashBulkhead.defaultPermits(1, 10)).isEqualTo(2);
        assertThat(HashBulkhead.defaultPermits(8, 2)).isEqualTo(1);
        assertThat(HashBulkhead.defaultPermits(8, 0)).isEqualTo(1);
        HashBulkhead b = new HashBulkhead(0, 1, 10);
        assertThat(b.size()).isEqualTo(HashBulkhead.defaultPermits(Runtime.getRuntime().availableProcessors(), 10));
        assertThat(new HashBulkhead(3, 1, 10).size()).isEqualTo(3);
    }

    @Test
    void armazenamentoDoLimiteForaDoArFechaARotaCom503NoContratoDeErro() throws Exception {
        RateLimitPort quebrado = new RateLimitPort() {
            @Override
            public boolean tryAcquire(java.util.UUID owner, String bucket, int limit, java.time.Duration window) {
                throw new org.springframework.dao.DataAccessResourceFailureException("redis fora do ar");
            }

            @Override
            public QuotaStatus status(java.util.UUID owner, String bucket, int limit, java.time.Duration window) {
                throw new IllegalStateException("não deve ser chamado");
            }
        };
        AuthRateLimitFilter fechado = new AuthRateLimitFilter(quebrado, new ClientIpResolver("", "X-Real-IP", List.of("10.0.0.0/8")),
                new HashBulkhead(2, 50), errors, props, true);
        java.util.concurrent.atomic.AtomicInteger chamadas = new java.util.concurrent.atomic.AtomicInteger();
        MockHttpServletResponse res = new MockHttpServletResponse();
        fechado.doFilter(from("POST", "/api/auth/login", "203.0.113.9"), res, (rq, rs) -> chamadas.incrementAndGet());
        assertThat(chamadas.get()).as("fail closed: a rota não roda").isZero();
        assertThat(res.getStatus()).isEqualTo(503);
        assertThat(res.getHeader("Retry-After")).isEqualTo(String.valueOf(AuthRateLimitFilter.STORE_RETRY_AFTER_SECONDS));
        assertThat(res.getContentType()).startsWith("application/json");
        assertThat(res.getContentAsString()).contains("\"code\":\"SERVICO_INDISPONIVEL\"").contains("\"status\":503");
        // rota fora das regras continua passando
        fechado.doFilter(login("/api/feed", "/api/feed", null), new MockHttpServletResponse(), (rq, rs) -> chamadas.incrementAndGet());
        assertThat(chamadas.get()).isEqualTo(1);
    }
}
