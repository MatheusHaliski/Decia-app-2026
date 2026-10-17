package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code task_briefs} (TaskBrief — 2 Acervo de Tarefas; RF4, RF12, RF41). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "task_briefs")
public class TaskBriefEntity {

    @Id
    @Column(name = "task_id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "objective")
    private String objective;

    @Enumerated(EnumType.STRING)
    @Column(name = "area")
    private WorkArea area;

    @Column(name = "deliverables_json", columnDefinition = "JSON")
    private String deliverablesJson;

    @Column(name = "acceptance_criteria_json", columnDefinition = "JSON")
    private String acceptanceCriteriaJson;

    @Column(name = "references_json", columnDefinition = "JSON")
    private String referencesJson;

    @Column(name = "extensions_json", columnDefinition = "JSON")
    private String extensionsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public String getObjective() {
        return objective;
    }

    public void setObjective(String objective) {
        this.objective = objective;
    }

    public WorkArea getArea() {
        return area;
    }

    public void setArea(WorkArea area) {
        this.area = area;
    }

    public String getDeliverablesJson() {
        return deliverablesJson;
    }

    public void setDeliverablesJson(String deliverablesJson) {
        this.deliverablesJson = deliverablesJson;
    }

    public String getAcceptanceCriteriaJson() {
        return acceptanceCriteriaJson;
    }

    public void setAcceptanceCriteriaJson(String acceptanceCriteriaJson) {
        this.acceptanceCriteriaJson = acceptanceCriteriaJson;
    }

    public String getReferencesJson() {
        return referencesJson;
    }

    public void setReferencesJson(String referencesJson) {
        this.referencesJson = referencesJson;
    }

    public String getExtensionsJson() {
        return extensionsJson;
    }

    public void setExtensionsJson(String extensionsJson) {
        this.extensionsJson = extensionsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
