package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code week_plans} (WeekPlan — 8 Gamificação; RF44, RF19). Gerada pelo SchemaGenerator a partir do
 * domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "week_plans")
public class WeekPlanEntity extends AuditableEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "streak", nullable = false)
    private int streak;

    @Column(name = "closing_hse")
    private BigDecimal closingHse;

    @Column(name = "recommendation")
    private String recommendation;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public void setWeekStart(LocalDate weekStart) {
        this.weekStart = weekStart;
    }

    public int getStreak() {
        return streak;
    }

    public void setStreak(int streak) {
        this.streak = streak;
    }

    public BigDecimal getClosingHse() {
        return closingHse;
    }

    public void setClosingHse(BigDecimal closingHse) {
        this.closingHse = closingHse;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public long getVersion() {
        return version;
    }
}
