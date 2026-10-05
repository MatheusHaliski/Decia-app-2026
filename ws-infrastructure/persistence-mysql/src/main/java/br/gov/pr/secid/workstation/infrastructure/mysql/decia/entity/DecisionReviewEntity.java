package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.decia.ReviewOutcome;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_reviews} (DecisionReview — 5 DECIA sessão; RF15, RF29, RF42). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_reviews")
public class DecisionReviewEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "reviewer_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID reviewerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false)
    private ReviewOutcome outcome;

    @Column(name = "reason")
    private String reason;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    @Column(name = "notified_group_at")
    private Instant notifiedGroupAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public UUID getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(UUID reviewerId) {
        this.reviewerId = reviewerId;
    }

    public ReviewOutcome getOutcome() {
        return outcome;
    }

    public void setOutcome(ReviewOutcome outcome) {
        this.outcome = outcome;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public Instant getNotifiedGroupAt() {
        return notifiedGroupAt;
    }

    public void setNotifiedGroupAt(Instant notifiedGroupAt) {
        this.notifiedGroupAt = notifiedGroupAt;
    }
}
