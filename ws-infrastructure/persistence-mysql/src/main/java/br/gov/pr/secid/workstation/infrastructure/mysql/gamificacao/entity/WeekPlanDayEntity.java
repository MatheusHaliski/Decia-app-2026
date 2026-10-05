package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code week_plan_days} (WeekPlanDay — 8 Gamificação; RF44). Gerada pelo SchemaGenerator a partir do
 * domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "week_plan_days")
public class WeekPlanDayEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "week_plan_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID weekPlanId;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(name = "task_id", columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "meetings_json", columnDefinition = "JSON")
    private String meetingsJson;

    @Column(name = "load_pct")
    private BigDecimal loadPct;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getWeekPlanId() {
        return weekPlanId;
    }

    public void setWeekPlanId(UUID weekPlanId) {
        this.weekPlanId = weekPlanId;
    }

    public LocalDate getPlanDate() {
        return planDate;
    }

    public void setPlanDate(LocalDate planDate) {
        this.planDate = planDate;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getMeetingsJson() {
        return meetingsJson;
    }

    public void setMeetingsJson(String meetingsJson) {
        this.meetingsJson = meetingsJson;
    }

    public BigDecimal getLoadPct() {
        return loadPct;
    }

    public void setLoadPct(BigDecimal loadPct) {
        this.loadPct = loadPct;
    }
}
