package br.gov.pr.secid.workstation.infrastructure.mysql.chancelas.entity;

import br.gov.pr.secid.workstation.domain.chancelas.IssuerKind;
import br.gov.pr.secid.workstation.domain.chancelas.SealStatus;
import br.gov.pr.secid.workstation.domain.chancelas.SealTier;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code seals} (Seal — 9 Chancelas & Vínculos; RF39, RF20, RF21, RF28, RF40, RF45). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "seals")
public class SealEntity extends AuditableEntity {

    @Column(name = "issuer_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID issuerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "issuer_kind", nullable = false)
    private IssuerKind issuerKind;

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier", nullable = false)
    private SealTier tier;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SealStatus status;

    @Column(name = "art_json", columnDefinition = "JSON")
    private String artJson;

    @Column(name = "icon_url")
    private String iconUrl;

    @Column(name = "excellence", nullable = false)
    private boolean excellence;

    @Column(name = "available_from")
    private Instant availableFrom;

    @Column(name = "available_until")
    private Instant availableUntil;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "usage_count", nullable = false)
    private int usageCount;

    @Column(name = "auto_issued", nullable = false)
    private boolean autoIssued;

    @Column(name = "policy_id", columnDefinition = "BINARY(16)")
    private UUID policyId;

    @Column(name = "recertification_required", nullable = false)
    private boolean recertificationRequired;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getIssuerUserId() {
        return issuerUserId;
    }

    public void setIssuerUserId(UUID issuerUserId) {
        this.issuerUserId = issuerUserId;
    }

    public IssuerKind getIssuerKind() {
        return issuerKind;
    }

    public void setIssuerKind(IssuerKind issuerKind) {
        this.issuerKind = issuerKind;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public SealTier getTier() {
        return tier;
    }

    public void setTier(SealTier tier) {
        this.tier = tier;
    }

    public SealStatus getStatus() {
        return status;
    }

    public void setStatus(SealStatus status) {
        this.status = status;
    }

    public String getArtJson() {
        return artJson;
    }

    public void setArtJson(String artJson) {
        this.artJson = artJson;
    }

    public String getIconUrl() {
        return iconUrl;
    }

    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }

    public boolean isExcellence() {
        return excellence;
    }

    public void setExcellence(boolean excellence) {
        this.excellence = excellence;
    }

    public Instant getAvailableFrom() {
        return availableFrom;
    }

    public void setAvailableFrom(Instant availableFrom) {
        this.availableFrom = availableFrom;
    }

    public Instant getAvailableUntil() {
        return availableUntil;
    }

    public void setAvailableUntil(Instant availableUntil) {
        this.availableUntil = availableUntil;
    }

    public Integer getUsageLimit() {
        return usageLimit;
    }

    public void setUsageLimit(Integer usageLimit) {
        this.usageLimit = usageLimit;
    }

    public int getUsageCount() {
        return usageCount;
    }

    public void setUsageCount(int usageCount) {
        this.usageCount = usageCount;
    }

    public boolean isAutoIssued() {
        return autoIssued;
    }

    public void setAutoIssued(boolean autoIssued) {
        this.autoIssued = autoIssued;
    }

    public UUID getPolicyId() {
        return policyId;
    }

    public void setPolicyId(UUID policyId) {
        this.policyId = policyId;
    }

    public boolean isRecertificationRequired() {
        return recertificationRequired;
    }

    public void setRecertificationRequired(boolean recertificationRequired) {
        this.recertificationRequired = recertificationRequired;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public long getVersion() {
        return version;
    }
}
