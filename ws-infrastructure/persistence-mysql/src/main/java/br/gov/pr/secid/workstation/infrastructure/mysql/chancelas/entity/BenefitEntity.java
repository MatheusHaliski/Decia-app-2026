package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.BenefitStatus;
import br.gov.pr.secid.workstation.domain.chancelas.BenefitType;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code benefits} (Benefit — 9 Chancelas & Vínculos; RF39, RF35, RF19, RF42). Gerada pelo SchemaGenerator
 * a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "benefits")
public class BenefitEntity extends AuditableEntity {

    @Column(name = "seal_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sealId;

    @Column(name = "issuer_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID issuerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private BenefitType type;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "rules", columnDefinition = "TEXT")
    private String rules;

    @Column(name = "value_json", columnDefinition = "JSON")
    private String valueJson;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "total_quota")
    private Integer totalQuota;

    @Column(name = "per_user_limit", nullable = false)
    private int perUserLimit;

    @Column(name = "redeemed_count", nullable = false)
    private int redeemedCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private BenefitStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

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

    public BenefitType getType() {
        return type;
    }

    public void setType(BenefitType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getRules() {
        return rules;
    }

    public void setRules(String rules) {
        this.rules = rules;
    }

    public String getValueJson() {
        return valueJson;
    }

    public void setValueJson(String valueJson) {
        this.valueJson = valueJson;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Integer getTotalQuota() {
        return totalQuota;
    }

    public void setTotalQuota(Integer totalQuota) {
        this.totalQuota = totalQuota;
    }

    public int getPerUserLimit() {
        return perUserLimit;
    }

    public void setPerUserLimit(int perUserLimit) {
        this.perUserLimit = perUserLimit;
    }

    public int getRedeemedCount() {
        return redeemedCount;
    }

    public void setRedeemedCount(int redeemedCount) {
        this.redeemedCount = redeemedCount;
    }

    public BenefitStatus getStatus() {
        return status;
    }

    public void setStatus(BenefitStatus status) {
        this.status = status;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public long getVersion() {
        return version;
    }
}
