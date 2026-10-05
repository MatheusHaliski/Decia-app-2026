package br.gov.pr.secid.workstation.application.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/** Normalização de identificadores de login e o hash de e-mail usado em {@code users.email_hash} (busca e unicidade). */
public final class Identifiers {
    private Identifiers() {
    }

    /** {@code "  Maria.Silva@PR.gov.br "} → {@code "maria.silva@pr.gov.br"}; nulo vira vazio. */
    public static String normalize(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean looksLikeEmail(String normalized) {
        int at = normalized.indexOf('@');
        return at > 0 && at < normalized.length() - 1;
    }

    /** SHA-256 (hex minúsculo) do e-mail normalizado — determinístico para a busca; o e-mail em si só existe cifrado. */
    public static String emailHash(String email) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(normalize(email).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
