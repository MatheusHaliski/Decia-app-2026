package br.gov.pr.secid.workstation.web.support;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {
    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void geraIdQuandoOClienteNaoManda() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/x");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicReference<String> seenInMdc = new AtomicReference<>();
        filter.doFilter(req, res, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest r, jakarta.servlet.ServletResponse s) {
                seenInMdc.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        });
        String id = res.getHeader(CorrelationIdFilter.HEADER);
        assertThat(id).isNotBlank().hasSize(36);
        assertThat(seenInMdc.get()).isEqualTo(id);
        assertThat(CorrelationIdFilter.correlationId(req)).isEqualTo(id);
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).as("MDC limpo depois da requisição").isNull();
    }

    @Test
    void reaproveitaIdValidoDoCliente() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/x");
        req.addHeader(CorrelationIdFilter.HEADER, "bff-0123456789abcdef");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertThat(res.getHeader(CorrelationIdFilter.HEADER)).isEqualTo("bff-0123456789abcdef");
    }

    @Test
    void descartaIdSuspeitoDoCliente() {
        assertThat(CorrelationIdFilter.resolve("curto")).hasSize(36);
        assertThat(CorrelationIdFilter.resolve("tem espaço e <script>")).hasSize(36);
        assertThat(CorrelationIdFilter.resolve("x".repeat(65))).hasSize(36);
        assertThat(CorrelationIdFilter.resolve(null)).hasSize(36);
        assertThat(CorrelationIdFilter.resolve("abcdefgh")).isEqualTo("abcdefgh");
    }

    @Test
    void foraDaCadeiaNaoHaId() {
        assertThat(CorrelationIdFilter.correlationId(new MockHttpServletRequest())).isNull();
    }
}
