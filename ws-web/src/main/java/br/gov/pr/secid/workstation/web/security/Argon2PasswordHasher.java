package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.identity.PasswordHasherPort;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Argon2id (ARQUITETURA §3.3, SEG): {@code m=19456 KiB, t=2, p=1}, salt de 16 bytes e hash de 32 — a configuração
 * mínima recomendada pela OWASP (Password Storage Cheat Sheet). {@link #needsRehash} detecta hash gerado com
 * parâmetros diferentes dos atuais (ou com outro algoritmo) para o login refazer o hash com a senha certa em mãos.
 * {@link #matches} nunca lança: hash nulo ou ilegível é simplesmente "não confere".
 */
@Component
public class Argon2PasswordHasher implements PasswordHasherPort {
    public static final int MEMORY_KIB = 19_456;
    public static final int ITERATIONS = 2;
    public static final int PARALLELISM = 1;
    public static final int SALT_LENGTH = 16;
    public static final int HASH_LENGTH = 32;

    private final Argon2PasswordEncoder encoder =
            new Argon2PasswordEncoder(SALT_LENGTH, HASH_LENGTH, PARALLELISM, MEMORY_KIB, ITERATIONS);

    @Override
    public String hash(CharSequence raw) {
        if (raw == null || raw.isEmpty()) {
            throw new IllegalArgumentException("senha vazia não gera hash");
        }
        return encoder.encode(raw);
    }

    @Override
    public boolean matches(CharSequence raw, String encoded) {
        if (raw == null || encoded == null || encoded.isBlank()) {
            return false;
        }
        try {
            return encoder.matches(raw, encoded);
        } catch (RuntimeException e) {
            return false;     // hash ilegível (outro formato, corrompido): nunca vira 500 nem oráculo
        }
    }

    @Override
    public boolean needsRehash(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return true;
        }
        try {
            return encoder.upgradeEncoding(encoded);
        } catch (RuntimeException e) {
            return true;      // não é Argon2 (ou está corrompido): refazer
        }
    }
}
