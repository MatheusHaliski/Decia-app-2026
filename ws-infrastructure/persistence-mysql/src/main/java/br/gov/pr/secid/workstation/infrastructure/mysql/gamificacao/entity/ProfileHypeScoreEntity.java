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
 * Entidade JPA de {@code profile_hype_scores} (ProfileHypeScore — 8 Gamificação; RF45, RF19, RF28, RF43, RF3). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "profile_hype_scores")
public class ProfileHypeScoreEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Column(name = "score_date", nullable = false)
    private LocalDate scoreDate;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "band_code", nullable = false)
    private String bandCode;

    @Column(name = "blocks_json", nullable = false, columnDefinition = "JSON")
    private String blocksJson;

    @Column(name = "bayesian_priors_json", columnDefinition = "JSON")
    private String bayesianPriorsJson;

    @Column(name = "half_life_days", nullable = false)
    private int halfLifeDays;

    @Column(name = "percentile_in_dept")
    private BigDecimal percentileInDept;

    @Column(name = "top_positive_events_json", columnDefinition = "JSON")
    private String topPositiveEventsJson;

    @Column(name = "top_negative_events_json", columnDefinition = "JSON")
    private String topNegativeEventsJson;

    @Column(name = "suggestions_json", columnDefinition = "JSON")
    private String suggestionsJson;

    @Column(name = "weights_version", nullable = false)
    private int weightsVersion;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

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

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getBandCode() {
        return bandCode;
    }

    public void setBandCode(String bandCode) {
        this.bandCode = bandCode;
    }

    public String getBlocksJson() {
        return blocksJson;
    }

    public void setBlocksJson(String blocksJson) {
        this.blocksJson = blocksJson;
    }

    public String getBayesianPriorsJson() {
        return bayesianPriorsJson;
    }

    public void setBayesianPriorsJson(String bayesianPriorsJson) {
        this.bayesianPriorsJson = bayesianPriorsJson;
    }

    public int getHalfLifeDays() {
        return halfLifeDays;
    }

    public void setHalfLifeDays(int halfLifeDays) {
        this.halfLifeDays = halfLifeDays;
    }

    public BigDecimal getPercentileInDept() {
        return percentileInDept;
    }

    public void setPercentileInDept(BigDecimal percentileInDept) {
        this.percentileInDept = percentileInDept;
    }

    public String getTopPositiveEventsJson() {
        return topPositiveEventsJson;
    }

    public void setTopPositiveEventsJson(String topPositiveEventsJson) {
        this.topPositiveEventsJson = topPositiveEventsJson;
    }

    public String getTopNegativeEventsJson() {
        return topNegativeEventsJson;
    }

    public void setTopNegativeEventsJson(String topNegativeEventsJson) {
        this.topNegativeEventsJson = topNegativeEventsJson;
    }

    public String getSuggestionsJson() {
        return suggestionsJson;
    }

    public void setSuggestionsJson(String suggestionsJson) {
        this.suggestionsJson = suggestionsJson;
    }

    public int getWeightsVersion() {
        return weightsVersion;
    }

    public void setWeightsVersion(int weightsVersion) {
        this.weightsVersion = weightsVersion;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
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
