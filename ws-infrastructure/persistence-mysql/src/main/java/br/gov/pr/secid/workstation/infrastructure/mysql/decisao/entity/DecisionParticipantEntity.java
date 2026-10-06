package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_participants} (DecisionParticipant — 5b DECIA decisão estruturada; RF29, RF5). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_participants")
public class DecisionParticipantEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private DecisionRole role;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "assessments_submitted_at")
    private Instant assessmentsSubmittedAt;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public DecisionRole getRole() {
        return role;
    }

    public void setRole(DecisionRole role) {
        this.role = role;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }

    public Instant getAssessmentsSubmittedAt() {
        return assessmentsSubmittedAt;
    }

    public void setAssessmentsSubmittedAt(Instant assessmentsSubmittedAt) {
        this.assessmentsSubmittedAt = assessmentsSubmittedAt;
    }
}
