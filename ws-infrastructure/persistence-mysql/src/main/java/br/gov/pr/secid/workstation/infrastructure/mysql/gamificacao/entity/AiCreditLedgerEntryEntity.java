package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.gamificacao.AiCreditSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code ai_credit_ledger} (AiCreditLedgerEntry — 8 Gamificação; RF42, RF39, RF43). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "ai_credit_ledger")
public class AiCreditLedgerEntryEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "delta", nullable = false)
    private long delta;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private AiCreditSource source;

    @Column(name = "ref_id", columnDefinition = "BINARY(16)")
    private UUID refId;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public long getDelta() {
        return delta;
    }

    public void setDelta(long delta) {
        this.delta = delta;
    }

    public AiCreditSource getSource() {
        return source;
    }

    public void setSource(AiCreditSource source) {
        this.source = source;
    }

    public UUID getRefId() {
        return refId;
    }

    public void setRefId(UUID refId) {
        this.refId = refId;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
