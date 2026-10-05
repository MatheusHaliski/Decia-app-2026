package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity;

import br.gov.pr.secid.workstation.domain.balcao.PurchaseStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code store_purchases} (StorePurchase — 11 Balcão & Loja; RF42, RF38). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "store_purchases")
public class StorePurchaseEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "buyer_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID buyerId;

    @Column(name = "store_item_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID storeItemId;

    @Column(name = "price_paid", nullable = false)
    private int pricePaid;

    @Column(name = "ledger_entry_id", columnDefinition = "BINARY(16)")
    private UUID ledgerEntryId;

    @Column(name = "delivery_json", columnDefinition = "JSON")
    private String deliveryJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PurchaseStatus status;

    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getBuyerId() {
        return buyerId;
    }

    public void setBuyerId(UUID buyerId) {
        this.buyerId = buyerId;
    }

    public UUID getStoreItemId() {
        return storeItemId;
    }

    public void setStoreItemId(UUID storeItemId) {
        this.storeItemId = storeItemId;
    }

    public int getPricePaid() {
        return pricePaid;
    }

    public void setPricePaid(int pricePaid) {
        this.pricePaid = pricePaid;
    }

    public UUID getLedgerEntryId() {
        return ledgerEntryId;
    }

    public void setLedgerEntryId(UUID ledgerEntryId) {
        this.ledgerEntryId = ledgerEntryId;
    }

    public String getDeliveryJson() {
        return deliveryJson;
    }

    public void setDeliveryJson(String deliveryJson) {
        this.deliveryJson = deliveryJson;
    }

    public PurchaseStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseStatus status) {
        this.status = status;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
