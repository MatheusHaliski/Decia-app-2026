package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code departments} (Department — 1 Identidade & Acesso; RF28, RF14, RF19, RF24, RF25, RF35, RF39). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "departments")
public class DepartmentEntity extends AuditableEntity {

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "acronym")
    private String acronym;

    @Column(name = "slug", nullable = false)
    private String slug;

    @Column(name = "color")
    private String color;

    @Column(name = "monogram")
    private String monogram;

    @Column(name = "head_user_id", columnDefinition = "BINARY(16)")
    private UUID headUserId;

    @Column(name = "about", columnDefinition = "TEXT")
    private String about;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAcronym() {
        return acronym;
    }

    public void setAcronym(String acronym) {
        this.acronym = acronym;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getMonogram() {
        return monogram;
    }

    public void setMonogram(String monogram) {
        this.monogram = monogram;
    }

    public UUID getHeadUserId() {
        return headUserId;
    }

    public void setHeadUserId(UUID headUserId) {
        this.headUserId = headUserId;
    }

    public String getAbout() {
        return about;
    }

    public void setAbout(String about) {
        this.about = about;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public long getVersion() {
        return version;
    }
}
