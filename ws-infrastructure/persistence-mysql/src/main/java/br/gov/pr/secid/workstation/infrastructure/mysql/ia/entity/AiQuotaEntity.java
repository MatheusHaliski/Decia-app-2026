package br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.ia.QuotaScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code ai_quotas} (AiQuota — 10 IA do sistema; RF43, RF42, RF18). Gerada pelo SchemaGenerator a partir
 * do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "ai_quotas")
public class AiQuotaEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private QuotaScope scope;

    @Column(name = "scope_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID scopeId;

    @Column(name = "month_key", nullable = false)
    private String monthKey;

    @Column(name = "monthly_limit", nullable = false)
    private int monthlyLimit;

    @Column(name = "consumed", nullable = false)
    private int consumed;

    @Column(name = "purchased_credits", nullable = false)
    private int purchasedCredits;

    @Column(name = "reset_at", nullable = false)
    private Instant resetAt;

    public QuotaScope getScope() {
        return scope;
    }

    public void setScope(QuotaScope scope) {
        this.scope = scope;
    }

    public UUID getScopeId() {
        return scopeId;
    }

    public void setScopeId(UUID scopeId) {
        this.scopeId = scopeId;
    }

    public String getMonthKey() {
        return monthKey;
    }

    public void setMonthKey(String monthKey) {
        this.monthKey = monthKey;
    }

    public int getMonthlyLimit() {
        return monthlyLimit;
    }

    public void setMonthlyLimit(int monthlyLimit) {
        this.monthlyLimit = monthlyLimit;
    }

    public int getConsumed() {
        return consumed;
    }

    public void setConsumed(int consumed) {
        this.consumed = consumed;
    }

    public int getPurchasedCredits() {
        return purchasedCredits;
    }

    public void setPurchasedCredits(int purchasedCredits) {
        this.purchasedCredits = purchasedCredits;
    }

    public Instant getResetAt() {
        return resetAt;
    }

    public void setResetAt(Instant resetAt) {
        this.resetAt = resetAt;
    }
}
