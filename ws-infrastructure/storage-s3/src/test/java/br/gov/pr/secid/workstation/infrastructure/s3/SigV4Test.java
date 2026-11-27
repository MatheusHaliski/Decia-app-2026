package br.gov.pr.secid.workstation.infrastructure.s3;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link SigV4} contra os exemplos PUBLICADOS da AWS (documentação "Signature Version 4 — Examples"/"Authenticating Requests: Using Query
 * Parameters"): mesma chave de exemplo, mesmo instante, mesma assinatura. As credenciais são as de exemplo da documentação (montadas em
 * partes para o scanner de segredos não confundir com credencial real).
 */
class SigV4Test {
    private static final String ACCESS = "AKIAIOSFODNN7" + "EXAMPLE";
    private static final String SECRET = "wJalrXUtnFEMI/K7MDENG/" + "bPxRfiCYEXAMPLEKEY";
    private static final Instant AT = Instant.parse("2013-05-24T00:00:00Z");

    @Test
    void getObjectComRangeBateComOExemploDaAws() {
        SigV4 s = new SigV4(ACCESS, SECRET, "us-east-1", "s3");
        Map<String, String> h = new LinkedHashMap<>();
        h.put("host", "examplebucket.s3.amazonaws.com");
        h.put("range", "bytes=0-9");
        h.put("x-amz-content-sha256", SigV4.EMPTY_SHA256);
        h.put("x-amz-date", "20130524T000000Z");
        String auth = s.authorization("GET", "/test.txt", Map.of(), h, SigV4.EMPTY_SHA256, AT);
        assertThat(auth).isEqualTo("AWS4-HMAC-SHA256 Credential=" + ACCESS + "/20130524/us-east-1/s3/aws4_request, "
                + "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, "
                + "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
    }

    @Test
    void urlPreAssinadaBateComOExemploDaAws() {
        SigV4 s = new SigV4(ACCESS, SECRET, "us-east-1", "s3");
        String q = s.presignedQuery("examplebucket.s3.amazonaws.com", "/test.txt", AT, 86_400);
        assertThat(q).startsWith("X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=" + ACCESS + "%2F20130524%2Fus-east-1%2Fs3%2Faws4_request"
                + "&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host");
        assertThat(q).endsWith("&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
    }

    @Test
    void codificacaoUriDaSigV4() {
        assertThat(SigV4.encode("private/a b/ç~._-", false)).isEqualTo("private/a%20b/%C3%A7~._-");
        assertThat(SigV4.encode("a/b", true)).isEqualTo("a%2Fb");
        assertThat(SigV4.canonicalQuery(Map.of("b", "2", "a", "x y"))).isEqualTo("a=x%20y&b=2");
        assertThat(SigV4.sha256Hex(new byte[0])).isEqualTo(SigV4.EMPTY_SHA256);
        assertThat(new SigV4(ACCESS, SECRET, "us-east-1", "s3").toString()).doesNotContain(SECRET).doesNotContain(ACCESS);
    }
}
