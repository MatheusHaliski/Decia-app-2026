package br.gov.pr.secid.workstation.web.support;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/** O IP vem do BFF assinado, senão do cabeçalho único da borda, senão do TCP — e X-Forwarded-For nunca entra. */
class ClientIpResolverTest {
    /** Segredo de teste gerado por execução (nunca versionado): 64 hex. */
    private static final String SECRET = java.util.HexFormat.of().formatHex(randomBytes());
    private final AtomicLong now = new AtomicLong(1_760_000_000L);
    private final ClientIpResolver resolver = new ClientIpResolver(SECRET, "X-Real-IP", now::get);

    private static byte[] randomBytes() {
        byte[] b = new byte[32];
        new java.security.SecureRandom().nextBytes(b);
        return b;
    }

    private static MockHttpServletRequest request(String remote) {
        MockHttpServletRequest r = new MockHttpServletRequest("POST", "/api/auth/login");
        r.setRemoteAddr(remote);
        return r;
    }

    private MockHttpServletRequest signed(String ip, long ts, String sig) {
        MockHttpServletRequest r = request("10.0.0.9");
        r.addHeader(ClientIpResolver.SIGNED_IP, ip);
        r.addHeader(ClientIpResolver.SIGNED_TS, String.valueOf(ts));
        r.addHeader(ClientIpResolver.SIGNED_SIG, sig);
        return r;
    }

    @Test
    void xForwardedForEIgnoradoSempre() {
        MockHttpServletRequest r = request("10.0.0.9");
        r.addHeader("X-Forwarded-For", "203.0.113.77, 10.0.0.1");
        assertThat(resolver.resolve(r)).isEqualTo("10.0.0.9");
        ClientIpResolver semBorda = new ClientIpResolver("", "", now::get);
        assertThat(semBorda.resolve(r)).isEqualTo("10.0.0.9");
    }

    @Test
    void ipAssinadoPeloBffValeSoComAssinaturaCertaEDentroDos60s() {
        long ts = now.get();
        String sig = ClientIpResolver.signature(SECRET, "198.51.100.4", ts);
        assertThat(resolver.resolve(signed("198.51.100.4", ts, sig))).isEqualTo("198.51.100.4");
        // assinatura de outro IP não vale para este
        assertThat(resolver.resolve(signed("198.51.100.5", ts, sig))).isEqualTo("10.0.0.9");
        // fora da tolerância (61 s) cai para a próxima fonte
        assertThat(resolver.resolve(signed("198.51.100.4", ts - 61, ClientIpResolver.signature(SECRET, "198.51.100.4", ts - 61))))
                .isEqualTo("10.0.0.9");
        assertThat(resolver.resolve(signed("198.51.100.4", ts + 60, ClientIpResolver.signature(SECRET, "198.51.100.4", ts + 60))))
                .isEqualTo("198.51.100.4");
        // ts inválido, assinatura não-base64 ou ausente
        MockHttpServletRequest semSig = request("10.0.0.9");
        semSig.addHeader(ClientIpResolver.SIGNED_IP, "198.51.100.4");
        assertThat(resolver.resolve(semSig)).isEqualTo("10.0.0.9");
        assertThat(resolver.signedIp("198.51.100.4", "abc", sig)).isNull();
        assertThat(resolver.signedIp("198.51.100.4", String.valueOf(ts), "%%%")).isNull();
        // IP assinado mas não literal (nome de host) nunca passa
        assertThat(resolver.resolve(signed("exemplo.invalid", ts, ClientIpResolver.signature(SECRET, "exemplo.invalid", ts))))
                .isEqualTo("10.0.0.9");
    }

    @Test
    void segredoCurtoOuAusenteDesligaAAssinatura() {
        ClientIpResolver curto = new ClientIpResolver("curto", "X-Real-IP", now::get);
        assertThat(curto.signedHeadersEnabled()).isFalse();
        long ts = now.get();
        assertThat(curto.resolve(signed("198.51.100.4", ts, ClientIpResolver.signature("curto", "198.51.100.4", ts))))
                .as("mesmo assinando com o segredo curto, o cabeçalho é ignorado").isEqualTo("10.0.0.9");
        assertThat(new ClientIpResolver("", "X-Real-IP", now::get).signedHeadersEnabled()).isFalse();
        assertThat(resolver.signedHeadersEnabled()).isTrue();
    }

    @Test
    void cabecalhoDaBordaValeSoSeForIpLiteral() {
        MockHttpServletRequest r = request("10.0.0.9");
        r.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(resolver.resolve(r)).isEqualTo("203.0.113.10");
        MockHttpServletRequest host = request("10.0.0.9");
        host.addHeader("X-Real-IP", "evil.example");
        assertThat(resolver.resolve(host)).isEqualTo("10.0.0.9");
        MockHttpServletRequest v6 = request("10.0.0.9");
        v6.addHeader("X-Real-IP", "[2001:DB8::1]");
        assertThat(resolver.resolve(v6)).isEqualTo("2001:db8:0:0:0:0:0:1");
        // resolvido uma vez por requisição
        assertThat(resolver.resolve(v6)).isEqualTo("2001:db8:0:0:0:0:0:1");
        ClientIpResolver semHeader = new ClientIpResolver(SECRET, "", now::get);
        MockHttpServletRequest fresh = request("10.0.0.9");
        fresh.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(semHeader.resolve(fresh)).as("cabeçalho da borda desligado").isEqualTo("10.0.0.9");
    }

    @Test
    void literalIpNormalizaENuncaResolveNomes() {
        assertThat(ClientIpResolver.literalIp("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(ClientIpResolver.literalIp("256.1.1.1")).isNull();
        assertThat(ClientIpResolver.literalIp("localhost")).isNull();
        assertThat(ClientIpResolver.literalIp(null)).isNull();
        assertThat(ClientIpResolver.literalIp("2001:db8::g")).isNull();
    }
}
