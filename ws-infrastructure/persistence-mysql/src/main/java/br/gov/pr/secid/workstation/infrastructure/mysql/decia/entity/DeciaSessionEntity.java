package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AiMode;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.SessionAccess;
import br.gov.pr.secid.workstation.domain.decia.SessionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decia_sessions} (DeciaSession — 5 DECIA sessão; RF4, RF5, RF9, RF6, RF11, RF12, RF14, RF15, RF17,
 * RF29, RF33). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento
 * nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decia_sessions")
public class DeciaSessionEntity extends AuditableEntity {

    @Column(name = "topic", nullable = false)
    private String topic;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "admin_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID adminUserId;

    @Column(name = "created_by_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID createdByUserId;

    @Column(name = "company_id", columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_mode", nullable = false)
    private SessionAccess accessMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_mode", nullable = false)
    private AiMode aiMode;

    @Column(name = "linked_project_id", columnDefinition = "BINARY(16)")
    private UUID linkedProjectId;

    @Column(name = "plan_axis_id", columnDefinition = "BINARY(16)")
    private UUID planAxisId;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "message_count", nullable = false)
    private int messageCount;

    @Column(name = "participant_count", nullable = false)
    private int participantCount;

    @Column(name = "message_ttl_days", nullable = false)
    private int messageTtlDays;

    @Column(name = "archive_media_id", columnDefinition = "BINARY(16)")
    private UUID archiveMediaId;

    @Column(name = "indexed_in_memory", nullable = false)
    private boolean indexedInMemory;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public UUID getAdminUserId() {
        return adminUserId;
    }

    public void setAdminUserId(UUID adminUserId) {
        this.adminUserId = adminUserId;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(UUID createdByUserId) {
        this.createdByUserId = createdByUserId;
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

    public SessionAccess getAccessMode() {
        return accessMode;
    }

    public void setAccessMode(SessionAccess accessMode) {
        this.accessMode = accessMode;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public AiMode getAiMode() {
        return aiMode;
    }

    public void setAiMode(AiMode aiMode) {
        this.aiMode = aiMode;
    }

    public UUID getLinkedProjectId() {
        return linkedProjectId;
    }

    public void setLinkedProjectId(UUID linkedProjectId) {
        this.linkedProjectId = linkedProjectId;
    }

    public UUID getPlanAxisId() {
        return planAxisId;
    }

    public void setPlanAxisId(UUID planAxisId) {
        this.planAxisId = planAxisId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public void setArchivedAt(Instant archivedAt) {
        this.archivedAt = archivedAt;
    }

    public int getMessageCount() {
        return messageCount;
    }

    public void setMessageCount(int messageCount) {
        this.messageCount = messageCount;
    }

    public int getParticipantCount() {
        return participantCount;
    }

    public void setParticipantCount(int participantCount) {
        this.participantCount = participantCount;
    }

    public int getMessageTtlDays() {
        return messageTtlDays;
    }

    public void setMessageTtlDays(int messageTtlDays) {
        this.messageTtlDays = messageTtlDays;
    }

    public UUID getArchiveMediaId() {
        return archiveMediaId;
    }

    public void setArchiveMediaId(UUID archiveMediaId) {
        this.archiveMediaId = archiveMediaId;
    }

    public boolean isIndexedInMemory() {
        return indexedInMemory;
    }

    public void setIndexedInMemory(boolean indexedInMemory) {
        this.indexedInMemory = indexedInMemory;
    }

    public long getVersion() {
        return version;
    }
}
