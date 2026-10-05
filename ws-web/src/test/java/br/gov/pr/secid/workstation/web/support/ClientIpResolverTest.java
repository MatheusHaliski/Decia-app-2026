package br.gov.pr.secid.workstation.web.support;

import br.gov.pr.secid.workstation.web.config.WsSecurityProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/** IP assinado › X-Real-IP › TCP, nunca X-Forwarded-For; só literais; IPv6 por /64 (SEG RN49.04). */
class ClientIpResolverTest {
    private static final String SECRET = "segredo-de-teste-com-mais-de-32-caracteres-ok";
    private static final Instant NOW = Instant.parse("2026-10-05T12:00:00Z");
    private final ClientIpResolver resolver = new ClientIpResolver(SECRET, "X-Real-IP", Clock.fixed(NOW, ZoneOffset.UTC));

    private static MockHttpServletRequest req(String remoteAddr) {
        MockHttpServletRequest r = new MockHttpServletRequest("POST", "/api/auth/login");
        r.setRemoteAddr(remoteAddr);
        return r;
    }

    @Test
    void semCabecalhosValeOEnderecoTcpEXForwardedForEIgnorado() {
        MockHttpServletRequest r = req("198.51.100.7");
        r.addHeader("X-Forwarded-For", "1.2.3.4");
        assertThat(resolver.resolve(r)).isEqualTo("198.51.100.7");
        assertThat(ClientIpResolver.clientIp(r)).as("fica no atributo para o controller").isEqualTo("198.51.100.7");
    }

    @Test
    void xRealIpDaBordaValeSoSeForLiteral() {
        MockHttpServletRequest r = req("10.0.0.1");
        r.addHeader("X-Real-IP", "203.0.113.9");
        assertThat(resolver.resolve(r)).isEqualTo("203.0.113.9");
        MockHttpServletRequest nome = req("10.0.0.1");
        nome.addHeader("X-Real-IP", "evil.example.test");
        assertThat(resolver.resolve(nome)).as("nome de host nunca é resolvido").isEqualTo("10.0.0.1");
        MockHttpServletRequest lixo = req("10.0.0.1");
        lixo.addHeader("X-Real-IP", "999.1.1.1; DROP");
        assertThat(resolver.resolve(lixo)).isEqualTo("10.0.0.1");
    }

    @Test
    void ipAssinadoPeloBffGanhaDeTudoQuandoAssinaturaETempoConferem() {
        long ts = NOW.getEpochSecond() - 30;
        MockHttpServletRequest r = req("10.0.0.1");
        r.addHeader("X-Real-IP", "203.0.113.9");
        r.addHeader(ClientIpResolver.SIGNED_IP, "2001:db8:0:1::abcd");
        r.addHeader(ClientIpResolver.SIGNED_TS, String.valueOf(ts));
        r.addHeader(ClientIpResolver.SIGNED_SIG, ClientIpResolver.sign(SECRET, "2001:db8:0:1::abcd", ts));
        assertThat(resolver.resolve(r)).isEqualTo("2001:db8:0:1:0:0:0:abcd");
    }

    @Test
    void assinaturaErradaTempoVencidoOuSegredoFracoSaoIgnorados() {
        long ts = NOW.getEpochSecond();
        String outro = ClientIpResolver.sign("outro-segredo-com-mais-de-32-caracteres", "203.0.113.9", ts);
        assertThat(resolver.signedIp("203.0.113.9", String.valueOf(ts), outro)).isNull();
        assertThat(resolver.signedIp("203.0.113.9", String.valueOf(ts), "zz")).as("assinatura fora do formato").isNull();
        assertThat(resolver.signedIp("203.0.113.9", "ontem", ClientIpResolver.sign(SECRET, "203.0.113.9", ts))).isNull();
        long velho = ts - 61;
        assertThat(resolver.signedIp("203.0.113.9", String.valueOf(velho), ClientIpResolver.sign(SECRET, "203.0.113.9", velho))).isNull();
        long futuro = ts + 61;
        assertThat(resolver.signedIp("203.0.113.9", String.valueOf(futuro), ClientIpResolver.sign(SECRET, "203.0.113.9", futuro))).isNull();
        assertThat(resolver.signedIp("203.0.113.9", String.valueOf(ts), ClientIpResolver.sign(SECRET, "203.0.113.9", ts))).isEqualTo("203.0.113.9");
        assertThat(resolver.signedIp("nao-e-ip", String.valueOf(ts), ClientIpResolver.sign(SECRET, "nao-e-ip", ts))).isNull();
        assertThat(resolver.signedIp(null, null, null)).isNull();

        ClientIpResolver fraco = new ClientIpResolver("curto", "X-Real-IP", Clock.fixed(NOW, ZoneOffset.UTC));
        assertThat(fraco.signedIp("203.0.113.9", String.valueOf(ts), ClientIpResolver.sign("curto", "203.0.113.9", ts))).isNull();
        ClientIpResolver semSegredo = new ClientIpResolver(new WsSecurityProperties(null, null, null));
        assertThat(semSegredo.signedIp("203.0.113.9", String.valueOf(ts), ClientIpResolver.sign(SECRET, "203.0.113.9", ts))).isNull();
    }

    @Test
    void ipv6ContaPeloPrefixo64EIpv4Inteiro() {
        assertThat(ClientIpResolver.bucketOwner("2001:db8:0:1::1")).isEqualTo("2001:db8:0:1::/64");
        assertThat(ClientIpResolver.bucketOwner("2001:db8:0:1:ffff:ffff:ffff:ffff")).isEqualTo("2001:db8:0:1::/64");
        assertThat(ClientIpResolver.bucketOwner("2001:db8:0:2::1")).isEqualTo("2001:db8:0:2::/64");
        assertThat(ClientIpResolver.bucketOwner("[fe80::1%eth0]")).isEqualTo("fe80:0:0:0::/64");
        assertThat(ClientIpResolver.bucketOwner("203.0.113.9")).isEqualTo("203.0.113.9");
        assertThat(ClientIpResolver.bucketOwner("::ffff:203.0.113.9")).as("IPv4 mapeado em IPv6 é IPv4").isEqualTo("203.0.113.9");
        assertThat(ClientIpResolver.bucketOwner("lixo")).isEqualTo("lixo");
    }

    @Test
    void literaisInvalidosViramNuloEEnderecoTcpAusenteVira0000() {
        assertThat(ClientIpResolver.literalIp(null)).isNull();
        assertThat(ClientIpResolver.literalIp("")).isNull();
        assertThat(ClientIpResolver.literalIp("localhost")).isNull();
        assertThat(ClientIpResolver.literalIp("256.1.1.1")).isNull();
        assertThat(ClientIpResolver.literalIp(" 203.0.113.9 ")).isEqualTo("203.0.113.9");
        assertThat(ClientIpResolver.literalIp("::1")).isEqualTo("0:0:0:0:0:0:0:1");
        MockHttpServletRequest r = req(null);
        r.setRemoteAddr(null);
        assertThat(resolver.resolve(r)).isEqualTo("0.0.0.0");
    }
}
