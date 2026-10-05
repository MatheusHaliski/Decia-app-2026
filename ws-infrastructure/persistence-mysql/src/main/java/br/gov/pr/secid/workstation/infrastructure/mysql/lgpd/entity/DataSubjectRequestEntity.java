package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.lgpd.DsrKind;
import br.gov.pr.secid.workstation.domain.lgpd.DsrStatus;
import br.gov.pr.secid.workstation.domain.lgpd.DsrTarget;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code data_subject_requests} (DataSubjectRequest — 1 Identidade & Acesso; RF3, RF18, RF43, RF44, RF45). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "data_subject_requests")
public class DataSubjectRequestEntity extends AuditableEntity {

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private DsrKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "target")
    private DsrTarget target;

    @Column(name = "target_id", columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DsrStatus status;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "assignee_id", columnDefinition = "BINARY(16)")
    private UUID assigneeId;

    @Column(name = "response_md", columnDefinition = "TEXT")
    private String responseMd;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "correlation_id")
    private String correlationId;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public DsrKind getKind() {
        return kind;
    }

    public void setKind(DsrKind kind) {
        this.kind = kind;
    }

    public DsrTarget getTarget() {
        return target;
    }

    public void setTarget(DsrTarget target) {
        this.target = target;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public DsrStatus getStatus() {
        return status;
    }

    public void setStatus(DsrStatus status) {
        this.status = status;
    }

    public Instant getOpenedAt() {
        return openedAt;
    }

    public void setOpenedAt(Instant openedAt) {
        this.openedAt = openedAt;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public UUID getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(UUID assigneeId) {
        this.assigneeId = assigneeId;
    }

    public String getResponseMd() {
        return responseMd;
    }

    public void setResponseMd(String responseMd) {
        this.responseMd = responseMd;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }
}
