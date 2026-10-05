package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Entidade JPA de {@code deliberative_profiles} (DeliberativeProfile — 8 Gamificação; RF43, RF19, RF45). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "deliberative_profiles")
public class DeliberativeProfileEntity extends AuditableEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "period_key", nullable = false)
    private String periodKey;

    @Column(name = "clarity", nullable = false)
    private BigDecimal clarity;

    @Column(name = "evidence_use", nullable = false)
    private BigDecimal evidenceUse;

    @Column(name = "consistency", nullable = false)
    private BigDecimal consistency;

    @Column(name = "completeness", nullable = false)
    private BigDecimal completeness;

    @Column(name = "reuse", nullable = false)
    private BigDecimal reuse;

    @Column(name = "delta_json", columnDefinition = "JSON")
    private String deltaJson;

    @Column(name = "badges_json", columnDefinition = "JSON")
    private String badgesJson;

    @Column(name = "public_indicators_json", columnDefinition = "JSON")
    private String publicIndicatorsJson;

    @Column(name = "ai_insights_json", columnDefinition = "JSON")
    private String aiInsightsJson;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getPeriodKey() {
        return periodKey;
    }

    public void setPeriodKey(String periodKey) {
        this.periodKey = periodKey;
    }

    public BigDecimal getClarity() {
        return clarity;
    }

    public void setClarity(BigDecimal clarity) {
        this.clarity = clarity;
    }

    public BigDecimal getEvidenceUse() {
        return evidenceUse;
    }

    public void setEvidenceUse(BigDecimal evidenceUse) {
        this.evidenceUse = evidenceUse;
    }

    public BigDecimal getConsistency() {
        return consistency;
    }

    public void setConsistency(BigDecimal consistency) {
        this.consistency = consistency;
    }

    public BigDecimal getCompleteness() {
        return completeness;
    }

    public void setCompleteness(BigDecimal completeness) {
        this.completeness = completeness;
    }

    public BigDecimal getReuse() {
        return reuse;
    }

    public void setReuse(BigDecimal reuse) {
        this.reuse = reuse;
    }

    public String getDeltaJson() {
        return deltaJson;
    }

    public void setDeltaJson(String deltaJson) {
        this.deltaJson = deltaJson;
    }

    public String getBadgesJson() {
        return badgesJson;
    }

    public void setBadgesJson(String badgesJson) {
        this.badgesJson = badgesJson;
    }

    public String getPublicIndicatorsJson() {
        return publicIndicatorsJson;
    }

    public void setPublicIndicatorsJson(String publicIndicatorsJson) {
        this.publicIndicatorsJson = publicIndicatorsJson;
    }

    public String getAiInsightsJson() {
        return aiInsightsJson;
    }

    public void setAiInsightsJson(String aiInsightsJson) {
        this.aiInsightsJson = aiInsightsJson;
    }
}
