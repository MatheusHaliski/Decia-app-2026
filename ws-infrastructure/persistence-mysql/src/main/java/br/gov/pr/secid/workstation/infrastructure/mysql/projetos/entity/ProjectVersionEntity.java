package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code project_versions} (ProjectVersion — 3 Criador de Projetos; RF22, RF31). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "project_versions")
public class ProjectVersionEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "project_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "author_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID authorId;

    @Column(name = "diff_json", columnDefinition = "JSON")
    private String diffJson;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "JSON")
    private String snapshotJson;

    @Column(name = "reason")
    private String reason;

    @Column(name = "restored_from_version_id", columnDefinition = "BINARY(16)")
    private UUID restoredFromVersionId;

    @Column(name = "source_scenario_id", columnDefinition = "BINARY(16)")
    private UUID sourceScenarioId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public void setAuthorId(UUID authorId) {
        this.authorId = authorId;
    }

    public String getDiffJson() {
        return diffJson;
    }

    public void setDiffJson(String diffJson) {
        this.diffJson = diffJson;
    }

    public String getSnapshotJson() {
        return snapshotJson;
    }

    public void setSnapshotJson(String snapshotJson) {
        this.snapshotJson = snapshotJson;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public UUID getRestoredFromVersionId() {
        return restoredFromVersionId;
    }

    public void setRestoredFromVersionId(UUID restoredFromVersionId) {
        this.restoredFromVersionId = restoredFromVersionId;
    }

    public UUID getSourceScenarioId() {
        return sourceScenarioId;
    }

    public void setSourceScenarioId(UUID sourceScenarioId) {
        this.sourceScenarioId = sourceScenarioId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
