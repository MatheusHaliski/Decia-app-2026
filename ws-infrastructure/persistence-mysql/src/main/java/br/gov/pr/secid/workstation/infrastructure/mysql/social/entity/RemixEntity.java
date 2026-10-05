package br.gov.pr.secid.workstation.infrastructure.mysql.social.entity;

import br.gov.pr.secid.workstation.domain.common.TargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code remixes} (Remix — 7 Social & Descoberta; RF26, RF23, RF40, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "remixes")
public class RemixEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "actor_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private TargetType sourceType;

    @Column(name = "source_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sourceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_type", nullable = false)
    private TargetType resultType;

    @Column(name = "result_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID resultId;

    @Column(name = "model_offer_id", columnDefinition = "BINARY(16)")
    private UUID modelOfferId;

    @Column(name = "ledger_entry_id", columnDefinition = "BINARY(16)")
    private UUID ledgerEntryId;

    @Column(name = "at", nullable = false)
    private Instant at;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getActorId() {
        return actorId;
    }

    public void setActorId(UUID actorId) {
        this.actorId = actorId;
    }

    public TargetType getSourceType() {
        return sourceType;
    }

    public void setSourceType(TargetType sourceType) {
        this.sourceType = sourceType;
    }

    public UUID getSourceId() {
        return sourceId;
    }

    public void setSourceId(UUID sourceId) {
        this.sourceId = sourceId;
    }

    public TargetType getResultType() {
        return resultType;
    }

    public void setResultType(TargetType resultType) {
        this.resultType = resultType;
    }

    public UUID getResultId() {
        return resultId;
    }

    public void setResultId(UUID resultId) {
        this.resultId = resultId;
    }

    public UUID getModelOfferId() {
        return modelOfferId;
    }

    public void setModelOfferId(UUID modelOfferId) {
        this.modelOfferId = modelOfferId;
    }

    public UUID getLedgerEntryId() {
        return ledgerEntryId;
    }

    public void setLedgerEntryId(UUID ledgerEntryId) {
        this.ledgerEntryId = ledgerEntryId;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }
}
