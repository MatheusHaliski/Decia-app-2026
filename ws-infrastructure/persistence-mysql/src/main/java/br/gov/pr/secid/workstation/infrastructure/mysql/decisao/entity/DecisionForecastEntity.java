package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.ForecastResolution;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_forecasts} (DecisionForecast — 5b DECIA decisão estruturada; RF29). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_forecasts")
public class DecisionForecastEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "alternative_id", columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Column(name = "statement", nullable = false)
    private String statement;

    @Column(name = "probability_pct", nullable = false)
    private int probabilityPct;

    @Column(name = "resolve_by", nullable = false)
    private LocalDate resolveBy;

    @Column(name = "forecaster_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID forecasterUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution", nullable = false)
    private ForecastResolution resolution;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by_user_id", columnDefinition = "BINARY(16)")
    private UUID resolvedByUserId;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public void setAlternativeId(UUID alternativeId) {
        this.alternativeId = alternativeId;
    }

    public String getStatement() {
        return statement;
    }

    public void setStatement(String statement) {
        this.statement = statement;
    }

    public int getProbabilityPct() {
        return probabilityPct;
    }

    public void setProbabilityPct(int probabilityPct) {
        this.probabilityPct = probabilityPct;
    }

    public LocalDate getResolveBy() {
        return resolveBy;
    }

    public void setResolveBy(LocalDate resolveBy) {
        this.resolveBy = resolveBy;
    }

    public UUID getForecasterUserId() {
        return forecasterUserId;
    }

    public void setForecasterUserId(UUID forecasterUserId) {
        this.forecasterUserId = forecasterUserId;
    }

    public ForecastResolution getResolution() {
        return resolution;
    }

    public void setResolution(ForecastResolution resolution) {
        this.resolution = resolution;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public UUID getResolvedByUserId() {
        return resolvedByUserId;
    }

    public void setResolvedByUserId(UUID resolvedByUserId) {
        this.resolvedByUserId = resolvedByUserId;
    }
}
