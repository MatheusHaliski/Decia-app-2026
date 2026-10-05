package br.gov.pr.secid.workstation.infrastructure.mysql.institutional.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code user_empresa_ext} (EmpresaProfileExtension — 1 Identidade & Acesso; RF1, RF28). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "user_empresa_ext")
public class EmpresaProfileExtensionEntity {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "company_cnpj_enc")
    private String companyCnpjEnc;

    @Column(name = "official_site", nullable = false)
    private String officialSite;

    @Column(name = "representation_doc_id", columnDefinition = "BINARY(16)")
    private UUID representationDocId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        this.legalName = legalName;
    }

    public String getCompanyCnpjEnc() {
        return companyCnpjEnc;
    }

    public void setCompanyCnpjEnc(String companyCnpjEnc) {
        this.companyCnpjEnc = companyCnpjEnc;
    }

    public String getOfficialSite() {
        return officialSite;
    }

    public void setOfficialSite(String officialSite) {
        this.officialSite = officialSite;
    }

    public UUID getRepresentationDocId() {
        return representationDocId;
    }

    public void setRepresentationDocId(UUID representationDocId) {
        this.representationDocId = representationDocId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
