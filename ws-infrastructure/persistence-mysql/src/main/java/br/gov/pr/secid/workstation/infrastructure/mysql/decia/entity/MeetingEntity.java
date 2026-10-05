package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.MeetingSource;
import br.gov.pr.secid.workstation.domain.decia.MeetingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code meetings} (Meeting — 5 DECIA sessão; RF37, RF29, RF42). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "meetings")
public class MeetingEntity extends AuditableEntity {

    @Column(name = "session_id", columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "project_id", columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "organizer_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID organizerId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private MeetingSource source;

    @Column(name = "audio_media_id", columnDefinition = "BINARY(16)")
    private UUID audioMediaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MeetingStatus status;

    @Column(name = "minutes_task_id", columnDefinition = "BINARY(16)")
    private UUID minutesTaskId;

    @Column(name = "follow_up_task_ids_json", columnDefinition = "JSON")
    private String followUpTaskIdsJson;

    @Column(name = "ratification_deadline_at")
    private Instant ratificationDeadlineAt;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public void setProjectId(UUID projectId) {
        this.projectId = projectId;
    }

    public UUID getOrganizerId() {
        return organizerId;
    }

    public void setOrganizerId(UUID organizerId) {
        this.organizerId = organizerId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(Instant endedAt) {
        this.endedAt = endedAt;
    }

    public MeetingSource getSource() {
        return source;
    }

    public void setSource(MeetingSource source) {
        this.source = source;
    }

    public UUID getAudioMediaId() {
        return audioMediaId;
    }

    public void setAudioMediaId(UUID audioMediaId) {
        this.audioMediaId = audioMediaId;
    }

    public MeetingStatus getStatus() {
        return status;
    }

    public void setStatus(MeetingStatus status) {
        this.status = status;
    }

    public UUID getMinutesTaskId() {
        return minutesTaskId;
    }

    public void setMinutesTaskId(UUID minutesTaskId) {
        this.minutesTaskId = minutesTaskId;
    }

    public String getFollowUpTaskIdsJson() {
        return followUpTaskIdsJson;
    }

    public void setFollowUpTaskIdsJson(String followUpTaskIdsJson) {
        this.followUpTaskIdsJson = followUpTaskIdsJson;
    }

    public Instant getRatificationDeadlineAt() {
        return ratificationDeadlineAt;
    }

    public void setRatificationDeadlineAt(Instant ratificationDeadlineAt) {
        this.ratificationDeadlineAt = ratificationDeadlineAt;
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
