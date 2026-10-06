package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code criterion_assessments} (CriterionAssessment — 5b DECIA decisão estruturada; RF29, RF31). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "criterion_assessments")
public class CriterionAssessmentEntity extends AuditableEntity {

    @Column(name = "alternative_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Column(name = "criterion_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID criterionId;

    @Column(name = "assessor_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID assessorUserId;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "rationale")
    private String rationale;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private ContentOrigin origin;

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public void setAlternativeId(UUID alternativeId) {
        this.alternativeId = alternativeId;
    }

    public UUID getCriterionId() {
        return criterionId;
    }

    public void setCriterionId(UUID criterionId) {
        this.criterionId = criterionId;
    }

    public UUID getAssessorUserId() {
        return assessorUserId;
    }

    public void setAssessorUserId(UUID assessorUserId) {
        this.assessorUserId = assessorUserId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public ContentOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(ContentOrigin origin) {
        this.origin = origin;
    }
}
