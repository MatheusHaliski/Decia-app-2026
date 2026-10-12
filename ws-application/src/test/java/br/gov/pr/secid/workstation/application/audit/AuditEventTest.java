package br.gov.pr.secid.workstation.application.audit;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Nenhum caminho consegue gravar segredo na trilha: chaves que parecem segredo são apagadas na construção. */
class AuditEventTest {

    // valores com letras fora de [0-9a-f]: nunca aparecem por acaso no UUID aleatório do actorId (antes "abc" colidia ~0,7% das vezes)
    private static final String SEGREDO = "segredo-vazado";
    private static final String CODIGO = "otp-kz-7781";

    @Test
    void chavesQueParecemSegredoSaoMascaradasEOCorrelationIdVemDoMdc() {
        MDC.put(AuditEvent.MDC_CORRELATION, "corr-teste-1234");
        try {
            Map<String, Object> raw = new HashMap<>();
            raw.put("password", SEGREDO);
            raw.put("senhaAtual", SEGREDO);
            raw.put("refreshToken", SEGREDO);
            raw.put("accessToken", SEGREDO);
            raw.put("code", CODIGO);
            raw.put("codigo", CODIGO);
            raw.put("passwordHash", SEGREDO);
            raw.put("client_secret", SEGREDO);
            raw.put("Authorization", "Bearer x");
            raw.put("reason", "senha");
            raw.put("email", "m***@e***.br");
            AuditEvent e = AuditEvent.of(UUID.randomUUID(), AuditActions.LOGIN_FALHA, "auth", null, AuditEvent.FALHA, "1.2.3.4",
                    "x".repeat(600), raw);
            assertThat(e.correlationId()).isEqualTo("corr-teste-1234");
            assertThat(e.userAgent()).hasSize(512);
            assertThat(e.metadata()).containsEntry("reason", "senha").containsEntry("email", "m***@e***.br");
            e.metadata().forEach((k, v) -> {
                if (!k.equals("reason") && !k.equals("email")) {
                    assertThat(v).as(k).isEqualTo("***");
                }
            });
            assertThat(e.toString()).doesNotContain(SEGREDO).doesNotContain(CODIGO).doesNotContain("Bearer");
            assertThatThrownBy(() -> e.metadata().put("x", 1)).isInstanceOf(UnsupportedOperationException.class);
        } finally {
            MDC.remove(AuditEvent.MDC_CORRELATION);
        }
    }

    @Test
    void acaoEResultadoSaoObrigatoriosEMetadadosNulosViramVazio() {
        AuditEvent e = new AuditEvent(null, "X", null, null, AuditEvent.OK, null, null, null, null);
        assertThat(e.metadata()).isEmpty();
        assertThat(e.correlationId()).isNull();
        assertThatThrownBy(() -> new AuditEvent(null, " ", null, null, AuditEvent.OK, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuditEvent(null, "X", null, null, null, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
