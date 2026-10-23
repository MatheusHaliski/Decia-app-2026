package br.gov.pr.secid.workstation.application.identity;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.OptionalLong;

/**
 * Senha de uso único baseada em tempo (RFC 6238 sobre o HOTP da RFC 4226): HMAC-SHA1, 6 dígitos, passo de 30 s — o que todo
 * aplicativo autenticador aceita (Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden). Sem dependência
 * externa; os vetores de teste da RFC 6238 (apêndice B) estão em {@code TotpTest}.
 */
public final class Totp {
    public static final int DIGITS = 6;
    public static final long PERIOD_SECONDS = 30;
    /** Passos aceitos antes e depois do atual: tolera ±30 s de relógio entre o celular e o servidor. */
    public static final int WINDOW = 1;
    /** 160 bits, o tamanho recomendado pela RFC 4226 §4 para HMAC-SHA1. */
    public static final int SECRET_BYTES = 20;

    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int[] POW10 = {1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000};

    private Totp() {
    }

    public static String newSecret(SecureRandom random) {
        byte[] key = new byte[SECRET_BYTES];
        random.nextBytes(key);
        return base32Encode(key);
    }

    public static long step(Instant at) {
        return Math.floorDiv(at.getEpochSecond(), PERIOD_SECONDS);
    }

    /** HOTP(K, C) truncado para {@code digits} dígitos (RFC 4226 §5.3). */
    public static String code(byte[] key, long counter, int digits) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] msg = new byte[8];
            for (int i = 7; i >= 0; i--) {
                msg[i] = (byte) (counter & 0xff);
                counter >>>= 8;
            }
            byte[] h = mac.doFinal(msg);
            int offset = h[h.length - 1] & 0x0f;
            int bin = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
            return String.format(Locale.ROOT, "%0" + digits + "d", bin % POW10[digits]);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA1 indisponível", e);
        }
    }

    /**
     * Confere o código contra os passos {@code atual ± WINDOW}, só aceitando passo MAIOR que {@code lastUsedStep} (o mesmo código
     * não serve duas vezes, nem um código anterior a outro já usado). Devolve o passo que casou. Comparação em tempo constante.
     */
    public static OptionalLong verify(String secretBase32, String code, Instant now, long lastUsedStep) {
        if (secretBase32 == null || code == null) {
            return OptionalLong.empty();
        }
        String digits = code.replaceAll("\\s", "");
        if (!digits.matches("\\d{" + DIGITS + "}")) {
            return OptionalLong.empty();
        }
        byte[] key = base32Decode(secretBase32);
        long current = step(now);
        long matched = -1;
        for (long s = current - WINDOW; s <= current + WINDOW; s++) {
            boolean same = java.security.MessageDigest.isEqual(code(key, s, DIGITS).getBytes(StandardCharsets.US_ASCII),
                    digits.getBytes(StandardCharsets.US_ASCII));
            if (same && s > lastUsedStep && matched < 0) {
                matched = s;
            }
        }
        return matched < 0 ? OptionalLong.empty() : OptionalLong.of(matched);
    }

    /** URI {@code otpauth://} (formato Key Uri do Google Authenticator) que os aplicativos leem por QR ou link. */
    public static String otpauthUri(String issuer, String account, String secretBase32) {
        String label = enc(issuer) + ":" + enc(account);
        return "otpauth://totp/" + label + "?secret=" + secretBase32 + "&issuer=" + enc(issuer)
                + "&algorithm=SHA1&digits=" + DIGITS + "&period=" + PERIOD_SECONDS;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8).replace("+", "%20");
    }

    public static String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) {
            out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        }
        return out.toString();
    }

    public static byte[] base32Decode(String text) {
        String s = text.replaceAll("[\\s=-]", "").toUpperCase(Locale.ROOT);
        ByteArrayOutputStream out = new ByteArrayOutputStream(s.length() * 5 / 8);
        int buffer = 0;
        int bits = 0;
        for (char c : s.toCharArray()) {
            int v = BASE32.indexOf(c);
            if (v < 0) {
                throw new IllegalArgumentException("caractere fora do Base32");
            }
            buffer = (buffer << 5) | v;
            bits += 5;
            if (bits >= 8) {
                out.write((buffer >> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        return out.toByteArray();
    }
}
