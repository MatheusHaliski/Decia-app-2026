package br.gov.pr.secid.workstation.infrastructure.mysql.crypto;

import br.gov.pr.secid.workstation.application.identity.EmailHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.Arrays;

/**
 * Chave dos campos sensíveis ({@code ws.data.encryption-key} = {@code WS_DATA_ENCRYPTION_KEY}). Em prod a ausência já
 * derruba o boot pelo {@code RequiredSecretsGuard}; aqui o perfil {@code prod} falha de novo por garantia. Fora de prod,
 * sem chave: WARN e chave efêmera de processo — os dados cifrados não sobrevivem ao reinício, por desenho.
 */
@Configuration
public class DataEncryptionConfig {
    private static final Logger log = LoggerFactory.getLogger(DataEncryptionConfig.class);

    @Bean
    FieldCipher fieldCipher(@Value("${ws.data.encryption-key:}") String key, Environment env) {
        FieldCipher cipher = build(key, Arrays.asList(env.getActiveProfiles()).contains("prod"));
        AesGcmStringConverter.configure(cipher);
        return cipher;
    }

    static FieldCipher build(String key, boolean prod) {
        if (key != null && !key.isBlank()) {
            FieldCipher c = FieldCipher.fromBase64(key);
            log.info("Cifra AES-GCM dos campos sensíveis configurada (WS_DATA_ENCRYPTION_KEY presente)");
            return c;
        }
        if (prod) {
            throw new IllegalStateException("WS_DATA_ENCRYPTION_KEY ausente em prod: a API não sobe sem a chave dos campos sensíveis");
        }
        log.warn("WS_DATA_ENCRYPTION_KEY ausente: usando chave AES EFÊMERA de processo (só fora de prod). E-mails e telefones"
                + " gravados agora não serão legíveis depois do reinício.");
        return FieldCipher.ephemeral();
    }

    @Bean
    EmailHasher emailHasher(FieldCipher cipher) {
        return cipher::hmac;
    }
}
