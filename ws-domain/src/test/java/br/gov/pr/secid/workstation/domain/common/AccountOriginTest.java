package br.gov.pr.secid.workstation.domain.common;

import br.gov.pr.secid.workstation.domain.identity.AccountOrigin;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountOriginTest {

    @Test
    void soContaRealContaParaMetricas() {
        assertThat(AccountOrigin.REAL.countsForMetrics()).isTrue();
        assertThat(AccountOrigin.TEST_SEED.countsForMetrics()).isFalse();
        assertThat(AccountOrigin.DEMO.countsForMetrics()).isFalse();
        assertThat(AccountOrigin.SYSTEM.countsForMetrics()).isFalse();
    }

    @Test
    void osQuatroValoresDoBloco2Existem() {
        assertThat(AccountOrigin.values()).extracting(Enum::name)
                .containsExactly("REAL", "TEST_SEED", "DEMO", "SYSTEM");
    }
}
