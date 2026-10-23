package br.gov.pr.secid.workstation.application.identity;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** RFC 6238 apêndice B (HMAC-SHA1, 8 dígitos) + janela de ±1 passo, anti-reuso e URI otpauth. */
class TotpTest {
    static final byte[] RFC_KEY = "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    @Test
    void vetoresOficiaisDaRfc6238() {
        Map<Long, String> vectors = Map.of(59L, "94287082", 1111111109L, "07081804", 1111111111L, "14050471", 1234567890L, "89005924",
                2000000000L, "69279037", 20000000000L, "65353130");
        vectors.forEach((t, expected) -> assertThat(Totp.code(RFC_KEY, Totp.step(Instant.ofEpochSecond(t)), 8)).as("T=%d", t).isEqualTo(expected));
        assertThat(Totp.code(RFC_KEY, 1, 6)).isEqualTo("287082");
    }

    @Test
    void base32IdaEVoltaESegredoDe160Bits() {
        assertThat(Totp.base32Encode(RFC_KEY)).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
        assertThat(Totp.base32Decode("gezd gnbv-gy3tqojq gezdgnbvgy3tqojq")).isEqualTo(RFC_KEY);
        String secret = Totp.newSecret(new SecureRandom());
        assertThat(secret).matches("[A-Z2-7]{32}");
        assertThat(Totp.base32Decode(secret)).hasSize(Totp.SECRET_BYTES);
    }

    @Test
    void aceitaUmPassoDeDiferencaENaoAceitaReusoNemCodigoVelho() {
        String secret = Totp.base32Encode(RFC_KEY);
        Instant now = Instant.ofEpochSecond(1_700_000_000L);
        long step = Totp.step(now);
        String atual = Totp.code(RFC_KEY, step, 6);
        String anterior = Totp.code(RFC_KEY, step - 1, 6);
        assertThat(Totp.verify(secret, atual, now, Long.MIN_VALUE)).hasValue(step);
        assertThat(Totp.verify(secret, "  " + anterior.substring(0, 3) + " " + anterior.substring(3), now, Long.MIN_VALUE)).hasValue(step - 1);
        assertThat(Totp.verify(secret, Totp.code(RFC_KEY, step + 1, 6), now, Long.MIN_VALUE)).hasValue(step + 1);
        assertThat(Totp.verify(secret, Totp.code(RFC_KEY, step - 2, 6), now, Long.MIN_VALUE)).as("fora da janela").isEmpty();
        assertThat(Totp.verify(secret, atual, now, step)).as("o mesmo código não entra de novo").isEmpty();
        assertThat(Totp.verify(secret, anterior, now, step)).as("nem um código anterior ao último aceito").isEmpty();
        assertThat(Totp.verify(secret, "12345", now, Long.MIN_VALUE)).isEmpty();
        assertThat(Totp.verify(secret, "abcdef", now, Long.MIN_VALUE)).isEmpty();
        assertThat(Totp.verify(null, atual, now, Long.MIN_VALUE)).isEmpty();
    }

    @Test
    void uriOtpauthNoFormatoDosAplicativos() {
        assertThat(Totp.otpauthUri("Work Station", "maria.silva", "ABC234"))
                .isEqualTo("otpauth://totp/Work%20Station:maria.silva?secret=ABC234&issuer=Work%20Station&algorithm=SHA1&digits=6&period=30");
    }
}
