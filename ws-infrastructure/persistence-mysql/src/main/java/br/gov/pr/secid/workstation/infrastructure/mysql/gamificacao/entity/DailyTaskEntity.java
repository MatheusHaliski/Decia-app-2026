package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.gamificacao.DailyFeedback;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code daily_tasks} (DailyTask — 8 Gamificação; RF44, RF19, RF43, RF45, RF46). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "daily_tasks")
public class DailyTaskEntity extends AuditableEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "task_date", nullable = false)
    private LocalDate taskDate;

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "suggested_by_ai", nullable = false)
    private boolean suggestedByAi;

    @Column(name = "priority_index_json", columnDefinition = "JSON")
    private String priorityIndexJson;

    @Column(name = "hse_predicted_json", columnDefinition = "JSON")
    private String hsePredictedJson;

    @Column(name = "hse_realized_json", columnDefinition = "JSON")
    private String hseRealizedJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback")
    private DailyFeedback feedback;

    @Column(name = "feedback_at")
    private Instant feedbackAt;

    @Column(name = "actual_hours")
    private BigDecimal actualHours;

    @Column(name = "swap_reason")
    private String swapReason;

    @Column(name = "swapped_from_task_id", columnDefinition = "BINARY(16)")
    private UUID swappedFromTaskId;

    @Column(name = "delegated_to_user_id", columnDefinition = "BINARY(16)")
    private UUID delegatedToUserId;

    @Column(name = "blocked_by_ref")
    private String blockedByRef;

    @Column(name = "week_plan_day_id", columnDefinition = "BINARY(16)")
    private UUID weekPlanDayId;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getTaskDate() {
        return taskDate;
    }

    public void setTaskDate(LocalDate taskDate) {
        this.taskDate = taskDate;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public boolean isSuggestedByAi() {
        return suggestedByAi;
    }

    public void setSuggestedByAi(boolean suggestedByAi) {
        this.suggestedByAi = suggestedByAi;
    }

    public String getPriorityIndexJson() {
        return priorityIndexJson;
    }

    public void setPriorityIndexJson(String priorityIndexJson) {
        this.priorityIndexJson = priorityIndexJson;
    }

    public String getHsePredictedJson() {
        return hsePredictedJson;
    }

    public void setHsePredictedJson(String hsePredictedJson) {
        this.hsePredictedJson = hsePredictedJson;
    }

    public String getHseRealizedJson() {
        return hseRealizedJson;
    }

    public void setHseRealizedJson(String hseRealizedJson) {
        this.hseRealizedJson = hseRealizedJson;
    }

    public DailyFeedback getFeedback() {
        return feedback;
    }

    public void setFeedback(DailyFeedback feedback) {
        this.feedback = feedback;
    }

    public Instant getFeedbackAt() {
        return feedbackAt;
    }

    public void setFeedbackAt(Instant feedbackAt) {
        this.feedbackAt = feedbackAt;
    }

    public BigDecimal getActualHours() {
        return actualHours;
    }

    public void setActualHours(BigDecimal actualHours) {
        this.actualHours = actualHours;
    }

    public String getSwapReason() {
        return swapReason;
    }

    public void setSwapReason(String swapReason) {
        this.swapReason = swapReason;
    }

    public UUID getSwappedFromTaskId() {
        return swappedFromTaskId;
    }

    public void setSwappedFromTaskId(UUID swappedFromTaskId) {
        this.swappedFromTaskId = swappedFromTaskId;
    }

    public UUID getDelegatedToUserId() {
        return delegatedToUserId;
    }

    public void setDelegatedToUserId(UUID delegatedToUserId) {
        this.delegatedToUserId = delegatedToUserId;
    }

    public String getBlockedByRef() {
        return blockedByRef;
    }

    public void setBlockedByRef(String blockedByRef) {
        this.blockedByRef = blockedByRef;
    }

    public UUID getWeekPlanDayId() {
        return weekPlanDayId;
    }

    public void setWeekPlanDayId(UUID weekPlanDayId) {
        this.weekPlanDayId = weekPlanDayId;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public long getVersion() {
        return version;
    }
}
