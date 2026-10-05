package br.gov.pr.secid.workstation.web.security;

import br.gov.pr.secid.workstation.application.identity.PasswordHasher;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Argon2id nos parâmetros mínimos da OWASP (Password Storage Cheat Sheet; RF1.CA07, D-14): 19 MiB de memória,
 * 2 iterações, paralelismo 1, sal de 16 bytes e hash de 32 bytes. Hashes feitos com parâmetros antigos continuam
 * valendo e são refeitos no próximo login certo ({@link #needsRehash}).
 */
@Component
public class Argon2PasswordHasher implements PasswordHasher {
    public static final int SALT_LENGTH = 16;
    public static final int HASH_LENGTH = 32;
    public static final int PARALLELISM = 1;
    public static final int MEMORY_KIB = 19_456;
    public static final int ITERATIONS = 2;

    private final Argon2PasswordEncoder encoder =
            new Argon2PasswordEncoder(SALT_LENGTH, HASH_LENGTH, PARALLELISM, MEMORY_KIB, ITERATIONS);

    @Override
    public String hash(String rawPassword) {
        return encoder.encode(rawPassword == null ? "" : rawPassword);
    }

    @Override
    public boolean matches(String rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isBlank()) {
            return false;
        }
        try {
            return encoder.matches(rawPassword == null ? "" : rawPassword, encodedPassword);
        } catch (RuntimeException e) {
            return false;                                   // formato desconhecido nunca confere
        }
    }

    @Override
    public boolean needsRehash(String encodedPassword) {
        try {
            return encodedPassword != null && encoder.upgradeEncoding(encodedPassword);
        } catch (RuntimeException e) {
            return false;                                   // formato desconhecido: não mexe
        }
    }
}
