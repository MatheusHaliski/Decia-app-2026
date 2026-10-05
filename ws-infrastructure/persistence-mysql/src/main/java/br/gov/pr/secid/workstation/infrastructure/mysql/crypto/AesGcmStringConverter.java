package br.gov.pr.secid.workstation.infrastructure.mysql.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Conversor JPA dos campos AES-GCM ({@code @Convert} em {@code email_enc}/{@code phone_enc}). O Hibernate instancia o
 * conversor sem o contêiner Spring, por isso a cifra é injetada de forma estática pelo {@link DataEncryptionConfig}
 * na subida do contexto — antes de qualquer leitura ou escrita.
 */
@Converter
public class AesGcmStringConverter implements AttributeConverter<String, String> {
    private static volatile FieldCipher cipher;

    /** Chamado pelo {@link DataEncryptionConfig} (ou por testes). */
    public static void configure(FieldCipher fieldCipher) {
        cipher = fieldCipher;
    }

    static FieldCipher cipher() {
        FieldCipher c = cipher;
        if (c == null) {
            throw new IllegalStateException("AesGcmStringConverter sem chave: DataEncryptionConfig não configurou a cifra");
        }
        return c;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute == null ? null : cipher().encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData == null ? null : cipher().decrypt(dbData);
    }
}
