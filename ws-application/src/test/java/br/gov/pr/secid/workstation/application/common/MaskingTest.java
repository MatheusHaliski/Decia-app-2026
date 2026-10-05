package br.gov.pr.secid.workstation.application.common;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class MaskingTest {

    @ParameterizedTest
    @CsvSource({
            "maria.silva@gmail.com, m***@g***.com",
            "m@g.com, m***@g***.com",
            "chefe@secid.pr.gov.br, c***@s***.br",
            "'  joao@empresa.com.br  ', j***@e***.br",
            "sem-arroba, ***",
            "vazio@, ***",
            "@semlocal.com, ***@s***.com",
            "x@localhost, x***@l***",
    })
    void mascaraEmailSemVazarOValor(String input, String expected) {
        String masked = Masking.maskEmail(input);
        assertThat(masked).isEqualTo(expected);
        if (input.contains("@") && input.trim().indexOf('@') > 1) {
            assertThat(masked).doesNotContain(input.trim().substring(1, input.trim().indexOf('@')));
        }
    }

    @Test
    void nuloViraAsteriscos() {
        assertThat(Masking.maskEmail(null)).isEqualTo("***");
        assertThat(Masking.maskTail(null, 4)).isEqualTo("***");
        assertThat(Masking.maskTail("   ", 4)).isEqualTo("***");
    }

    @Test
    void maskTailMostraSoOFinal() {
        assertThat(Masking.maskTail("41999998888", 4)).isEqualTo("***8888");
        assertThat(Masking.maskTail("1234", 4)).isEqualTo("***");
        assertThat(Masking.maskTail("1234", 0)).isEqualTo("***");
    }
}
