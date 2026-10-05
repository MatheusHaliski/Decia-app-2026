package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.projetos.Moscow;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code project_tasks} (ProjectTask — 3 Criador de Projetos; RF21, RF22, RF23, RF29, RF43, RF44). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "project_tasks")
public class ProjectTaskEntity extends AuditableEntity {

    @Column(name = "project_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "task_id", columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false)
    private ProjectPhase phase;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "responsible_id", columnDefinition = "BINARY(16)")
    private UUID responsibleId;

    @Column(name = "due_at")
    private LocalDate dueAt;

    @Column(name = "start_at")
    private LocalDate startAt;

    @Column(name = "estimated_hours")
    private BigDecimal estimatedHours;

    @Column(name = "pert_optimistic")
    private BigDecimal pertOptimistic;

    @Column(name = "pert_most_likely")
    private BigDecimal pertMostLikely;

    @Column(name = "pert_pessimistic")
    private BigDecimal pertPessimistic;

    @Column(name = "actual_hours")
    private BigDecimal actualHours;

    @Column(name = "percent_complete", nullable = false)
    private int percentComplete;

    @Column(name = "planned_value")
    private BigDecimal plannedValue;

    @Column(name = "earned_value")
    private BigDecimal earnedValue;

    @Column(name = "actual_cost")
    private BigDecimal actualCost;

    @Column(name = "is_critical", nullable = false)
    private boolean isCritical;

    @Column(name = "slack_days")
    private Integer slackDays;

    @Enumerated(EnumType.STRING)
    @Column(name = "moscow")
    private Moscow moscow;

    @Column(name = "snapshot_json", columnDefinition = "JSON")
    private String snapshotJson;

    @Column(name = "removed_by_author", nullable = false)
    private boolean removedByAuthor;

    @Column(name = "canvas_x")
    private BigDecimal canvasX;

    @Column(name = "canvas_y")
    private BigDecimal canvasY;

    @Column(name = "canvas_scale")
    private BigDecimal canvasScale;

    @Column(name = "canvas_rotation")
    private BigDecimal canvasRotation;

    @Column(name = "canvas_layer")
    private Integer canvasLayer;

    @Column(name = "sticky_color")
    private String stickyColor;

    @Column(name = "decision_trace_node_id", columnDefinition = "BINARY(16)")
    private UUID decisionTraceNodeId;

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public ProjectPhase getPhase() {
        return phase;
    }

    public void setPhase(ProjectPhase phase) {
        this.phase = phase;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public UUID getResponsibleId() {
        return responsibleId;
    }

    public void setResponsibleId(UUID responsibleId) {
        this.responsibleId = responsibleId;
    }

    public LocalDate getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDate dueAt) {
        this.dueAt = dueAt;
    }

    public LocalDate getStartAt() {
        return startAt;
    }

    public void setStartAt(LocalDate startAt) {
        this.startAt = startAt;
    }

    public BigDecimal getEstimatedHours() {
        return estimatedHours;
    }

    public void setEstimatedHours(BigDecimal estimatedHours) {
        this.estimatedHours = estimatedHours;
    }

    public BigDecimal getPertOptimistic() {
        return pertOptimistic;
    }

    public void setPertOptimistic(BigDecimal pertOptimistic) {
        this.pertOptimistic = pertOptimistic;
    }

    public BigDecimal getPertMostLikely() {
        return pertMostLikely;
    }

    public void setPertMostLikely(BigDecimal pertMostLikely) {
        this.pertMostLikely = pertMostLikely;
    }

    public BigDecimal getPertPessimistic() {
        return pertPessimistic;
    }

    public void setPertPessimistic(BigDecimal pertPessimistic) {
        this.pertPessimistic = pertPessimistic;
    }

    public BigDecimal getActualHours() {
        return actualHours;
    }

    public void setActualHours(BigDecimal actualHours) {
        this.actualHours = actualHours;
    }

    public int getPercentComplete() {
        return percentComplete;
    }

    public void setPercentComplete(int percentComplete) {
        this.percentComplete = percentComplete;
    }

    public BigDecimal getPlannedValue() {
        return plannedValue;
    }

    public void setPlannedValue(BigDecimal plannedValue) {
        this.plannedValue = plannedValue;
    }

    public BigDecimal getEarnedValue() {
        return earnedValue;
    }

    public void setEarnedValue(BigDecimal earnedValue) {
        this.earnedValue = earnedValue;
    }

    public BigDecimal getActualCost() {
        return actualCost;
    }

    public void setActualCost(BigDecimal actualCost) {
        this.actualCost = actualCost;
    }

    public boolean isIsCritical() {
        return isCritical;
    }

    public void setIsCritical(boolean isCritical) {
        this.isCritical = isCritical;
    }

    public Integer getSlackDays() {
        return slackDays;
    }

    public void setSlackDays(Integer slackDays) {
        this.slackDays = slackDays;
    }

    public Moscow getMoscow() {
        return moscow;
    }

    public void setMoscow(Moscow moscow) {
        this.moscow = moscow;
    }

    public String getSnapshotJson() {
        return snapshotJson;
    }

    public void setSnapshotJson(String snapshotJson) {
        this.snapshotJson = snapshotJson;
    }

    public boolean isRemovedByAuthor() {
        return removedByAuthor;
    }

    public void setRemovedByAuthor(boolean removedByAuthor) {
        this.removedByAuthor = removedByAuthor;
    }

    public BigDecimal getCanvasX() {
        return canvasX;
    }

    public void setCanvasX(BigDecimal canvasX) {
        this.canvasX = canvasX;
    }

    public BigDecimal getCanvasY() {
        return canvasY;
    }

    public void setCanvasY(BigDecimal canvasY) {
        this.canvasY = canvasY;
    }

    public BigDecimal getCanvasScale() {
        return canvasScale;
    }

    public void setCanvasScale(BigDecimal canvasScale) {
        this.canvasScale = canvasScale;
    }

    public BigDecimal getCanvasRotation() {
        return canvasRotation;
    }

    public void setCanvasRotation(BigDecimal canvasRotation) {
        this.canvasRotation = canvasRotation;
    }

    public Integer getCanvasLayer() {
        return canvasLayer;
    }

    public void setCanvasLayer(Integer canvasLayer) {
        this.canvasLayer = canvasLayer;
    }

    public String getStickyColor() {
        return stickyColor;
    }

    public void setStickyColor(String stickyColor) {
        this.stickyColor = stickyColor;
    }

    public UUID getDecisionTraceNodeId() {
        return decisionTraceNodeId;
    }

    public void setDecisionTraceNodeId(UUID decisionTraceNodeId) {
        this.decisionTraceNodeId = decisionTraceNodeId;
    }
}
