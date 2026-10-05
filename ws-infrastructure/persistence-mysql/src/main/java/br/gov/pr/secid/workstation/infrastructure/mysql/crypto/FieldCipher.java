package br.gov.pr.secid.workstation.infrastructure.mysql.crypto;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Cifra AES-256-GCM dos campos sensíveis ({@code email_enc}, {@code phone_enc}) e HMAC-SHA256 do hash de busca
 * ({@code email_hash}), ambos a partir de {@code WS_DATA_ENCRYPTION_KEY} (base64 de 32 bytes). Formato gravado:
 * {@code enc:v1:<iv b64>:<ciphertext+tag b64>} — o prefixo versionado permite rotação futura ({@code kid}).
 * A chave do HMAC é derivada (SHA-256 da chave + rótulo) para nunca reutilizar a chave de cifra em outra finalidade.
 */
public final class FieldCipher {
    public static final String PREFIX = "enc:v1:";
    public static final int KEY_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SecretKeySpec aesKey;
    private final SecretKeySpec hmacKey;

    private FieldCipher(byte[] raw) {
        if (raw.length != KEY_BYTES) {
            throw new IllegalArgumentException("WS_DATA_ENCRYPTION_KEY precisa decodificar para 32 bytes (openssl rand -base64 32)");
        }
        this.aesKey = new SecretKeySpec(raw, "AES");
        this.hmacKey = new SecretKeySpec(derive(raw, "ws-email-hash"), "HmacSHA256");
    }

    /** A partir do valor base64 da variável. A mensagem de erro nunca contém o valor. */
    public static FieldCipher fromBase64(String base64Key) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key == null ? "" : base64Key.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("WS_DATA_ENCRYPTION_KEY não é base64 válido", null);
        }
        return new FieldCipher(raw);
    }

    /** Chave aleatória de processo — só fora de prod, quando a variável está ausente (dados não sobrevivem ao reinício). */
    public static FieldCipher ephemeral() {
        byte[] raw = new byte[KEY_BYTES];
        RANDOM.nextBytes(raw);
        return new FieldCipher(raw);
    }

    public String encrypt(String plain) {
        if (plain == null) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(ct);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Falha ao cifrar campo sensível", e);
        }
    }

    public String decrypt(String stored) {
        if (stored == null) {
            return null;
        }
        if (!stored.startsWith(PREFIX)) {
            throw new IllegalStateException("Campo sensível sem o prefixo de cifra esperado");
        }
        try {
            String[] parts = stored.substring(PREFIX.length()).split(":", 2);
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ct = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | RuntimeException e) {
            throw new IllegalStateException("Falha ao decifrar campo sensível (chave errada ou dado adulterado)", e);
        }
    }

    /** HMAC-SHA256 em hex do valor já normalizado (e-mail em minúsculas). */
    public String hmac(String normalized) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(hmacKey);
            return HexFormat.of().formatHex(mac.doFinal((normalized == null ? "" : normalized).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] derive(byte[] raw, String label) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            sha.update(raw);
            return sha.digest(label.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
