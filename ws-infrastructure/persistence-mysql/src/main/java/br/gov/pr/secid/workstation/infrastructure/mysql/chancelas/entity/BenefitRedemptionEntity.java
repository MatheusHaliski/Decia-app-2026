package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.RedemptionStatus;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code benefit_redemptions} (BenefitRedemption — 9 Chancelas & Vínculos; RF39, RF42, RF19). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "benefit_redemptions")
public class BenefitRedemptionEntity extends AuditableEntity {

    @Column(name = "benefit_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID benefitId;

    @Column(name = "seal_bond_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sealBondId;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "code", nullable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RedemptionStatus status;

    @Column(name = "redeemed_at")
    private Instant redeemedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "certificate_media_id", columnDefinition = "BINARY(16)")
    private UUID certificateMediaId;

    @Column(name = "ledger_entry_id", columnDefinition = "BINARY(16)")
    private UUID ledgerEntryId;

    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    public UUID getBenefitId() {
        return benefitId;
    }

    public void setBenefitId(UUID benefitId) {
        this.benefitId = benefitId;
    }

    public UUID getSealBondId() {
        return sealBondId;
    }

    public void setSealBondId(UUID sealBondId) {
        this.sealBondId = sealBondId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public RedemptionStatus getStatus() {
        return status;
    }

    public void setStatus(RedemptionStatus status) {
        this.status = status;
    }

    public Instant getRedeemedAt() {
        return redeemedAt;
    }

    public void setRedeemedAt(Instant redeemedAt) {
        this.redeemedAt = redeemedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public UUID getCertificateMediaId() {
        return certificateMediaId;
    }

    public void setCertificateMediaId(UUID certificateMediaId) {
        this.certificateMediaId = certificateMediaId;
    }

    public UUID getLedgerEntryId() {
        return ledgerEntryId;
    }

    public void setLedgerEntryId(UUID ledgerEntryId) {
        this.ledgerEntryId = ledgerEntryId;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }
}
