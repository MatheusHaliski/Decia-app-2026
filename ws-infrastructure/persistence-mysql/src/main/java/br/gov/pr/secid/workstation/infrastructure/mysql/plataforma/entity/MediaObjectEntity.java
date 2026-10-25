package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity;

import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code media_objects} (MediaObject — 12 Plataforma; V2). Sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento
 * nativo do Hibernate para MySQL; enum como String; JSON como String. Entrou com a primeira rota de upload (foto de perfil, RF3.CA05).
 */
@Entity
@Table(name = "media_objects")
public class MediaObjectEntity {
    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;
    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;
    @Column(name = "bucket", nullable = false)
    private String bucket;
    @Column(name = "object_key", nullable = false)
    private String objectKey;
    @Column(name = "mime_type", nullable = false)
    private String mimeType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(name = "sha256", nullable = false, columnDefinition = "CHAR(64)")
    private String sha256;
    @Enumerated(EnumType.STRING)
    @Column(name = "access_class", nullable = false)
    private MediaAccessClass accessClass;
    @Column(name = "variants_json", columnDefinition = "JSON")
    private String variantsJson;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public String getBucket() {
        return bucket;
    }

    public void setBucket(String bucket) {
        this.bucket = bucket;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getSha256() {
        return sha256;
    }

    public void setSha256(String sha256) {
        this.sha256 = sha256;
    }

    public MediaAccessClass getAccessClass() {
        return accessClass;
    }

    public void setAccessClass(MediaAccessClass accessClass) {
        this.accessClass = accessClass;
    }

    public String getVariantsJson() {
        return variantsJson;
    }

    public void setVariantsJson(String variantsJson) {
        this.variantsJson = variantsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
