package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code summary_scenarios} (SummaryScenario — 5 DECIA sessão; RF11, RF12, RF31). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "summary_scenarios")
public class SummaryScenarioEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "summary_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID summaryId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "advantages_json", columnDefinition = "JSON")
    private String advantagesJson;

    @Column(name = "disadvantages_json", columnDefinition = "JSON")
    private String disadvantagesJson;

    @Column(name = "criteria_scores_json", columnDefinition = "JSON")
    private String criteriaScoresJson;

    @Column(name = "linked_project_scenario_id", columnDefinition = "BINARY(16)")
    private UUID linkedProjectScenarioId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSummaryId() {
        return summaryId;
    }

    public void setSummaryId(UUID summaryId) {
        this.summaryId = summaryId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAdvantagesJson() {
        return advantagesJson;
    }

    public void setAdvantagesJson(String advantagesJson) {
        this.advantagesJson = advantagesJson;
    }

    public String getDisadvantagesJson() {
        return disadvantagesJson;
    }

    public void setDisadvantagesJson(String disadvantagesJson) {
        this.disadvantagesJson = disadvantagesJson;
    }

    public String getCriteriaScoresJson() {
        return criteriaScoresJson;
    }

    public void setCriteriaScoresJson(String criteriaScoresJson) {
        this.criteriaScoresJson = criteriaScoresJson;
    }

    public UUID getLinkedProjectScenarioId() {
        return linkedProjectScenarioId;
    }

    public void setLinkedProjectScenarioId(UUID linkedProjectScenarioId) {
        this.linkedProjectScenarioId = linkedProjectScenarioId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
