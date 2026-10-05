package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity;

import br.gov.pr.secid.workstation.domain.balcao.StoreItemKind;
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
 * Entidade JPA de {@code store_items} (StoreItem — 11 Balcão & Loja; RF42, RF38, RF40). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "store_items")
public class StoreItemEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private StoreItemKind kind;

    @Column(name = "ref_id", columnDefinition = "BINARY(16)")
    private UUID refId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "price_points", nullable = false)
    private int pricePoints;

    @Column(name = "stock")
    private Integer stock;

    @Column(name = "available_from")
    private Instant availableFrom;

    @Column(name = "available_until")
    private Instant availableUntil;

    @Column(name = "company_id", columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public StoreItemKind getKind() {
        return kind;
    }

    public void setKind(StoreItemKind kind) {
        this.kind = kind;
    }

    public UUID getRefId() {
        return refId;
    }

    public void setRefId(UUID refId) {
        this.refId = refId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getPricePoints() {
        return pricePoints;
    }

    public void setPricePoints(int pricePoints) {
        this.pricePoints = pricePoints;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
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

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
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
