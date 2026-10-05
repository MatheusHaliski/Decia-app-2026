package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import br.gov.pr.secid.workstation.application.audit.AuditEntry;
import br.gov.pr.secid.workstation.domain.audit.AuditLog;
import br.gov.pr.secid.workstation.domain.audit.AuditLogRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class JpaAuditAdapterTest {
    private final AuditLogRepository repository = mock(AuditLogRepository.class);
    private final JpaAuditAdapter adapter = new JpaAuditAdapter(repository, new ObjectMapper());

    @AfterEach
    void limpaMdc() {
        MDC.clear();
    }

    @Test
    void gravaLinhaComCorrelationIdDoMdcEMetadadosEmJson() {
        MDC.put(JpaAuditAdapter.MDC_CORRELATION, "corr-123456");
        UUID actor = UUID.randomUUID();
        String ua = "x".repeat(600);
        adapter.record(new AuditEntry(actor, "LOGIN_FALHA", AuditEntry.FALHA, "203.0.113.9", ua, Map.of("reason", "senha")));
        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(saved.capture());
        AuditLog row = saved.getValue();
        assertThat(row.getActorId()).isEqualTo(actor);
        assertThat(row.getAction()).isEqualTo("LOGIN_FALHA");
        assertThat(row.getResult()).isEqualTo("FALHA");
        assertThat(row.getIp()).isEqualTo("203.0.113.9");
        assertThat(row.getUserAgent()).hasSize(512);
        assertThat(row.getCorrelationId()).isEqualTo("corr-123456");
        assertThat(row.getMetadataJson()).isEqualTo("{\"reason\":\"senha\"}");
    }

    @Test
    void semMdcESemMetadadosAsColunasFicamNulas() {
        adapter.record(new AuditEntry(null, "LOGIN_OK", AuditEntry.OK, null, null, null));
        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getActorId()).isNull();
        assertThat(saved.getValue().getCorrelationId()).isNull();
        assertThat(saved.getValue().getMetadataJson()).isNull();
        assertThat(saved.getValue().getIp()).isNull();
    }

    @Test
    void entradaInvalidaFalhaAntesDeGravar() {
        assertThatThrownBy(() -> new AuditEntry(null, "", AuditEntry.OK, null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuditEntry(null, "X", "TALVEZ", null, null, null)).isInstanceOf(IllegalArgumentException.class);
    }
}
