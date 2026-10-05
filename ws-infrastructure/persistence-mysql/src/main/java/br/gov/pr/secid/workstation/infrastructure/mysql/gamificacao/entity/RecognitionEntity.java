package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.gamificacao.RecognitionSource;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code recognitions} (Recognition — 8 Gamificação; RF35, RF28, RF19, RF39, RF42). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "recognitions")
public class RecognitionEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "issuer_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID issuerUserId;

    @Column(name = "recipient_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID recipientUserId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "medal_art_json", columnDefinition = "JSON")
    private String medalArtJson;

    @Column(name = "criterion")
    private String criterion;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private RecognitionSource source;

    @Column(name = "source_id", columnDefinition = "BINARY(16)")
    private UUID sourceId;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "public_on_mural", nullable = false)
    private boolean publicOnMural;

    @Column(name = "certificate_media_id", columnDefinition = "BINARY(16)")
    private UUID certificateMediaId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getIssuerUserId() {
        return issuerUserId;
    }

    public void setIssuerUserId(UUID issuerUserId) {
        this.issuerUserId = issuerUserId;
    }

    public UUID getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(UUID recipientUserId) {
        this.recipientUserId = recipientUserId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getMedalArtJson() {
        return medalArtJson;
    }

    public void setMedalArtJson(String medalArtJson) {
        this.medalArtJson = medalArtJson;
    }

    public String getCriterion() {
        return criterion;
    }

    public void setCriterion(String criterion) {
        this.criterion = criterion;
    }

    public RecognitionSource getSource() {
        return source;
    }

    public void setSource(RecognitionSource source) {
        this.source = source;
    }

    public UUID getSourceId() {
        return sourceId;
    }

    public void setSourceId(UUID sourceId) {
        this.sourceId = sourceId;
    }

    public LocalDate getValidUntil() {
        return validUntil;
    }

    public void setValidUntil(LocalDate validUntil) {
        this.validUntil = validUntil;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(Instant issuedAt) {
        this.issuedAt = issuedAt;
    }

    public boolean isPublicOnMural() {
        return publicOnMural;
    }

    public void setPublicOnMural(boolean publicOnMural) {
        this.publicOnMural = publicOnMural;
    }

    public UUID getCertificateMediaId() {
        return certificateMediaId;
    }

    public void setCertificateMediaId(UUID certificateMediaId) {
        this.certificateMediaId = certificateMediaId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
