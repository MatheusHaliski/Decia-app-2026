package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code kit_items} (KitItem — 3 Criador de Projetos; RF21, RF40). Gerada pelo SchemaGenerator a partir do
 * domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "kit_items")
public class KitItemEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "kit_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID kitId;

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase")
    private ProjectPhase phase;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "optional", nullable = false)
    private boolean optional;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getKitId() {
        return kitId;
    }

    public void setKitId(UUID kitId) {
        this.kitId = kitId;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public ProjectPhase getPhase() {
        return phase;
    }

    public void setPhase(ProjectPhase phase) {
        this.phase = phase;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isOptional() {
        return optional;
    }

    public void setOptional(boolean optional) {
        this.optional = optional;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
