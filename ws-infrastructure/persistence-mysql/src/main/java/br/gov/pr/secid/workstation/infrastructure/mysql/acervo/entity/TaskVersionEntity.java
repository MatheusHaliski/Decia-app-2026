package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code task_versions} (TaskVersion — 2 Acervo de Tarefas; RF20, RF41). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "task_versions")
public class TaskVersionEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "task_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber;

    @Column(name = "external_revision_id")
    private String externalRevisionId;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "change_summary")
    private String changeSummary;

    @Column(name = "snapshot_media_id", columnDefinition = "BINARY(16)")
    private UUID snapshotMediaId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getExternalRevisionId() {
        return externalRevisionId;
    }

    public void setExternalRevisionId(String externalRevisionId) {
        this.externalRevisionId = externalRevisionId;
    }

    public Instant getSyncedAt() {
        return syncedAt;
    }

    public void setSyncedAt(Instant syncedAt) {
        this.syncedAt = syncedAt;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getChangeSummary() {
        return changeSummary;
    }

    public void setChangeSummary(String changeSummary) {
        this.changeSummary = changeSummary;
    }

    public UUID getSnapshotMediaId() {
        return snapshotMediaId;
    }

    public void setSnapshotMediaId(UUID snapshotMediaId) {
        this.snapshotMediaId = snapshotMediaId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
