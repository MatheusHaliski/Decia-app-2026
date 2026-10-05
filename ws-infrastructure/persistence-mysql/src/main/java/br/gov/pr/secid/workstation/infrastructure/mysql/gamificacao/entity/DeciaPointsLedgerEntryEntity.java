package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.gamificacao.LedgerStatus;
import br.gov.pr.secid.workstation.domain.gamificacao.PointsEvent;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decia_points_ledger} (DeciaPointsLedgerEntry — 8 Gamificação; RF42, RF19, RF35, RF39, RF40, RF43,
 * RF45). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo
 * do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decia_points_ledger")
public class DeciaPointsLedgerEntryEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "delta", nullable = false)
    private long delta;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_code", nullable = false)
    private PointsEvent eventCode;

    @Column(name = "ref_type")
    private String refType;

    @Column(name = "ref_id", columnDefinition = "BINARY(16)")
    private UUID refId;

    @Column(name = "session_id", columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "rule_version_id", columnDefinition = "BINARY(16)")
    private UUID ruleVersionId;

    @Column(name = "quality_multiplier", nullable = false)
    private BigDecimal qualityMultiplier;

    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LedgerStatus status;

    @Column(name = "suspended_reason")
    private String suspendedReason;

    @Column(name = "reviewed_by", columnDefinition = "BINARY(16)")
    private UUID reviewedBy;

    @Column(name = "counterparty_user_id", columnDefinition = "BINARY(16)")
    private UUID counterpartyUserId;

    @Column(name = "correlation_id")
    private String correlationId;

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

    public long getDelta() {
        return delta;
    }

    public void setDelta(long delta) {
        this.delta = delta;
    }

    public PointsEvent getEventCode() {
        return eventCode;
    }

    public void setEventCode(PointsEvent eventCode) {
        this.eventCode = eventCode;
    }

    public String getRefType() {
        return refType;
    }

    public void setRefType(String refType) {
        this.refType = refType;
    }

    public UUID getRefId() {
        return refId;
    }

    public void setRefId(UUID refId) {
        this.refId = refId;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getRuleVersionId() {
        return ruleVersionId;
    }

    public void setRuleVersionId(UUID ruleVersionId) {
        this.ruleVersionId = ruleVersionId;
    }

    public BigDecimal getQualityMultiplier() {
        return qualityMultiplier;
    }

    public void setQualityMultiplier(BigDecimal qualityMultiplier) {
        this.qualityMultiplier = qualityMultiplier;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public LedgerStatus getStatus() {
        return status;
    }

    public void setStatus(LedgerStatus status) {
        this.status = status;
    }

    public String getSuspendedReason() {
        return suspendedReason;
    }

    public void setSuspendedReason(String suspendedReason) {
        this.suspendedReason = suspendedReason;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(UUID reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public UUID getCounterpartyUserId() {
        return counterpartyUserId;
    }

    public void setCounterpartyUserId(UUID counterpartyUserId) {
        this.counterpartyUserId = counterpartyUserId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
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
