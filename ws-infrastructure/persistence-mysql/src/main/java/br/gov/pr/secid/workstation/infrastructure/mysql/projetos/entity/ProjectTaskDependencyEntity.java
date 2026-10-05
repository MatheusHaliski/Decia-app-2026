package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.projetos.DependencyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code project_task_dependencies} (ProjectTaskDependency — 3 Criador de Projetos; RF21, RF43). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "project_task_dependencies")
public class ProjectTaskDependencyEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "project_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "predecessor_project_task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID predecessorProjectTaskId;

    @Column(name = "successor_project_task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID successorProjectTaskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private DependencyType type;

    @Column(name = "lag_days", nullable = false)
    private int lagDays;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getPredecessorProjectTaskId() {
        return predecessorProjectTaskId;
    }

    public void setPredecessorProjectTaskId(UUID predecessorProjectTaskId) {
        this.predecessorProjectTaskId = predecessorProjectTaskId;
    }

    public UUID getSuccessorProjectTaskId() {
        return successorProjectTaskId;
    }

    public void setSuccessorProjectTaskId(UUID successorProjectTaskId) {
        this.successorProjectTaskId = successorProjectTaskId;
    }

    public DependencyType getType() {
        return type;
    }

    public void setType(DependencyType type) {
        this.type = type;
    }

    public int getLagDays() {
        return lagDays;
    }

    public void setLagDays(int lagDays) {
        this.lagDays = lagDays;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
