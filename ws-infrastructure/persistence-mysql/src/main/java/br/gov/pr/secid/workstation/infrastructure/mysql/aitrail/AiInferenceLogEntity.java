package br.gov.pr.secid.workstation.infrastructure.mysql.aitrail;

import br.gov.pr.secid.workstation.domain.common.AiMode;
import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;
import br.gov.pr.secid.workstation.domain.ia.AiProvider;
import br.gov.pr.secid.workstation.domain.ia.InferenceResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Linha de {@code ai_inference_log} (V2) — APPEND-ONLY ({@code @Immutable}, colunas não atualizáveis). Mapeia só o que o
 * {@code AiGateway} grava: nunca há coluna para o prompt ou a resposta brutos (D-69). Revisão humana ({@code reviewed_by}) entra pelo RF
 * que a usar, por UPDATE explícito.
 */
@Entity
@Immutable
@Table(name = "ai_inference_log")
public class AiInferenceLogEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "BINARY(16)", updatable = false)
    private UUID userId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)", updatable = false)
    private UUID departmentId;

    @Column(name = "capability", nullable = false, length = 40, updatable = false)
    private String capability;

    @Column(name = "host_rf", length = 10, updatable = false)
    private String hostRf;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 20, updatable = false)
    private AiProvider provider;

    @Column(name = "model", length = 80, updatable = false)
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 20, updatable = false)
    private AiMode mode;

    @Column(name = "latency_ms", updatable = false)
    private Integer latencyMs;

    @Column(name = "input_tokens", updatable = false)
    private Integer inputTokens;

    @Column(name = "output_tokens", updatable = false)
    private Integer outputTokens;

    @Column(name = "estimated_cost_usd", precision = 10, scale = 6, updatable = false)
    private BigDecimal estimatedCostUsd;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 20, updatable = false)
    private InferenceResult result;

    @Column(name = "fallback_used", nullable = false, updatable = false)
    private boolean fallbackUsed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "masked_fields_json", updatable = false)
    private String maskedFieldsJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_summary_json", updatable = false)
    private String inputSummaryJson;

    @Column(name = "correlation_id", length = 64, updatable = false)
    private String correlationId;

    protected AiInferenceLogEntity() {
    }

    static AiInferenceLogEntity of(AiInferenceLog l) {
        AiInferenceLogEntity e = new AiInferenceLogEntity();
        e.id = l.id() == null ? UUID.randomUUID() : l.id();
        e.userId = l.userId();
        e.departmentId = l.departmentId();
        e.capability = l.capability() == null ? null : l.capability().name();
        e.hostRf = l.hostRf();
        e.provider = l.provider();
        e.model = l.model();
        e.mode = l.mode() == null ? AiMode.ECONOMIA : l.mode();
        e.latencyMs = l.latencyMs();
        e.inputTokens = l.inputTokens();
        e.outputTokens = l.outputTokens();
        e.estimatedCostUsd = l.estimatedCostUsd();
        e.result = l.result();
        e.fallbackUsed = l.fallbackUsed();
        e.maskedFieldsJson = l.maskedFieldsJson();
        e.inputSummaryJson = l.inputSummaryJson();
        e.correlationId = l.correlationId();
        return e;
    }

    UUID getId() {
        return id;
    }

    String getCapability() {
        return capability;
    }

    AiMode getMode() {
        return mode;
    }

    String getMaskedFieldsJson() {
        return maskedFieldsJson;
    }

    String getInputSummaryJson() {
        return inputSummaryJson;
    }
}
