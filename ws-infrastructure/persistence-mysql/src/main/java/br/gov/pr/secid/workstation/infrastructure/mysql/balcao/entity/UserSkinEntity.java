package br.gov.pr.secid.workstation.infrastructure.mysql.balcao.entity;

import br.gov.pr.secid.workstation.domain.balcao.AcquiredVia;
import br.gov.pr.secid.workstation.domain.balcao.SkinKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code user_skins} (UserSkin — 11 Balcão & Loja; RF38, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "user_skins")
public class UserSkinEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "skin_kind", nullable = false)
    private SkinKind skinKind;

    @Column(name = "skin_key", nullable = false)
    private String skinKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquired_via", nullable = false)
    private AcquiredVia acquiredVia;

    @Column(name = "purchase_id", columnDefinition = "BINARY(16)")
    private UUID purchaseId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public SkinKind getSkinKind() {
        return skinKind;
    }

    public void setSkinKind(SkinKind skinKind) {
        this.skinKind = skinKind;
    }

    public String getSkinKey() {
        return skinKey;
    }

    public void setSkinKey(String skinKey) {
        this.skinKey = skinKey;
    }

    public AcquiredVia getAcquiredVia() {
        return acquiredVia;
    }

    public void setAcquiredVia(AcquiredVia acquiredVia) {
        this.acquiredVia = acquiredVia;
    }

    public UUID getPurchaseId() {
        return purchaseId;
    }

    public void setPurchaseId(UUID purchaseId) {
        this.purchaseId = purchaseId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
