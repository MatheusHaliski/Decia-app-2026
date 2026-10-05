package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity;

import br.gov.pr.secid.workstation.domain.decia.MessageClass;
import br.gov.pr.secid.workstation.domain.rastro.TraceNodeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_trace_nodes} (DecisionTraceNode — 6 Rastro de Decisão; RF29, RF22, RF38, RF41, RF45). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_trace_nodes")
public class DecisionTraceNodeEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false)
    private TraceNodeType nodeType;

    @Column(name = "ref_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID refId;

    @Column(name = "label", nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(name = "class_label")
    private MessageClass classLabel;

    @Column(name = "actor_id", columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Column(name = "at", nullable = false)
    private Instant at;

    @Column(name = "snapshot_json", columnDefinition = "JSON")
    private String snapshotJson;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public TraceNodeType getNodeType() {
        return nodeType;
    }

    public void setNodeType(TraceNodeType nodeType) {
        this.nodeType = nodeType;
    }

    public UUID getRefId() {
        return refId;
    }

    public void setRefId(UUID refId) {
        this.refId = refId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public MessageClass getClassLabel() {
        return classLabel;
    }

    public void setClassLabel(MessageClass classLabel) {
        this.classLabel = classLabel;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }

    public String getSnapshotJson() {
        return snapshotJson;
    }

    public void setSnapshotJson(String snapshotJson) {
        this.snapshotJson = snapshotJson;
    }
}
