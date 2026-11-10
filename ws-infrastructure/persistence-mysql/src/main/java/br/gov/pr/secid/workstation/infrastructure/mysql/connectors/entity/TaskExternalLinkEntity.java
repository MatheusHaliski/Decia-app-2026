package br.gov.pr.secid.workstation.infrastructure.mysql.connectors.entity;

import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.connectors.ConnectorProvider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code task_external_links} (TaskExternalLink — 2 Acervo de Tarefas; RF20, RF8, RF23). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "task_external_links")
public class TaskExternalLinkEntity {

    @Id
    @Column(name = "task_id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "account_id", columnDefinition = "BINARY(16)")
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private ConnectorProvider provider;

    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(name = "mime_type")
    private String mimeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "link_mode", nullable = false)
    private LinkMode linkMode;

    @Column(name = "remote_version")
    private String remoteVersion;

    @Column(name = "synced_at", nullable = false)
    private Instant syncedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public void setAccountId(UUID accountId) {
        this.accountId = accountId;
    }

    public ConnectorProvider getProvider() {
        return provider;
    }

    public void setProvider(ConnectorProvider provider) {
        this.provider = provider;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public LinkMode getLinkMode() {
        return linkMode;
    }

    public void setLinkMode(LinkMode linkMode) {
        this.linkMode = linkMode;
    }

    public String getRemoteVersion() {
        return remoteVersion;
    }

    public void setRemoteVersion(String remoteVersion) {
        this.remoteVersion = remoteVersion;
    }

    public Instant getSyncedAt() {
        return syncedAt;
    }

    public void setSyncedAt(Instant syncedAt) {
        this.syncedAt = syncedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
