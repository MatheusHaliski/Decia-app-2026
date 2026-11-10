package br.gov.pr.secid.workstation.infrastructure.platform.connectors;

import br.gov.pr.secid.workstation.application.connectors.TokenCipherPort;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * AES-256-GCM dos segredos dos conectores com a chave PRÓPRIA {@code WS_CONNECTORS_TOKEN_KEY} (base64 de 32 bytes; separada da chave dos
 * campos pessoais, {@code WS_DATA_ENCRYPTION_KEY}). IV aleatório de 96 bits por valor, tag de 128 bits e o contexto (dono + provedor +
 * tipo) como dado autenticado (AAD). Formato: {@code ctk:v1:<iv b64>:<ciphertext+tag b64>} — o prefixo versionado permite rotação.
 * Nenhuma mensagem de erro carrega a chave, o valor ou o contexto.
 */
public final class AesGcmTokenCipher implements TokenCipherPort {
    public static final String PREFIX = "ctk:v1:";
    public static final int KEY_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SecretKeySpec key;

    AesGcmTokenCipher(byte[] raw) {
        if (raw == null || raw.length != KEY_BYTES) {
            throw new IllegalArgumentException("WS_CONNECTORS_TOKEN_KEY precisa decodificar para 32 bytes (openssl rand -base64 32)");
        }
        this.key = new SecretKeySpec(raw.clone(), "AES");
    }

    /** Chave válida → cifra; vazia, base64 inválido ou tamanho diferente de 32 bytes → vazio (conectores desabilitados). */
    public static Optional<AesGcmTokenCipher> fromBase64(String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            return Optional.empty();
        }
        try {
            byte[] raw = Base64.getDecoder().decode(base64Key.trim());
            return raw.length == KEY_BYTES ? Optional.of(new AesGcmTokenCipher(raw)) : Optional.empty();
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    @Override
    public String seal(String plaintext, String context) {
        if (plaintext == null) {
            throw new IllegalArgumentException("nada a selar");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            RANDOM.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            c.updateAAD(aad(context));
            byte[] ct = c.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(ct);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("falha ao selar segredo do conector", e);
        }
    }

    @Override
    public String open(String sealed, String context) {
        if (sealed == null || !sealed.startsWith(PREFIX)) {
            throw new IllegalStateException("segredo do conector sem o prefixo esperado");
        }
        try {
            String[] parts = sealed.substring(PREFIX.length()).split(":", 2);
            if (parts.length != 2) {
                throw new IllegalStateException("segredo do conector malformado");
            }
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ct = Base64.getDecoder().decode(parts[1]);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            c.updateAAD(aad(context));
            return new String(c.doFinal(ct), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("segredo do conector não abre (chave trocada, contexto diferente ou dado adulterado)", e);
        }
    }

    private static byte[] aad(String context) {
        return ("ws-connectors|" + (context == null ? "" : context)).getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String toString() {
        return "AesGcmTokenCipher{key=***}";
    }
}
