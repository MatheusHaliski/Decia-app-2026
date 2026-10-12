package br.gov.pr.secid.workstation.domain.common;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MiniJsonTest {

    @Test
    void leObjetosArraysStringsNumerosBooleanosENulos() {
        Object v = MiniJson.parse(" {\"code\": \"CNPJ_OK\", \"mandatory\": true, \"n\": -1.5e2, \"x\": null, "
                + "\"list\": [1, \"a\\n\\u00e9\", false], \"o\": {}} ");
        assertThat(v).isInstanceOf(Map.class);
        Map<?, ?> m = (Map<?, ?>) v;
        assertThat(m.get("code")).isEqualTo("CNPJ_OK");
        assertThat(m.get("mandatory")).isEqualTo(Boolean.TRUE);
        assertThat(m.get("n")).isEqualTo(new BigDecimal("-1.5e2"));
        assertThat(m.containsKey("x")).isTrue();
        assertThat(m.get("x")).isNull();
        @SuppressWarnings("unchecked")
        List<Object> list = (List<Object>) m.get("list");
        assertThat(list).containsExactly(BigDecimal.ONE, "a\né", Boolean.FALSE);
        assertThat((Map<?, ?>) m.get("o")).isEmpty();
        assertThat(MiniJson.parseArray("[]")).isEmpty();
        assertThat(MiniJson.parseArray("[\"A\",\"B\"]")).containsExactly("A", "B");
    }

    @Test
    void recusaJsonMalformado() {
        for (String bad : List.of("", "{", "[1,]", "{\"a\" 1}", "\"aberta", "tru", "[1] x", "{\"a\":\"\\q\"}", "\"ctl\u0001\"")) {
            assertThatThrownBy(() -> MiniJson.parse(bad)).as(bad).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("JSON_INVALIDO");
        }
        assertThatThrownBy(() -> MiniJson.parse(null)).hasMessageContaining("JSON_INVALIDO");
        assertThatThrownBy(() -> MiniJson.parseArray("{}")).hasMessageContaining("esperado array");
    }
}
