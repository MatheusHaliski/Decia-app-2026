package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.SealBondBasis;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondOrigin;
import br.gov.pr.secid.workstation.domain.chancelas.SealBondStatus;
import br.gov.pr.secid.workstation.domain.chancelas.SealTargetType;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code seal_bonds} (SealBond — 9 Chancelas & Vínculos; RF39, RF20, RF21, RF40, RF42, RF45). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "seal_bonds")
public class SealBondEntity extends AuditableEntity {

    @Column(name = "seal_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sealId;

    @Column(name = "issuer_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID issuerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private SealTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "target_owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetOwnerId;

    @Column(name = "requested_by", columnDefinition = "BINARY(16)")
    private UUID requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "basis", nullable = false)
    private SealBondBasis basis;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private SealBondOrigin origin;

    @Column(name = "confidence")
    private BigDecimal confidence;

    @Column(name = "justification")
    private String justification;

    @Column(name = "criteria_report_json", columnDefinition = "JSON")
    private String criteriaReportJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SealBondStatus status;

    @Column(name = "requires_review", nullable = false)
    private boolean requiresReview;

    @Column(name = "author_consent")
    private Boolean authorConsent;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by", columnDefinition = "BINARY(16)")
    private UUID reviewedBy;

    @Column(name = "review_note")
    private String reviewNote;

    @Column(name = "seal_code")
    private String sealCode;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoke_reason")
    private String revokeReason;

    @Column(name = "last_recertified_at")
    private Instant lastRecertifiedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getSealId() {
        return sealId;
    }

    public void setSealId(UUID sealId) {
        this.sealId = sealId;
    }

    public UUID getIssuerUserId() {
        return issuerUserId;
    }

    public void setIssuerUserId(UUID issuerUserId) {
        this.issuerUserId = issuerUserId;
    }

    public SealTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(SealTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public UUID getTargetOwnerId() {
        return targetOwnerId;
    }

    public void setTargetOwnerId(UUID targetOwnerId) {
        this.targetOwnerId = targetOwnerId;
    }

    public UUID getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UUID requestedBy) {
        this.requestedBy = requestedBy;
    }

    public SealBondBasis getBasis() {
        return basis;
    }

    public void setBasis(SealBondBasis basis) {
        this.basis = basis;
    }

    public SealBondOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(SealBondOrigin origin) {
        this.origin = origin;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public String getJustification() {
        return justification;
    }

    public void setJustification(String justification) {
        this.justification = justification;
    }

    public String getCriteriaReportJson() {
        return criteriaReportJson;
    }

    public void setCriteriaReportJson(String criteriaReportJson) {
        this.criteriaReportJson = criteriaReportJson;
    }

    public SealBondStatus getStatus() {
        return status;
    }

    public void setStatus(SealBondStatus status) {
        this.status = status;
    }

    public boolean isRequiresReview() {
        return requiresReview;
    }

    public void setRequiresReview(boolean requiresReview) {
        this.requiresReview = requiresReview;
    }

    public Boolean getAuthorConsent() {
        return authorConsent;
    }

    public void setAuthorConsent(Boolean authorConsent) {
        this.authorConsent = authorConsent;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public Instant getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(Instant respondedAt) {
        this.respondedAt = respondedAt;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(UUID reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public String getReviewNote() {
        return reviewNote;
    }

    public void setReviewNote(String reviewNote) {
        this.reviewNote = reviewNote;
    }

    public String getSealCode() {
        return sealCode;
    }

    public void setSealCode(String sealCode) {
        this.sealCode = sealCode;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public String getRevokeReason() {
        return revokeReason;
    }

    public void setRevokeReason(String revokeReason) {
        this.revokeReason = revokeReason;
    }

    public Instant getLastRecertifiedAt() {
        return lastRecertifiedAt;
    }

    public void setLastRecertifiedAt(Instant lastRecertifiedAt) {
        this.lastRecertifiedAt = lastRecertifiedAt;
    }

    public long getVersion() {
        return version;
    }
}
