package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.OrgEntityKind;
import br.gov.pr.secid.workstation.domain.acervo.OrgEntitySource;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * Entidade JPA de {@code org_entities} (OrgEntity — 2 Acervo de Tarefas; RF20, RF41). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "org_entities")
public class OrgEntityEntity extends AuditableEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "cnpj_enc")
    private String cnpjEnc;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private OrgEntityKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private OrgEntitySource source;

    @Column(name = "external_ref")
    private String externalRef;

    @Column(name = "website_url")
    private String websiteUrl;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "verified", nullable = false)
    private boolean verified;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCnpjEnc() {
        return cnpjEnc;
    }

    public void setCnpjEnc(String cnpjEnc) {
        this.cnpjEnc = cnpjEnc;
    }

    public OrgEntityKind getKind() {
        return kind;
    }

    public void setKind(OrgEntityKind kind) {
        this.kind = kind;
    }

    public OrgEntitySource getSource() {
        return source;
    }

    public void setSource(OrgEntitySource source) {
        this.source = source;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public String getWebsiteUrl() {
        return websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
}
