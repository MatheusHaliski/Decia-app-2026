package br.gov.pr.secid.workstation.infrastructure.mysql.lgpd.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.UiLanguage;
import br.gov.pr.secid.workstation.domain.institutional.PolicyStatus;
import br.gov.pr.secid.workstation.domain.lgpd.PolicyDocumentKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code policy_documents} (PolicyDocument — 1 Identidade & Acesso; RF1, RF2, RF3, RF18). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "policy_documents")
public class PolicyDocumentEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "document", nullable = false)
    private PolicyDocumentKind document;

    @Column(name = "version", nullable = false)
    private String version;

    @Enumerated(EnumType.STRING)
    @Column(name = "language", nullable = false)
    private UiLanguage language;

    @Column(name = "effective_from")
    private Instant effectiveFrom;

    @Column(name = "changelog", columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "body_md", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String bodyMd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PolicyStatus status;

    @Column(name = "published_by", columnDefinition = "BINARY(16)")
    private UUID publishedBy;

    @Column(name = "published_at")
    private Instant publishedAt;

    public PolicyDocumentKind getDocument() {
        return document;
    }

    public void setDocument(PolicyDocumentKind document) {
        this.document = document;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public UiLanguage getLanguage() {
        return language;
    }

    public void setLanguage(UiLanguage language) {
        this.language = language;
    }

    public Instant getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(Instant effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public String getChangelog() {
        return changelog;
    }

    public void setChangelog(String changelog) {
        this.changelog = changelog;
    }

    public String getBodyMd() {
        return bodyMd;
    }

    public void setBodyMd(String bodyMd) {
        this.bodyMd = bodyMd;
    }

    public PolicyStatus getStatus() {
        return status;
    }

    public void setStatus(PolicyStatus status) {
        this.status = status;
    }

    public UUID getPublishedBy() {
        return publishedBy;
    }

    public void setPublishedBy(UUID publishedBy) {
        this.publishedBy = publishedBy;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }
}
