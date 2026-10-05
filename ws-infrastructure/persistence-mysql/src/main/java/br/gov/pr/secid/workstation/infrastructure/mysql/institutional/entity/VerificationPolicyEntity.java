package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.institutional.PolicyStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * Entidade JPA de {@code verification_policies} (VerificationPolicy — 1 Identidade & Acesso; RF28, RF1). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "verification_policies")
public class VerificationPolicyEntity extends AuditableEntity {

    @Column(name = "version", nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(name = "profile_type", nullable = false)
    private ProfileType profileType;

    @Column(name = "criteria_json", nullable = false, columnDefinition = "JSON")
    private String criteriaJson;

    @Column(name = "reasons_json", nullable = false, columnDefinition = "JSON")
    private String reasonsJson;

    @Column(name = "max_submissions", nullable = false)
    private int maxSubmissions;

    @Column(name = "sla_business_days", nullable = false)
    private int slaBusinessDays;

    @Column(name = "resubmit_sla_business_days", nullable = false)
    private int resubmitSlaBusinessDays;

    @Column(name = "adjustments_reply_days", nullable = false)
    private int adjustmentsReplyDays;

    @Column(name = "free_mail_domains_json", columnDefinition = "JSON")
    private String freeMailDomainsJson;

    @Column(name = "valid_from")
    private Instant validFrom;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PolicyStatus status;

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public ProfileType getProfileType() {
        return profileType;
    }

    public void setProfileType(ProfileType profileType) {
        this.profileType = profileType;
    }

    public String getCriteriaJson() {
        return criteriaJson;
    }

    public void setCriteriaJson(String criteriaJson) {
        this.criteriaJson = criteriaJson;
    }

    public String getReasonsJson() {
        return reasonsJson;
    }

    public void setReasonsJson(String reasonsJson) {
        this.reasonsJson = reasonsJson;
    }

    public int getMaxSubmissions() {
        return maxSubmissions;
    }

    public void setMaxSubmissions(int maxSubmissions) {
        this.maxSubmissions = maxSubmissions;
    }

    public int getSlaBusinessDays() {
        return slaBusinessDays;
    }

    public void setSlaBusinessDays(int slaBusinessDays) {
        this.slaBusinessDays = slaBusinessDays;
    }

    public int getResubmitSlaBusinessDays() {
        return resubmitSlaBusinessDays;
    }

    public void setResubmitSlaBusinessDays(int resubmitSlaBusinessDays) {
        this.resubmitSlaBusinessDays = resubmitSlaBusinessDays;
    }

    public int getAdjustmentsReplyDays() {
        return adjustmentsReplyDays;
    }

    public void setAdjustmentsReplyDays(int adjustmentsReplyDays) {
        this.adjustmentsReplyDays = adjustmentsReplyDays;
    }

    public String getFreeMailDomainsJson() {
        return freeMailDomainsJson;
    }

    public void setFreeMailDomainsJson(String freeMailDomainsJson) {
        this.freeMailDomainsJson = freeMailDomainsJson;
    }

    public Instant getValidFrom() {
        return validFrom;
    }

    public void setValidFrom(Instant validFrom) {
        this.validFrom = validFrom;
    }

    public PolicyStatus getStatus() {
        return status;
    }

    public void setStatus(PolicyStatus status) {
        this.status = status;
    }
}
