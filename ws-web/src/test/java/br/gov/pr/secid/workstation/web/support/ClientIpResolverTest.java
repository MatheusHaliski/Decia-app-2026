package br.gov.pr.secid.workstation.web.support;

import org.junit.jupiter.api.Test;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** O IP vem do BFF assinado, senão do cabeçalho único da borda, senão do TCP — e X-Forwarded-For nunca entra. */
class ClientIpResolverTest {
    /** Segredo de teste gerado por execução (nunca versionado): 64 hex. */
    private static final String SECRET = java.util.HexFormat.of().formatHex(randomBytes());
    /** Proxies de confiança dos testes: o TCP 10.0.0.9 usado abaixo é "a borda". */
    private static final List<String> BORDA = List.of("10.0.0.0/8", "fd00::/8", "192.0.2.1");
    private final AtomicLong now = new AtomicLong(1_760_000_000L);
    private final ClientIpResolver resolver = new ClientIpResolver(SECRET, "X-Real-IP", BORDA, now::get);

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
        ClientIpResolver semBorda = new ClientIpResolver("", "", BORDA, now::get);
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
        ClientIpResolver curto = new ClientIpResolver("curto", "X-Real-IP", BORDA, now::get);
        assertThat(curto.signedHeadersEnabled()).isFalse();
        long ts = now.get();
        assertThat(curto.resolve(signed("198.51.100.4", ts, ClientIpResolver.signature("curto", "198.51.100.4", ts))))
                .as("mesmo assinando com o segredo curto, o cabeçalho é ignorado").isEqualTo("10.0.0.9");
        assertThat(new ClientIpResolver("", "X-Real-IP", BORDA, now::get).signedHeadersEnabled()).isFalse();
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
        ClientIpResolver semHeader = new ClientIpResolver(SECRET, "", BORDA, now::get);
        MockHttpServletRequest fresh = request("10.0.0.9");
        fresh.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(semHeader.resolve(fresh)).as("cabeçalho da borda desligado").isEqualTo("10.0.0.9");
    }

    /** Achado P1 (Codex): o cabeçalho da borda só vale vindo de um proxy confiável (WS_TRUSTED_PROXIES), senão qualquer cliente escolhe o IP. */
    @Test
    void cabecalhoDaBordaSoValeDePeerNaAllowlistDeProxies() {
        ClientIpResolver semAllowlist = new ClientIpResolver("", "X-Real-IP", List.of(), now::get);
        MockHttpServletRequest r = request("10.0.0.9");
        r.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(semAllowlist.resolve(r)).as("allowlist vazia = cabeçalho ignorado").isEqualTo("10.0.0.9");
        assertThat(semAllowlist.trustedProxies()).isEmpty();

        ClientIpResolver allow = new ClientIpResolver("", "X-Real-IP", List.of(" 10.0.0.0/8 ", " 192.0.2.7", "2001:db8::/32 "), now::get);
        assertThat(allow.trustedProxies()).hasSize(3);
        MockHttpServletRequest fromProxy = request("10.200.3.4");
        fromProxy.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(allow.resolve(fromProxy)).isEqualTo("203.0.113.10");
        MockHttpServletRequest fromClient = request("198.51.100.44");
        fromClient.addHeader("X-Real-IP", "203.0.113.10");
        fromClient.addHeader("X-Forwarded-For", "203.0.113.11");
        assertThat(allow.resolve(fromClient)).as("peer fora da allowlist: cabeçalho ignorado, XFF também").isEqualTo("198.51.100.44");
        MockHttpServletRequest single = request("192.0.2.7");
        single.addHeader("X-Real-IP", "203.0.113.12");
        assertThat(allow.resolve(single)).isEqualTo("203.0.113.12");
        MockHttpServletRequest v6 = request("2001:db8:aaaa::1");
        v6.addHeader("X-Real-IP", "203.0.113.13");
        assertThat(allow.resolve(v6)).isEqualTo("203.0.113.13");
        MockHttpServletRequest v6out = request("2001:db9::1");
        v6out.addHeader("X-Real-IP", "203.0.113.13");
        assertThat(allow.resolve(v6out)).isEqualTo("2001:db9:0:0:0:0:0:1");
        // o IP assinado pelo BFF continua valendo de qualquer peer (a prova é a assinatura, não o peer)
        long ts = now.get();
        MockHttpServletRequest signedFromAnywhere = request("198.51.100.44");
        signedFromAnywhere.addHeader(ClientIpResolver.SIGNED_IP, "198.51.100.4");
        signedFromAnywhere.addHeader(ClientIpResolver.SIGNED_TS, String.valueOf(ts));
        signedFromAnywhere.addHeader(ClientIpResolver.SIGNED_SIG, ClientIpResolver.signature(SECRET, "198.51.100.4", ts));
        assertThat(new ClientIpResolver(SECRET, "X-Real-IP", List.of(), now::get).resolve(signedFromAnywhere)).isEqualTo("198.51.100.4");
        for (String bad : new String[] {"nao-ip", "10.0.0.0/33", "10.0.0.0/x", "evil.example/8"}) {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> new ClientIpResolver("", "X-Real-IP", List.of(bad), now::get))
                    .as(bad).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(ClientIpResolver.Cidr.parse("10.1.2.3").prefix()).isEqualTo(32);
        assertThat(ClientIpResolver.Cidr.parse("::1").prefix()).isEqualTo(128);
        assertThat(ClientIpResolver.Cidr.parse("10.0.0.0/8").contains(java.net.InetAddress.getLoopbackAddress())).isFalse();
    }

    @Test
    void literalIpNormalizaENuncaResolveNomes() {
        assertThat(ClientIpResolver.literalIp("::ffff:203.0.113.5")).isEqualTo("203.0.113.5");
        assertThat(ClientIpResolver.literalIp("256.1.1.1")).isNull();
        assertThat(ClientIpResolver.literalIp("localhost")).isNull();
        assertThat(ClientIpResolver.literalIp(null)).isNull();
        assertThat(ClientIpResolver.literalIp("2001:db8::g")).isNull();
    }

    private static java.net.InetAddress addr(String literal) throws java.net.UnknownHostException {
        return java.net.InetAddress.getByName(literal);   // só literais nos testes: sem DNS
    }

    @Test
    void cabecalhoDaBordaSoValeQuandoATcpVemDeProxyDeConfianca() throws Exception {
        MockHttpServletRequest direto = request("198.51.100.7");
        direto.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(resolver.resolve(direto)).as("cliente que alcança a API direto não escolhe o próprio balde").isEqualTo("198.51.100.7");
        MockHttpServletRequest v6 = request("fd00::1");
        v6.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(resolver.resolve(v6)).isEqualTo("203.0.113.10");
        MockHttpServletRequest exato = request("192.0.2.1");
        exato.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(resolver.resolve(exato)).isEqualTo("203.0.113.10");
        MockHttpServletRequest vizinho = request("192.0.2.2");
        vizinho.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(resolver.resolve(vizinho)).isEqualTo("192.0.2.2");
        ClientIpResolver semProxy = new ClientIpResolver(SECRET, "X-Real-IP", List.of(), now::get);
        assertThat(semProxy.edgeHeaderEnabled()).isFalse();
        MockHttpServletRequest interno = request("10.0.0.9");
        interno.addHeader("X-Real-IP", "203.0.113.10");
        assertThat(semProxy.resolve(interno)).as("lista vazia = cabeçalho ignorado").isEqualTo("10.0.0.9");
        assertThat(new ClientIpResolver(SECRET, "X-Real-IP", List.of(" ", ""), now::get).edgeHeaderEnabled()).isFalse();
        assertThat(resolver.edgeHeaderEnabled()).isTrue();
        assertThat(resolver.isTrustedProxy(null)).isFalse();
        assertThat(resolver.isTrustedProxy("lixo")).isFalse();
        assertThat(ClientIpResolver.Cidr.parse("10.1.0.0/12").contains(addr("10.15.255.255"))).isTrue();
        assertThat(ClientIpResolver.Cidr.parse("10.1.0.0/12").contains(addr("10.16.0.0"))).isFalse();
        assertThat(ClientIpResolver.Cidr.parse("10.0.0.0/8").contains(addr("fd00::1"))).as("famílias diferentes").isFalse();
        assertThat(ClientIpResolver.Cidr.parse("::/0").contains(addr("2001:db8::1"))).isTrue();
        assertThat(ClientIpResolver.Cidr.parse("[2001:db8::]/32").contains(addr("2001:db8:ffff::1"))).isTrue();
        assertThatThrownBy(() -> ClientIpResolver.Cidr.parse("proxy.example")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ClientIpResolver.Cidr.parse("10.0.0.0/33")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ClientIpResolver.Cidr.parse("10.0.0.0/x")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void enderecoTcpVemDaRequisicaoOriginalPorBaixoDeWrapperQueLeXForwardedFor() {
        MockHttpServletRequest original = request("198.51.100.7");
        original.addHeader("X-Forwarded-For", "1.2.3.4");
        original.addHeader("X-Real-IP", "203.0.113.10");
        HttpServletRequestWrapper comoForwardedHeaderFilter = new HttpServletRequestWrapper(original) {
            @Override
            public String getRemoteAddr() {
                return "10.0.0.9";          // o ForwardedHeaderFilter deriva isto de X-Forwarded-For: parece "a borda"
            }
        };
        assertThat(ClientIpResolver.socketAddress(comoForwardedHeaderFilter)).isEqualTo("198.51.100.7");
        assertThat(resolver.resolve(comoForwardedHeaderFilter)).as("o X-Real-IP não vale: a TCP real não é a borda").isEqualTo("198.51.100.7");
    }
}
