package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity;

import br.gov.pr.secid.workstation.domain.planejamento.GroupingTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code grouping_items} (GroupingItem — 4 Planejamento institucional; RF25). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "grouping_items")
public class GroupingItemEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "grouping_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID groupingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private GroupingTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getGroupingId() {
        return groupingId;
    }

    public void setGroupingId(UUID groupingId) {
        this.groupingId = groupingId;
    }

    public GroupingTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(GroupingTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public Instant getAddedAt() {
        return addedAt;
    }

    public void setAddedAt(Instant addedAt) {
        this.addedAt = addedAt;
    }
}
