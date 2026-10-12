package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.ProcessQuality;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_retrospectives} (DecisionRetrospective — 5b DECIA decisão estruturada; RF29, RF33).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_retrospectives")
public class DecisionRetrospectiveEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "outcome_id", columnDefinition = "BINARY(16)")
    private UUID outcomeId;

    @Column(name = "what_happened", nullable = false, columnDefinition = "TEXT")
    private String whatHappened;

    @Column(name = "what_expected", nullable = false, columnDefinition = "TEXT")
    private String whatExpected;

    @Column(name = "what_was_right", nullable = false, columnDefinition = "TEXT")
    private String whatWasRight;

    @Column(name = "what_was_wrong", nullable = false, columnDefinition = "TEXT")
    private String whatWasWrong;

    @Column(name = "failed_assumption_ids_json", columnDefinition = "JSON")
    private String failedAssumptionIdsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "process_quality", nullable = false)
    private ProcessQuality processQuality;

    @Column(name = "lessons_md", nullable = false, columnDefinition = "TEXT")
    private String lessonsMd;

    @Column(name = "share_as_lesson", nullable = false)
    private boolean shareAsLesson;

    @Column(name = "reviewed_by_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID reviewedByUserId;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public UUID getOutcomeId() {
        return outcomeId;
    }

    public void setOutcomeId(UUID outcomeId) {
        this.outcomeId = outcomeId;
    }

    public String getWhatHappened() {
        return whatHappened;
    }

    public void setWhatHappened(String whatHappened) {
        this.whatHappened = whatHappened;
    }

    public String getWhatExpected() {
        return whatExpected;
    }

    public void setWhatExpected(String whatExpected) {
        this.whatExpected = whatExpected;
    }

    public String getWhatWasRight() {
        return whatWasRight;
    }

    public void setWhatWasRight(String whatWasRight) {
        this.whatWasRight = whatWasRight;
    }

    public String getWhatWasWrong() {
        return whatWasWrong;
    }

    public void setWhatWasWrong(String whatWasWrong) {
        this.whatWasWrong = whatWasWrong;
    }

    public String getFailedAssumptionIdsJson() {
        return failedAssumptionIdsJson;
    }

    public void setFailedAssumptionIdsJson(String failedAssumptionIdsJson) {
        this.failedAssumptionIdsJson = failedAssumptionIdsJson;
    }

    public ProcessQuality getProcessQuality() {
        return processQuality;
    }

    public void setProcessQuality(ProcessQuality processQuality) {
        this.processQuality = processQuality;
    }

    public String getLessonsMd() {
        return lessonsMd;
    }

    public void setLessonsMd(String lessonsMd) {
        this.lessonsMd = lessonsMd;
    }

    public boolean isShareAsLesson() {
        return shareAsLesson;
    }

    public void setShareAsLesson(boolean shareAsLesson) {
        this.shareAsLesson = shareAsLesson;
    }

    public UUID getReviewedByUserId() {
        return reviewedByUserId;
    }

    public void setReviewedByUserId(UUID reviewedByUserId) {
        this.reviewedByUserId = reviewedByUserId;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
