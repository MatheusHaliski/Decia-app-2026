package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decia.ArtifactKind;
import br.gov.pr.secid.workstation.domain.decia.ArtifactOrigin;
import br.gov.pr.secid.workstation.domain.decia.ArtifactStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code session_artifacts} (SessionArtifact — 5 DECIA sessão; RF13, RF29, RF33). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "session_artifacts")
public class SessionArtifactEntity extends AuditableEntity {

    @Column(name = "session_id", columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin_type", nullable = false)
    private ArtifactOrigin originType;

    @Column(name = "origin_id", columnDefinition = "BINARY(16)")
    private UUID originId;

    @Column(name = "requested_by", nullable = false, columnDefinition = "BINARY(16)")
    private UUID requestedBy;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private ArtifactKind kind;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "instruction", columnDefinition = "TEXT")
    private String instruction;

    @Column(name = "content_md", columnDefinition = "MEDIUMTEXT")
    private String contentMd;

    @Column(name = "media_object_id", columnDefinition = "BINARY(16)")
    private UUID mediaObjectId;

    @Column(name = "goal_alignment_json", columnDefinition = "JSON")
    private String goalAlignmentJson;

    @Column(name = "citations_json", columnDefinition = "JSON")
    private String citationsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_class", nullable = false)
    private AccessClassification accessClass;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ArtifactStatus status;

    @Column(name = "generated_at")
    private Instant generatedAt;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "notified_at")
    private Instant notifiedAt;

    @Column(name = "converted_task_id", columnDefinition = "BINARY(16)")
    private UUID convertedTaskId;

    @Column(name = "supersedes_artifact_id", columnDefinition = "BINARY(16)")
    private UUID supersedesArtifactId;

    @Column(name = "correlation_id")
    private String correlationId;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public ArtifactOrigin getOriginType() {
        return originType;
    }

    public void setOriginType(ArtifactOrigin originType) {
        this.originType = originType;
    }

    public UUID getOriginId() {
        return originId;
    }

    public void setOriginId(UUID originId) {
        this.originId = originId;
    }

    public UUID getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UUID requestedBy) {
        this.requestedBy = requestedBy;
    }

    public UUID getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(UUID departmentId) {
        this.departmentId = departmentId;
    }

    public ArtifactKind getKind() {
        return kind;
    }

    public void setKind(ArtifactKind kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public String getContentMd() {
        return contentMd;
    }

    public void setContentMd(String contentMd) {
        this.contentMd = contentMd;
    }

    public UUID getMediaObjectId() {
        return mediaObjectId;
    }

    public void setMediaObjectId(UUID mediaObjectId) {
        this.mediaObjectId = mediaObjectId;
    }

    public String getGoalAlignmentJson() {
        return goalAlignmentJson;
    }

    public void setGoalAlignmentJson(String goalAlignmentJson) {
        this.goalAlignmentJson = goalAlignmentJson;
    }

    public String getCitationsJson() {
        return citationsJson;
    }

    public void setCitationsJson(String citationsJson) {
        this.citationsJson = citationsJson;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public AccessClassification getAccessClass() {
        return accessClass;
    }

    public void setAccessClass(AccessClassification accessClass) {
        this.accessClass = accessClass;
    }

    public ArtifactStatus getStatus() {
        return status;
    }

    public void setStatus(ArtifactStatus status) {
        this.status = status;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public Instant getNotifiedAt() {
        return notifiedAt;
    }

    public void setNotifiedAt(Instant notifiedAt) {
        this.notifiedAt = notifiedAt;
    }

    public UUID getConvertedTaskId() {
        return convertedTaskId;
    }

    public void setConvertedTaskId(UUID convertedTaskId) {
        this.convertedTaskId = convertedTaskId;
    }

    public UUID getSupersedesArtifactId() {
        return supersedesArtifactId;
    }

    public void setSupersedesArtifactId(UUID supersedesArtifactId) {
        this.supersedesArtifactId = supersedesArtifactId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }
}
