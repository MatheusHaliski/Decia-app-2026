package br.gov.pr.secid.workstation.infrastructure.mysql.crypto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DataEncryptionConfigTest {

    @Test
    void semChaveEmProdFalhaEForaDeProdUsaEfemeraComAviso() {
        assertThatThrownBy(() -> DataEncryptionConfig.build("", true)).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WS_DATA_ENCRYPTION_KEY");
        assertThatThrownBy(() -> DataEncryptionConfig.build(null, true)).isInstanceOf(IllegalStateException.class);
        FieldCipher dev = DataEncryptionConfig.build(" ", false);
        assertThat(dev.decrypt(dev.encrypt("ok"))).isEqualTo("ok");
        String key = FieldCipherTest.randomKeyBase64(32);
        assertThat(DataEncryptionConfig.build(key, true).hmac("a")).isEqualTo(FieldCipher.fromBase64(key).hmac("a"));
    }

    @Test
    void conversorJpaUsaACifraConfiguradaEFalhaClaroSemEla() {
        AesGcmStringConverter converter = new AesGcmStringConverter();
        AesGcmStringConverter.configure(null);
        assertThatThrownBy(() -> converter.convertToDatabaseColumn("x")).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("sem chave");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
        FieldCipher cipher = FieldCipher.fromBase64(FieldCipherTest.randomKeyBase64(32));
        AesGcmStringConverter.configure(cipher);
        String stored = converter.convertToDatabaseColumn("maria@exemplo.gov.br");
        assertThat(stored).startsWith(FieldCipher.PREFIX).doesNotContain("maria");
        assertThat(converter.convertToEntityAttribute(stored)).isEqualTo("maria@exemplo.gov.br");
    }
}
