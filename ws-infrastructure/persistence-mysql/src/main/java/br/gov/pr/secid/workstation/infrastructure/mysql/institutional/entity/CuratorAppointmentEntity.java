package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity;

import br.gov.pr.secid.workstation.domain.institutional.CuratorScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code curator_appointments} (CuratorAppointment — 1 Identidade & Acesso; RF28, RF39). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "curator_appointments")
public class CuratorAppointmentEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "department_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "curator_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID curatorUserId;

    @Column(name = "appointed_by", nullable = false, columnDefinition = "BINARY(16)")
    private UUID appointedBy;

    @Column(name = "appointed_at", nullable = false)
    private Instant appointedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoke_reason")
    private String revokeReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private CuratorScope scope;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public UUID getCuratorUserId() {
        return curatorUserId;
    }

    public void setCuratorUserId(UUID curatorUserId) {
        this.curatorUserId = curatorUserId;
    }

    public UUID getAppointedBy() {
        return appointedBy;
    }

    public void setAppointedBy(UUID appointedBy) {
        this.appointedBy = appointedBy;
    }

    public Instant getAppointedAt() {
        return appointedAt;
    }

    public void setAppointedAt(Instant appointedAt) {
        this.appointedAt = appointedAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public String getRevokeReason() {
        return revokeReason;
    }

    public void setRevokeReason(String revokeReason) {
        this.revokeReason = revokeReason;
    }

    public CuratorScope getScope() {
        return scope;
    }

    public void setScope(CuratorScope scope) {
        this.scope = scope;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
