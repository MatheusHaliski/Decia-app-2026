package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.gamificacao.GoalStatus;
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
 * Entidade JPA de {@code collective_goals} (CollectiveGoal — 8 Gamificação; RF35, RF21, RF27, RF39, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "collective_goals")
public class CollectiveGoalEntity extends AuditableEntity {

    @Column(name = "creator_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID creatorId;

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "criterion_json", nullable = false, columnDefinition = "JSON")
    private String criterionJson;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @Column(name = "reward_points_per_participant", nullable = false)
    private int rewardPointsPerParticipant;

    @Column(name = "recognition_template_json", columnDefinition = "JSON")
    private String recognitionTemplateJson;

    @Column(name = "min_effort_check", nullable = false)
    private boolean minEffortCheck;

    @Column(name = "progress", nullable = false)
    private BigDecimal progress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private GoalStatus status;

    @Column(name = "achieved_at")
    private Instant achievedAt;

    @Column(name = "ledger_batch_id", columnDefinition = "BINARY(16)")
    private UUID ledgerBatchId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getCreatorId() {
        return creatorId;
    }

    public void setCreatorId(UUID creatorId) {
        this.creatorId = creatorId;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCriterionJson() {
        return criterionJson;
    }

    public void setCriterionJson(String criterionJson) {
        this.criterionJson = criterionJson;
    }

    public LocalDate getPeriodFrom() {
        return periodFrom;
    }

    public void setPeriodFrom(LocalDate periodFrom) {
        this.periodFrom = periodFrom;
    }

    public LocalDate getPeriodTo() {
        return periodTo;
    }

    public void setPeriodTo(LocalDate periodTo) {
        this.periodTo = periodTo;
    }

    public int getRewardPointsPerParticipant() {
        return rewardPointsPerParticipant;
    }

    public void setRewardPointsPerParticipant(int rewardPointsPerParticipant) {
        this.rewardPointsPerParticipant = rewardPointsPerParticipant;
    }

    public String getRecognitionTemplateJson() {
        return recognitionTemplateJson;
    }

    public void setRecognitionTemplateJson(String recognitionTemplateJson) {
        this.recognitionTemplateJson = recognitionTemplateJson;
    }

    public boolean isMinEffortCheck() {
        return minEffortCheck;
    }

    public void setMinEffortCheck(boolean minEffortCheck) {
        this.minEffortCheck = minEffortCheck;
    }

    public BigDecimal getProgress() {
        return progress;
    }

    public void setProgress(BigDecimal progress) {
        this.progress = progress;
    }

    public GoalStatus getStatus() {
        return status;
    }

    public void setStatus(GoalStatus status) {
        this.status = status;
    }

    public Instant getAchievedAt() {
        return achievedAt;
    }

    public void setAchievedAt(Instant achievedAt) {
        this.achievedAt = achievedAt;
    }

    public UUID getLedgerBatchId() {
        return ledgerBatchId;
    }

    public void setLedgerBatchId(UUID ledgerBatchId) {
        this.ledgerBatchId = ledgerBatchId;
    }

    public long getVersion() {
        return version;
    }
}
