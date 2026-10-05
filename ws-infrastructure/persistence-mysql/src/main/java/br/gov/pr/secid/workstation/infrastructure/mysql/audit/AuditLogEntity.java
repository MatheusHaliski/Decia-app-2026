package br.gov.pr.secid.workstation.infrastructure.mysql.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/** Linha de {@code audit_log} (V2) — APPEND-ONLY: a aplicação só insere. */
@Entity
@Table(name = "audit_log")
public class AuditLogEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "actor_id", columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Column(name = "action", nullable = false, length = 80)
    private String action;

    @Column(name = "resource_type", length = 80)
    private String resourceType;

    @Column(name = "resource_id", length = 64)
    private String resourceId;

    @Column(name = "result", nullable = false, length = 20)
    private String result;

    @Column(name = "ip", length = 45)
    private String ip;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json")
    private String metadataJson;

    @Column(name = "at", nullable = false, updatable = false)
    private Instant at;

    protected AuditLogEntity() {
    }

    AuditLogEntity(UUID actorId, String action, String resourceType, String resourceId, String result, String ip,
                   String userAgent, String correlationId, String metadataJson) {
        this.id = UUID.randomUUID();
        this.actorId = actorId;
        this.action = action;
        this.resourceType = resourceType;
        this.resourceId = resourceId == null ? null : resourceId.length() > 64 ? resourceId.substring(0, 64) : resourceId;
        this.result = result;
        this.ip = ip == null ? null : ip.length() > 45 ? ip.substring(0, 45) : ip;
        this.userAgent = userAgent;
        this.correlationId = correlationId == null ? null : correlationId.length() > 64 ? correlationId.substring(0, 64) : correlationId;
        this.metadataJson = metadataJson;
        this.at = Instant.now();
    }
}
