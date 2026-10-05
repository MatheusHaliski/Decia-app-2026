package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity;

import br.gov.pr.secid.workstation.domain.balcao.ModelLicense;
import br.gov.pr.secid.workstation.domain.balcao.OfferStatus;
import br.gov.pr.secid.workstation.domain.balcao.OfferTargetType;
import br.gov.pr.secid.workstation.domain.balcao.OfferVisibility;
import br.gov.pr.secid.workstation.domain.balcao.Shelf;
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
 * Entidade JPA de {@code model_offers} (ModelOffer — 11 Balcão & Loja; RF40, RF19, RF21, RF42). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "model_offers")
public class ModelOfferEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private OfferTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "price_points", nullable = false)
    private int pricePoints;

    @Enumerated(EnumType.STRING)
    @Column(name = "license", nullable = false)
    private ModelLicense license;

    @Column(name = "usage_description")
    private String usageDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private OfferVisibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "shelf", nullable = false)
    private Shelf shelf;

    @Column(name = "is_handover", nullable = false)
    private boolean isHandover;

    @Column(name = "available_from")
    private Instant availableFrom;

    @Column(name = "available_until")
    private Instant availableUntil;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OfferStatus status;

    @Column(name = "views_count", nullable = false)
    private long viewsCount;

    @Column(name = "remix_count", nullable = false)
    private int remixCount;

    @Column(name = "points_earned", nullable = false)
    private long pointsEarned;

    @Column(name = "highlighted_by", columnDefinition = "BINARY(16)")
    private UUID highlightedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public OfferTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(OfferTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public int getPricePoints() {
        return pricePoints;
    }

    public void setPricePoints(int pricePoints) {
        this.pricePoints = pricePoints;
    }

    public ModelLicense getLicense() {
        return license;
    }

    public void setLicense(ModelLicense license) {
        this.license = license;
    }

    public String getUsageDescription() {
        return usageDescription;
    }

    public void setUsageDescription(String usageDescription) {
        this.usageDescription = usageDescription;
    }

    public OfferVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(OfferVisibility visibility) {
        this.visibility = visibility;
    }

    public Shelf getShelf() {
        return shelf;
    }

    public void setShelf(Shelf shelf) {
        this.shelf = shelf;
    }

    public boolean isIsHandover() {
        return isHandover;
    }

    public void setIsHandover(boolean isHandover) {
        this.isHandover = isHandover;
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

    public OfferStatus getStatus() {
        return status;
    }

    public void setStatus(OfferStatus status) {
        this.status = status;
    }

    public long getViewsCount() {
        return viewsCount;
    }

    public void setViewsCount(long viewsCount) {
        this.viewsCount = viewsCount;
    }

    public int getRemixCount() {
        return remixCount;
    }

    public void setRemixCount(int remixCount) {
        this.remixCount = remixCount;
    }

    public long getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(long pointsEarned) {
        this.pointsEarned = pointsEarned;
    }

    public UUID getHighlightedBy() {
        return highlightedBy;
    }

    public void setHighlightedBy(UUID highlightedBy) {
        this.highlightedBy = highlightedBy;
    }

    public long getVersion() {
        return version;
    }
}
