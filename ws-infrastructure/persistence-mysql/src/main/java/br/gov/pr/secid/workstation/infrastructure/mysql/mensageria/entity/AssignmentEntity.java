package br.gov.pr.secid.workstation.infrastructure.mysql.mensageria.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentOrigin;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentStatus;
import br.gov.pr.secid.workstation.domain.mensageria.AssignmentTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code assignments} (Assignment — 12b Mensageria & Atribuição; RF46, RF10, RF18, RF19, RF44). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "assignments")
public class AssignmentEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private AssignmentTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "from_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID toUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private AssignmentOrigin origin;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssignmentStatus status;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "message")
    private String message;

    @Column(name = "reason")
    private String reason;

    @Column(name = "previous_responsible_id", columnDefinition = "BINARY(16)")
    private UUID previousResponsibleId;

    @Column(name = "trace_node_id", columnDefinition = "BINARY(16)")
    private UUID traceNodeId;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public AssignmentTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(AssignmentTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public UUID getFromUserId() {
        return fromUserId;
    }

    public void setFromUserId(UUID fromUserId) {
        this.fromUserId = fromUserId;
    }

    public UUID getToUserId() {
        return toUserId;
    }

    public void setToUserId(UUID toUserId) {
        this.toUserId = toUserId;
    }

    public AssignmentOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(AssignmentOrigin origin) {
        this.origin = origin;
    }

    public AssignmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssignmentStatus status) {
        this.status = status;
    }

    public Instant getDueAt() {
        return dueAt;
    }

    public void setDueAt(Instant dueAt) {
        this.dueAt = dueAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public UUID getPreviousResponsibleId() {
        return previousResponsibleId;
    }

    public void setPreviousResponsibleId(UUID previousResponsibleId) {
        this.previousResponsibleId = previousResponsibleId;
    }

    public UUID getTraceNodeId() {
        return traceNodeId;
    }

    public void setTraceNodeId(UUID traceNodeId) {
        this.traceNodeId = traceNodeId;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }

    public long getVersion() {
        return version;
    }
}
