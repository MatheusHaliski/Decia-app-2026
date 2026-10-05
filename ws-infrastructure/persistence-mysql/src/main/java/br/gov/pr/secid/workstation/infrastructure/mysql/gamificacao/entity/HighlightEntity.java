package br.gov.pr.secid.workstation.infrastructure.mysql.gamificacao.entity;

import br.gov.pr.secid.workstation.domain.gamificacao.HighlightTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code highlights} (Highlight — 8 Gamificação; RF35, RF27, RF39). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "highlights")
public class HighlightEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "month_key", nullable = false)
    private String monthKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private HighlightTargetType targetType;

    @Column(name = "target_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID targetId;

    @Column(name = "algorithm_score_json", columnDefinition = "JSON")
    private String algorithmScoreJson;

    @Column(name = "curated_by", columnDefinition = "BINARY(16)")
    private UUID curatedBy;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public String getMonthKey() {
        return monthKey;
    }

    public void setMonthKey(String monthKey) {
        this.monthKey = monthKey;
    }

    public HighlightTargetType getTargetType() {
        return targetType;
    }

    public void setTargetType(HighlightTargetType targetType) {
        this.targetType = targetType;
    }

    public UUID getTargetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public String getAlgorithmScoreJson() {
        return algorithmScoreJson;
    }

    public void setAlgorithmScoreJson(String algorithmScoreJson) {
        this.algorithmScoreJson = algorithmScoreJson;
    }

    public UUID getCuratedBy() {
        return curatedBy;
    }

    public void setCuratedBy(UUID curatedBy) {
        this.curatedBy = curatedBy;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
