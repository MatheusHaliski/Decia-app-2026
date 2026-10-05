package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity;

import br.gov.pr.secid.workstation.domain.rastro.TraceRelation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_trace_edges} (DecisionTraceEdge — 6 Rastro de Decisão; RF29, RF22, RF41). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_trace_edges")
public class DecisionTraceEdgeEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "from_node_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID fromNodeId;

    @Column(name = "to_node_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID toNodeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation", nullable = false)
    private TraceRelation relation;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFromNodeId() {
        return fromNodeId;
    }

    public void setFromNodeId(UUID fromNodeId) {
        this.fromNodeId = fromNodeId;
    }

    public UUID getToNodeId() {
        return toNodeId;
    }

    public void setToNodeId(UUID toNodeId) {
        this.toNodeId = toNodeId;
    }

    public TraceRelation getRelation() {
        return relation;
    }

    public void setRelation(TraceRelation relation) {
        this.relation = relation;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
