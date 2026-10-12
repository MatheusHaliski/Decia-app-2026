package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.institutional.CompanyStatus;
import br.gov.pr.secid.workstation.infrastructure.mysql.crypto.AesGcmStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code companies} (Company — 1 Identidade & Acesso; RF28, RF19, RF24, RF25, RF35, RF39, RF42, RF45).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "companies")
public class CompanyEntity extends AuditableEntity {

    @Column(name = "owner_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerUserId;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Convert(converter = AesGcmStringConverter.class)
    @Column(name = "cnpj_enc")
    private String cnpjEnc;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "coat_of_arms_url")
    private String coatOfArmsUrl;

    @Column(name = "about", columnDefinition = "TEXT")
    private String about;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "accent_color")
    private String accentColor;

    @Column(name = "points_policy_json", columnDefinition = "JSON")
    private String pointsPolicyJson;

    @Column(name = "hype_policy_json", columnDefinition = "JSON")
    private String hypePolicyJson;

    @Column(name = "messaging_policy_json", columnDefinition = "JSON")
    private String messagingPolicyJson;

    @Column(name = "ranking_weights_id", columnDefinition = "BINARY(16)")
    private UUID rankingWeightsId;

    @Column(name = "recording_retention_policy")
    private String recordingRetentionPolicy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CompanyStatus status;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        this.legalName = legalName;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getCnpjEnc() {
        return cnpjEnc;
    }

    public void setCnpjEnc(String cnpjEnc) {
        this.cnpjEnc = cnpjEnc;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getCoatOfArmsUrl() {
        return coatOfArmsUrl;
    }

    public void setCoatOfArmsUrl(String coatOfArmsUrl) {
        this.coatOfArmsUrl = coatOfArmsUrl;
    }

    public String getAbout() {
        return about;
    }

    public void setAbout(String about) {
        this.about = about;
    }

    public String getWebsiteUrl() {
        return websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
    }

    public String getAccentColor() {
        return accentColor;
    }

    public void setAccentColor(String accentColor) {
        this.accentColor = accentColor;
    }

    public String getPointsPolicyJson() {
        return pointsPolicyJson;
    }

    public void setPointsPolicyJson(String pointsPolicyJson) {
        this.pointsPolicyJson = pointsPolicyJson;
    }

    public String getHypePolicyJson() {
        return hypePolicyJson;
    }

    public void setHypePolicyJson(String hypePolicyJson) {
        this.hypePolicyJson = hypePolicyJson;
    }

    public String getMessagingPolicyJson() {
        return messagingPolicyJson;
    }

    public void setMessagingPolicyJson(String messagingPolicyJson) {
        this.messagingPolicyJson = messagingPolicyJson;
    }

    public UUID getRankingWeightsId() {
        return rankingWeightsId;
    }

    public void setRankingWeightsId(UUID rankingWeightsId) {
        this.rankingWeightsId = rankingWeightsId;
    }

    public String getRecordingRetentionPolicy() {
        return recordingRetentionPolicy;
    }

    public void setRecordingRetentionPolicy(String recordingRetentionPolicy) {
        this.recordingRetentionPolicy = recordingRetentionPolicy;
    }

    public CompanyStatus getStatus() {
        return status;
    }

    public void setStatus(CompanyStatus status) {
        this.status = status;
    }

    public long getVersion() {
        return version;
    }
}
