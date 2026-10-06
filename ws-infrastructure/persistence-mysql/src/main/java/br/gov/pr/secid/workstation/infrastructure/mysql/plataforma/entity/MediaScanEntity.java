package br.gov.pr.secid.workstation.infrastructure.mysql.plataforma.entity;

import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code media_scans} (MediaScan — 12 Plataforma; RF20, RF34, RF38, RF41). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "media_scans")
public class MediaScanEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "media_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID mediaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MediaScanStatus status;

    @Column(name = "detected_type", nullable = false)
    private String detectedType;

    @Column(name = "engine")
    private String engine;

    @Column(name = "threat_name")
    private String threatName;

    @Column(name = "scanned_at")
    private Instant scannedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getMediaId() {
        return mediaId;
    }

    public void setMediaId(UUID mediaId) {
        this.mediaId = mediaId;
    }

    public MediaScanStatus getStatus() {
        return status;
    }

    public void setStatus(MediaScanStatus status) {
        this.status = status;
    }

    public String getDetectedType() {
        return detectedType;
    }

    public void setDetectedType(String detectedType) {
        this.detectedType = detectedType;
    }

    public String getEngine() {
        return engine;
    }

    public void setEngine(String engine) {
        this.engine = engine;
    }

    public String getThreatName() {
        return threatName;
    }

    public void setThreatName(String threatName) {
        this.threatName = threatName;
    }

    public Instant getScannedAt() {
        return scannedAt;
    }

    public void setScannedAt(Instant scannedAt) {
        this.scannedAt = scannedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
