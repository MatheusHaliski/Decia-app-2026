package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.gamificacao.RankingDimension;
import br.gov.pr.secid.workstation.domain.gamificacao.RankingScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code ranking_entries} (RankingEntry — 8 Gamificação; RF43, RF19, RF28, RF3). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "ranking_entries")
public class RankingEntryEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private RankingScope scope;

    @Column(name = "scope_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID scopeId;

    @Column(name = "period_key", nullable = false)
    private String periodKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "dimension", nullable = false)
    private RankingDimension dimension;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "value", nullable = false)
    private BigDecimal value;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "explanation_json", columnDefinition = "JSON")
    private String explanationJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public RankingScope getScope() {
        return scope;
    }

    public void setScope(RankingScope scope) {
        this.scope = scope;
    }

    public UUID getScopeId() {
        return scopeId;
    }

    public void setScopeId(UUID scopeId) {
        this.scopeId = scopeId;
    }

    public String getPeriodKey() {
        return periodKey;
    }

    public void setPeriodKey(String periodKey) {
        this.periodKey = periodKey;
    }

    public RankingDimension getDimension() {
        return dimension;
    }

    public void setDimension(RankingDimension dimension) {
        this.dimension = dimension;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getExplanationJson() {
        return explanationJson;
    }

    public void setExplanationJson(String explanationJson) {
        this.explanationJson = explanationJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
