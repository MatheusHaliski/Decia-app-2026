package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.ConnectorsProperties;
import br.gov.pr.secid.workstation.application.connectors.ExternalDocPort;
import br.gov.pr.secid.workstation.application.connectors.OAuthClientPort;
import br.gov.pr.secid.workstation.application.connectors.TokenCipherPort;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.security.SecureRandom;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** AES-256-GCM dos tokens (chave própria, IV aleatório, contexto como AAD) e a ligação dos adaptadores pela chave geral. */
class AesGcmTokenCipherTest {

    static String key() {
        byte[] k = new byte[32];
        new SecureRandom().nextBytes(k);
        return Base64.getEncoder().encodeToString(k);
    }

    @Test
    void selaEAbreNoMesmoContextoComIvNovoACadaVez() {
        AesGcmTokenCipher c = AesGcmTokenCipher.fromBase64(key()).orElseThrow();
        String a = c.seal("ya29.token-secreto", "connector:dono:GOOGLE:access");
        String b = c.seal("ya29.token-secreto", "connector:dono:GOOGLE:access");
        assertThat(a).startsWith(AesGcmTokenCipher.PREFIX).doesNotContain("token-secreto").isNotEqualTo(b);
        assertThat(c.open(a, "connector:dono:GOOGLE:access")).isEqualTo("ya29.token-secreto");
        assertThat(c.available()).isTrue();
        assertThat(c.toString()).doesNotContain(a);
    }

    @Test
    void recusaContextoChaveOuDadoAdulterado() {
        String k = key();
        AesGcmTokenCipher c = AesGcmTokenCipher.fromBase64(k).orElseThrow();
        String sealed = c.seal("refresh", "connector:A:GOOGLE:refresh");
        assertThatThrownBy(() -> c.open(sealed, "connector:B:GOOGLE:refresh")).isInstanceOf(IllegalStateException.class)
                .hasMessageNotContaining("refresh-");
        assertThatThrownBy(() -> AesGcmTokenCipher.fromBase64(key()).orElseThrow().open(sealed, "connector:A:GOOGLE:refresh"))
                .isInstanceOf(IllegalStateException.class);
        String tampered = sealed.substring(0, sealed.length() - 4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
        assertThatThrownBy(() -> c.open(tampered, "connector:A:GOOGLE:refresh")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> c.open("texto-puro", "x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> c.open(AesGcmTokenCipher.PREFIX + "sem-separador", "x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> c.open(AesGcmTokenCipher.PREFIX + "!!:??", "x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> c.open(null, "x")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> c.seal(null, "x")).isInstanceOf(IllegalArgumentException.class);
        assertThat(AesGcmTokenCipher.fromBase64(k).orElseThrow().open(sealed, "connector:A:GOOGLE:refresh")).isEqualTo("refresh");
    }

    @Test
    void chaveAusenteOuInvalidaDesabilita() {
        assertThat(AesGcmTokenCipher.fromBase64(null)).isEmpty();
        assertThat(AesGcmTokenCipher.fromBase64("  ")).isEmpty();
        assertThat(AesGcmTokenCipher.fromBase64("não-é-base64!")).isEmpty();
        assertThat(AesGcmTokenCipher.fromBase64(Base64.getEncoder().encodeToString(new byte[16]))).as("AES-128 não serve").isEmpty();
        assertThatThrownBy(() -> new AesGcmTokenCipher(new byte[31])).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void adaptadoresSoNascemComAChaveGeralEACifraSoComChaveValida() {
        ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(ConnectorsAdaptersConfig.class);
        runner.withBean(ConnectorsProperties.class, ConnectorsProperties::disabled)
                .run(ctx -> assertThat(ctx).doesNotHaveBean(TokenCipherPort.class).doesNotHaveBean(OAuthClientPort.class));

        ConnectorsProperties semChave = new ConnectorsProperties(true, "", null, null, 0, null, null);
        runner.withPropertyValues("ws.connectors.enabled=true").withBean(ConnectorsProperties.class, () -> semChave).run(ctx -> {
            assertThat(ctx.getBean(TokenCipherPort.class).available()).isFalse();
            assertThat(ctx.getBeansOfType(OAuthClientPort.class)).hasSize(2);
            assertThat(ctx.getBeansOfType(ExternalDocPort.class)).hasSize(2);
        });

        ConnectorsProperties comChave = new ConnectorsProperties(true, key(), null, null, 0, null, null);
        runner.withPropertyValues("ws.connectors.enabled=true").withBean(ConnectorsProperties.class, () -> comChave)
                .run(ctx -> assertThat(ctx.getBean(TokenCipherPort.class)).isInstanceOf(AesGcmTokenCipher.class));
    }
}
