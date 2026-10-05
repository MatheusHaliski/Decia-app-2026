package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.ApiException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

class UsernamesAndPasswordsTest {

    @Test
    void normalizaERecusaReservados() {
        assertThat(Usernames.normalize(" @Maria.Sílva ")).isEqualTo("maria.silva");
        assertThat(Usernames.normalize(null)).isEmpty();
        assertThat(Usernames.problem("maria.silva")).isNull();
        assertThat(Usernames.problem("ab")).isEqualTo("FORMATO");
        assertThat(Usernames.problem(".maria")).isEqualTo("FORMATO");
        assertThat(Usernames.problem("a".repeat(31))).isEqualTo("FORMATO");
        for (String r : new String[] {"admin", "root", "suporte", "secid", "decia", "workstation", "demo_x1", "e2e_teste"}) {
            assertThat(Usernames.problem(r)).as(r).isEqualTo("RESERVADO");
        }
        assertThat(Usernames.problem("ADMIN")).as("só depois de normalizar").isEqualTo("FORMATO");
        assertThat(Usernames.problem(Usernames.normalize("ADMIN"))).isEqualTo("RESERVADO");
        assertThat(Usernames.baseFrom("Maria da Silva")).isEqualTo("maria.da.silva");
        assertThat(Usernames.baseFrom("!!")).isEqualTo("usuario");
        assertThat(Usernames.baseFrom("x".repeat(60))).hasSize(26);
    }

    @Test
    void politicaMinimaDeSenha() {
        assertThat(Passwords.problem(null)).isPresent();
        assertThat(Passwords.problem("curta1")).isPresent();
        assertThat(Passwords.problem("somenteletras")).isPresent();
        assertThat(Passwords.problem("1234567890123")).isPresent();
        assertThat(Passwords.problem("a1".repeat(70))).isPresent();
        assertThat(Passwords.problem("letras-e-1-numero")).isEmpty();
        ApiException e = catchThrowableOfType(ApiException.class, () -> Passwords.validate("curta1", "outra"));
        assertThat(e.status()).isEqualTo(422);
        assertThat(e.details().toString()).contains("password").contains("confirmPassword");
        Passwords.validate("letras-e-1-numero", "letras-e-1-numero");
    }
}
