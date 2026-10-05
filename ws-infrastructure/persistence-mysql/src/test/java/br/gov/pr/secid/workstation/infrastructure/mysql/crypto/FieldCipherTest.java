package br.gov.pr.secid.workstation.infrastructure.mysql.crypto;

import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** AES-GCM dos campos sensíveis e HMAC do e-mail — chave gerada por execução, nunca versionada. */
class FieldCipherTest {

    static String randomKeyBase64(int bytes) {
        byte[] raw = new byte[bytes];
        new SecureRandom().nextBytes(raw);
        return Base64.getEncoder().encodeToString(raw);
    }

    @Test
    void cifraDecifraComIvAleatorioEPrefixoVersionado() {
        FieldCipher cipher = FieldCipher.fromBase64(randomKeyBase64(32));
        String a = cipher.encrypt("maria.silva@exemplo.gov.br");
        String b = cipher.encrypt("maria.silva@exemplo.gov.br");
        assertThat(a).startsWith(FieldCipher.PREFIX).doesNotContain("maria").isNotEqualTo(b);
        assertThat(cipher.decrypt(a)).isEqualTo("maria.silva@exemplo.gov.br");
        assertThat(cipher.decrypt(b)).isEqualTo("maria.silva@exemplo.gov.br");
        assertThat(cipher.encrypt(null)).isNull();
        assertThat(cipher.decrypt(null)).isNull();
        assertThat(cipher.encrypt("")).isNotEmpty();
        assertThat(cipher.decrypt(cipher.encrypt(""))).isEmpty();
    }

    @Test
    void chaveErradaOuDadoAdulteradoFalhamSemVazarOTexto() {
        FieldCipher one = FieldCipher.fromBase64(randomKeyBase64(32));
        FieldCipher other = FieldCipher.fromBase64(randomKeyBase64(32));
        String enc = one.encrypt("segredo-pessoal");
        assertThatThrownBy(() -> other.decrypt(enc)).isInstanceOf(IllegalStateException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("segredo-pessoal"));
        String tampered = enc.substring(0, enc.length() - 2) + (enc.endsWith("A") ? "BB" : "AA");
        assertThatThrownBy(() -> one.decrypt(tampered)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> one.decrypt("texto em claro")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void chaveInvalidaERecusadaComMensagemSemOValor() {
        String curta = randomKeyBase64(16);
        assertThatThrownBy(() -> FieldCipher.fromBase64(curta)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("32 bytes").satisfies(e -> assertThat(e.getMessage()).doesNotContain(curta));
        assertThatThrownBy(() -> FieldCipher.fromBase64("%%%nao-base64")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> FieldCipher.fromBase64("")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void hmacDoEmailEDeterministicoPorChaveEDiferenteDaCifra() {
        String key = randomKeyBase64(32);
        FieldCipher a = FieldCipher.fromBase64(key);
        FieldCipher b = FieldCipher.fromBase64(key);
        assertThat(a.hmac("maria@exemplo.gov.br")).isEqualTo(b.hmac("maria@exemplo.gov.br")).hasSize(64)
                .isNotEqualTo(a.hmac("mario@exemplo.gov.br"));
        assertThat(FieldCipher.fromBase64(randomKeyBase64(32)).hmac("maria@exemplo.gov.br"))
                .as("outra chave, outro hash").isNotEqualTo(a.hmac("maria@exemplo.gov.br"));
        assertThat(a.hmac(null)).isEqualTo(a.hmac(""));
    }

    @Test
    void chaveEfemeraFuncionaMasMudaPorProcesso() {
        FieldCipher e1 = FieldCipher.ephemeral();
        FieldCipher e2 = FieldCipher.ephemeral();
        assertThat(e1.decrypt(e1.encrypt("x"))).isEqualTo("x");
        assertThatThrownBy(() -> e2.decrypt(e1.encrypt("x"))).isInstanceOf(IllegalStateException.class);
    }
}
