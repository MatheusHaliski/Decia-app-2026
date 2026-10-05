package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code plan_axis_projects} (PlanAxisProject — 4 Planejamento institucional; RF24, RF21). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "plan_axis_projects")
public class PlanAxisProjectEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "plan_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID planId;

    @Column(name = "axis_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID axisId;

    @Column(name = "project_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "linked_by", nullable = false, columnDefinition = "BINARY(16)")
    private UUID linkedBy;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getPlanId() {
        return planId;
    }

    public void setPlanId(UUID planId) {
        this.planId = planId;
    }

    public UUID getAxisId() {
        return axisId;
    }

    public void setAxisId(UUID axisId) {
        this.axisId = axisId;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getLinkedBy() {
        return linkedBy;
    }

    public void setLinkedBy(UUID linkedBy) {
        this.linkedBy = linkedBy;
    }

    public Instant getLinkedAt() {
        return linkedAt;
    }

    public void setLinkedAt(Instant linkedAt) {
        this.linkedAt = linkedAt;
    }
}
