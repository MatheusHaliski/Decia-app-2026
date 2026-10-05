package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code hse_snapshots} (EfficiencyScoreSnapshot — 8 Gamificação; RF44, RF43, RF45, RF3). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "hse_snapshots")
public class EfficiencyScoreSnapshotEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "score_date", nullable = false)
    private LocalDate scoreDate;

    @Column(name = "hse", nullable = false)
    private BigDecimal hse;

    @Column(name = "moving_avg7")
    private BigDecimal movingAvg7;

    @Column(name = "weights_version", nullable = false)
    private int weightsVersion;

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

    public LocalDate getScoreDate() {
        return scoreDate;
    }

    public void setScoreDate(LocalDate scoreDate) {
        this.scoreDate = scoreDate;
    }

    public BigDecimal getHse() {
        return hse;
    }

    public void setHse(BigDecimal hse) {
        this.hse = hse;
    }

    public BigDecimal getMovingAvg7() {
        return movingAvg7;
    }

    public void setMovingAvg7(BigDecimal movingAvg7) {
        this.movingAvg7 = movingAvg7;
    }

    public int getWeightsVersion() {
        return weightsVersion;
    }

    public void setWeightsVersion(int weightsVersion) {
        this.weightsVersion = weightsVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
