package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code task_state_log} (TaskStateLog — 2 Acervo de Tarefas; RF41, RF12, RF44, RF46). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "task_state_log")
public class TaskStateLogEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_state")
    private TaskState fromState;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_state", nullable = false)
    private TaskState toState;

    @Column(name = "actor_id", columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Column(name = "reason")
    private String reason;

    @Column(name = "project_id", columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "correlation_id")
    private String correlationId;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public TaskState getFromState() {
        return fromState;
    }

    public void setFromState(TaskState fromState) {
        this.fromState = fromState;
    }

    public TaskState getToState() {
        return toState;
    }

    public void setToState(TaskState toState) {
        this.toState = toState;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
