package br.gov.pr.secid.workstation.application.connectors;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * PKCE (RFC 7636, método S256) e o {@code state}: 32 bytes do {@link SecureRandom} em base64url sem preenchimento (43 caracteres — dentro
 * de 43..128 do {@code code_verifier}); {@code code_challenge} = base64url(SHA-256(verifier)). O {@code state} é guardado só como
 * SHA-256 em hex.
 */
public final class Pkce {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern TOKEN = Pattern.compile("^[A-Za-z0-9_-]{43}$");

    private Pkce() {
    }

    /** Valor aleatório de 256 bits em base64url (state ou code_verifier). */
    public static String randomToken() {
        byte[] b = new byte[32];
        RANDOM.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static String challenge(String verifier) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(sha256(verifier.getBytes(StandardCharsets.US_ASCII)));
    }

    public static String sha256Hex(String value) {
        return HexFormat.of().formatHex(sha256(value.getBytes(StandardCharsets.UTF_8)));
    }

    /** O {@code state} recebido no callback tem o formato que este servidor gera (nada de consultar o banco com lixo). */
    public static boolean wellFormed(String token) {
        return token != null && TOKEN.matcher(token).matches();
    }

    private static byte[] sha256(byte[] in) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(in);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
