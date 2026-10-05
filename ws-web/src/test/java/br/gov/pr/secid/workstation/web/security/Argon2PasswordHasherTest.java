package br.gov.pr.secid.workstation.web.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/** RF1.CA07: Argon2id exatamente em m=19456 KiB, t=2, p=1, sal 16, hash 32; rehash quando os parâmetros mudam. */
class Argon2PasswordHasherTest {
    private final Argon2PasswordHasher hasher = new Argon2PasswordHasher();
    /** Senha de teste gerada por execução — nunca um valor fixo no repositório. */
    private final String password = "pw-" + java.util.UUID.randomUUID();

    @Test
    void hashEArgon2idComOsParametrosDaOwasp() {
        String encoded = hasher.hash(password);
        assertThat(encoded).startsWith("$argon2id$v=19$m=19456,t=2,p=1$");
        String[] parts = encoded.split("\\$");
        assertThat(java.util.Base64.getDecoder().decode(parts[4])).hasSize(16);   // sal
        assertThat(java.util.Base64.getDecoder().decode(parts[5])).hasSize(32);   // hash
        assertThat(hasher.matches(password, encoded)).isTrue();
        assertThat(hasher.matches(password + "x", encoded)).isFalse();
        assertThat(hasher.needsRehash(encoded)).isFalse();
        assertThat(hasher.hash(password)).as("sal aleatório").isNotEqualTo(encoded);
    }

    @Test
    void hashComParametrosAntigosConfereMasPedeRehash() {
        String legacy = new Argon2PasswordEncoder(16, 32, 1, 16_384, 2).encode(password);
        assertThat(hasher.matches(password, legacy)).isTrue();
        assertThat(hasher.needsRehash(legacy)).isTrue();
    }

    @Test
    void formatoDesconhecidoOuVazioNuncaConfereNemQuebra() {
        assertThat(hasher.matches(password, null)).isFalse();
        assertThat(hasher.matches(password, "")).isFalse();
        assertThat(hasher.matches(password, "h:abc")).isFalse();
        assertThat(hasher.needsRehash("h:abc")).isFalse();
        assertThat(hasher.needsRehash(null)).isFalse();
        assertThat(hasher.matches("", hasher.hash(password))).isFalse();
    }
}
