package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.RiskLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code plan_axes} (PlanAxis — 4 Planejamento institucional; RF24, RF21, RF31, RF32). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "plan_axes")
public class PlanAxisEntity extends AuditableEntity {

    @Column(name = "plan_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID planId;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "goal")
    private String goal;

    @Column(name = "indicator")
    private String indicator;

    @Column(name = "target_value")
    private String targetValue;

    @Column(name = "color")
    private String color;

    @Column(name = "icon")
    private String icon;

    @Column(name = "projects_count", nullable = false)
    private int projectsCount;

    @Column(name = "completed_pct", nullable = false)
    private BigDecimal completedPct;

    @Column(name = "nearest_due_at")
    private LocalDate nearestDueAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregated_risk")
    private RiskLevel aggregatedRisk;

    public UUID getPlanId() {
        return planId;
    }

    public void setPlanId(UUID planId) {
        this.planId = planId;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getIndicator() {
        return indicator;
    }

    public void setIndicator(String indicator) {
        this.indicator = indicator;
    }

    public String getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(String targetValue) {
        this.targetValue = targetValue;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getProjectsCount() {
        return projectsCount;
    }

    public void setProjectsCount(int projectsCount) {
        this.projectsCount = projectsCount;
    }

    public BigDecimal getCompletedPct() {
        return completedPct;
    }

    public void setCompletedPct(BigDecimal completedPct) {
        this.completedPct = completedPct;
    }

    public LocalDate getNearestDueAt() {
        return nearestDueAt;
    }

    public void setNearestDueAt(LocalDate nearestDueAt) {
        this.nearestDueAt = nearestDueAt;
    }

    public RiskLevel getAggregatedRisk() {
        return aggregatedRisk;
    }

    public void setAggregatedRisk(RiskLevel aggregatedRisk) {
        this.aggregatedRisk = aggregatedRisk;
    }
}
