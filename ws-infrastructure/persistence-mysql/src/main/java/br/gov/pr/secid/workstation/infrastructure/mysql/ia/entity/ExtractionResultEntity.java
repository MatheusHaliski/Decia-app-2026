package br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.ia.ExtractionKind;
import br.gov.pr.secid.workstation.domain.ia.ExtractionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

/**
 * Entidade JPA de {@code extraction_results} (ExtractionResult — 10 IA do sistema; RF34, RF20, RF21). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "extraction_results")
public class ExtractionResultEntity extends AuditableEntity {

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private ExtractionKind kind;

    @Column(name = "rows_json", columnDefinition = "JSON")
    private String rowsJson;

    @Column(name = "layers_json", columnDefinition = "JSON")
    private String layersJson;

    @Column(name = "derived_task_id", columnDefinition = "BINARY(16)")
    private UUID derivedTaskId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExtractionStatus status;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public ExtractionKind getKind() {
        return kind;
    }

    public void setKind(ExtractionKind kind) {
        this.kind = kind;
    }

    public String getRowsJson() {
        return rowsJson;
    }

    public void setRowsJson(String rowsJson) {
        this.rowsJson = rowsJson;
    }

    public String getLayersJson() {
        return layersJson;
    }

    public void setLayersJson(String layersJson) {
        this.layersJson = layersJson;
    }

    public UUID getDerivedTaskId() {
        return derivedTaskId;
    }

    public void setDerivedTaskId(UUID derivedTaskId) {
        this.derivedTaskId = derivedTaskId;
    }

    public ExtractionStatus getStatus() {
        return status;
    }

    public void setStatus(ExtractionStatus status) {
        this.status = status;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public long getVersion() {
        return version;
    }
}
