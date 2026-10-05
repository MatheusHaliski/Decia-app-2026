package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code points_donations} (PointsDonation — 8 Gamificação; RF42). Gerada pelo SchemaGenerator a partir do
 * domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "points_donations")
public class PointsDonationEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "from_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID toUserId;

    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "message")
    private String message;

    @Column(name = "ledger_debit_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ledgerDebitId;

    @Column(name = "ledger_credit_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ledgerCreditId;

    @Column(name = "month_key", nullable = false)
    private String monthKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getFromUserId() {
        return fromUserId;
    }

    public void setFromUserId(UUID fromUserId) {
        this.fromUserId = fromUserId;
    }

    public UUID getToUserId() {
        return toUserId;
    }

    public void setToUserId(UUID toUserId) {
        this.toUserId = toUserId;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public UUID getLedgerDebitId() {
        return ledgerDebitId;
    }

    public void setLedgerDebitId(UUID ledgerDebitId) {
        this.ledgerDebitId = ledgerDebitId;
    }

    public UUID getLedgerCreditId() {
        return ledgerCreditId;
    }

    public void setLedgerCreditId(UUID ledgerCreditId) {
        this.ledgerCreditId = ledgerCreditId;
    }

    public String getMonthKey() {
        return monthKey;
    }

    public void setMonthKey(String monthKey) {
        this.monthKey = monthKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
