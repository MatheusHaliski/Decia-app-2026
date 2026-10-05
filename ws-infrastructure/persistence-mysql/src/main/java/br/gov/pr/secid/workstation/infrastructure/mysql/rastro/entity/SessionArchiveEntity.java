package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code session_archives} (SessionArchive — 6 Rastro de Decisão; RF17, RF18, RF33). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "session_archives")
public class SessionArchiveEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "export_json_media_id", columnDefinition = "BINARY(16)")
    private UUID exportJsonMediaId;

    @Column(name = "export_pdf_media_id", columnDefinition = "BINARY(16)")
    private UUID exportPdfMediaId;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(name = "checksum", nullable = false)
    private String checksum;

    @Column(name = "archived_at", nullable = false)
    private Instant archivedAt;

    @Column(name = "closed_without_decision", nullable = false)
    private boolean closedWithoutDecision;

    @Column(name = "close_reason")
    private String closeReason;

    @Column(name = "analytics_snapshot_json", columnDefinition = "JSON")
    private String analyticsSnapshotJson;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getExportJsonMediaId() {
        return exportJsonMediaId;
    }

    public void setExportJsonMediaId(UUID exportJsonMediaId) {
        this.exportJsonMediaId = exportJsonMediaId;
    }

    public UUID getExportPdfMediaId() {
        return exportPdfMediaId;
    }

    public void setExportPdfMediaId(UUID exportPdfMediaId) {
        this.exportPdfMediaId = exportPdfMediaId;
    }

    public int getMessageCount() {
        return messageCount;
    }

    public void setMessageCount(int messageCount) {
        this.messageCount = messageCount;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public boolean isClosedWithoutDecision() {
        return closedWithoutDecision;
    }

    public void setClosedWithoutDecision(boolean closedWithoutDecision) {
        this.closedWithoutDecision = closedWithoutDecision;
    }

    public String getCloseReason() {
        return closeReason;
    }

    public void setCloseReason(String closeReason) {
        this.closeReason = closeReason;
    }

    public String getAnalyticsSnapshotJson() {
        return analyticsSnapshotJson;
    }

    public void setAnalyticsSnapshotJson(String analyticsSnapshotJson) {
        this.analyticsSnapshotJson = analyticsSnapshotJson;
    }
}
