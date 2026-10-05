package br.gov.pr.secid.workstation.application.identity;

import java.util.Locale;

/**
 * Hash de busca do e-mail ({@code users.email_hash}): HMAC-SHA256 do e-mail normalizado, com chave derivada de
 * {@code WS_DATA_ENCRYPTION_KEY} (adaptador em persistence-mysql). O hash nunca é exposto na API.
 */
public interface EmailHasher {

    /** Hash do e-mail JÁ normalizado por {@link #normalize}. */
    String hash(String normalizedEmail);

    /** Minúsculas e sem espaços nas pontas — a única forma que entra no hash e no banco. */
    static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
