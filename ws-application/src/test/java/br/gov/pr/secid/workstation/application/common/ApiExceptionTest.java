package br.gov.pr.secid.workstation.application.common;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApiExceptionTest {

    @Test
    void guardaCodigoStatusEDetalhesImutaveis() {
        Map<String, Object> details = new HashMap<>();
        details.put("campo", "valor");
        ApiException ex = new ApiException("PERIODO_INVALIDO", 422, "Período inválido", details);
        details.put("outro", 1);                 // alteração posterior não vaza para a exceção
        assertThat(ex.code()).isEqualTo("PERIODO_INVALIDO");
        assertThat(ex.status()).isEqualTo(422);
        assertThat(ex.getMessage()).isEqualTo("Período inválido");
        assertThat(ex.details()).containsOnlyKeys("campo");
        assertThatThrownBy(() -> ex.details().put("x", 1)).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void detalhesNulosViramMapaVazio() {
        assertThat(new ApiException("X", 400, "m", null).details()).isEmpty();
        assertThat(new ApiException("X", 400, "m").details()).isEmpty();
    }

    @Test
    void recusaCodigoVazioEStatusQueNaoEErro() {
        assertThatThrownBy(() -> new ApiException("", 400, "m")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ApiException(null, 400, "m")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ApiException("X", 200, "m")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ApiException("X", 600, "m")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fabricasUsamOsCodigosDosCAs() {
        assertThat(ApiException.badRequest("JSON_INVALIDO", "m").status()).isEqualTo(400);
        assertThat(ApiException.badRequest("JSON_INVALIDO", "m", Map.of("a", 1)).details()).containsEntry("a", 1);
        assertThat(ApiException.unauthorized("m").code()).isEqualTo(ApiException.NAO_AUTENTICADO);
        assertThat(ApiException.unauthorized("m").status()).isEqualTo(401);
        assertThat(ApiException.forbidden("m").code()).isEqualTo(ApiException.ACESSO_NEGADO);
        assertThat(ApiException.forbidden("m").status()).isEqualTo(403);
        assertThat(ApiException.notFound("Tarefa").status()).isEqualTo(404);
        assertThat(ApiException.notFound("Tarefa").getMessage()).contains("Tarefa");
        assertThat(ApiException.conflict("VINCULO_DUPLICADO", "m").status()).isEqualTo(409);
        assertThat(ApiException.unprocessable("TRANSICAO_INVALIDA", "m", Map.of()).status()).isEqualTo(422);
        assertThat(ApiException.tooMany("m", Map.of("retryAfter", 30)).status()).isEqualTo(429);
        assertThat(ApiException.tooMany("m", Map.of()).code()).isEqualTo(ApiException.LIMITE_ESGOTADO);
        assertThat(ApiException.unavailable("BUSCA_INDISPONIVEL", "m").status()).isEqualTo(503);
    }
}
