package br.gov.pr.secid.workstation.web.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Argon2id com os parâmetros mínimos da OWASP; rehash detectado quando o hash veio de parâmetros mais fracos. */
class Argon2PasswordHasherTest {
    private final Argon2PasswordHasher hasher = new Argon2PasswordHasher();

    @Test
    void hashEArgon2idComOsParametrosDaOwaspESaltAleatorio() {
        String h1 = hasher.hash("Senha-forte-1");
        String h2 = hasher.hash("Senha-forte-1");
        assertThat(h1).startsWith("$argon2id$v=19$m=19456,t=2,p=1$");
        assertThat(h1).isNotEqualTo(h2);                  // salt diferente a cada hash
        assertThat(h1.length()).isLessThanOrEqualTo(255); // cabe em users.password_hash VARCHAR(255)
        assertThat(hasher.matches("Senha-forte-1", h1)).isTrue();
        assertThat(hasher.matches("Senha-forte-1", h2)).isTrue();
        assertThat(hasher.matches("senha-forte-1", h1)).isFalse();
        assertThat(hasher.needsRehash(h1)).isFalse();
    }

    @Test
    void hashComParametrosMaisFracosOuDeOutroAlgoritmoPedeRehash() {
        String fraco = new Argon2PasswordEncoder(16, 32, 1, 4_096, 1).encode("Senha-forte-1");
        assertThat(hasher.matches("Senha-forte-1", fraco)).as("ainda confere").isTrue();
        assertThat(hasher.needsRehash(fraco)).isTrue();
        assertThat(hasher.needsRehash("$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345")).isTrue();
        assertThat(hasher.needsRehash(null)).isTrue();
        assertThat(hasher.needsRehash(" ")).isTrue();
    }

    @Test
    void entradasInvalidasNuncaLancamNoMatches() {
        String h = hasher.hash("x");
        assertThat(hasher.matches(null, h)).isFalse();
        assertThat(hasher.matches("x", null)).isFalse();
        assertThat(hasher.matches("x", "")).isFalse();
        assertThat(hasher.matches("x", "nao-e-um-hash")).isFalse();
        assertThat(hasher.matches("x", "$argon2id$v=19$m=19456,t=2,p=1$corrompido")).isFalse();
        assertThatThrownBy(() -> hasher.hash("")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> hasher.hash(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
