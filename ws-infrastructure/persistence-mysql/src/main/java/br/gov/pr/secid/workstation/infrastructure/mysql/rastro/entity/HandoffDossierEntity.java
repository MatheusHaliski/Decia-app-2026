package br.gov.pr.secid.workstation.infrastructure.mysql.rastro.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.rastro.HandoffReason;
import br.gov.pr.secid.workstation.domain.rastro.HandoffStatus;
import br.gov.pr.secid.workstation.domain.rastro.HandoffSubjectType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code handoff_dossiers} (HandoffDossier — 6 Rastro de Decisão; RF36, RF25, RF28). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "handoff_dossiers")
public class HandoffDossierEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type", nullable = false)
    private HandoffSubjectType subjectType;

    @Column(name = "subject_user_id", columnDefinition = "BINARY(16)")
    private UUID subjectUserId;

    @Column(name = "grouping_id", columnDefinition = "BINARY(16)")
    private UUID groupingId;

    @Column(name = "requested_by", nullable = false, columnDefinition = "BINARY(16)")
    private UUID requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    private HandoffReason reason;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "content_json", nullable = false, columnDefinition = "JSON")
    private String contentJson;

    @Column(name = "document_task_id", columnDefinition = "BINARY(16)")
    private UUID documentTaskId;

    @Column(name = "transition_project_id", columnDefinition = "BINARY(16)")
    private UUID transitionProjectId;

    @Column(name = "successor_user_id", columnDefinition = "BINARY(16)")
    private UUID successorUserId;

    @Column(name = "successor_accepted_at")
    private Instant successorAcceptedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private HandoffStatus status;

    @Column(name = "consent_for_private_items", nullable = false)
    private boolean consentForPrivateItems;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public HandoffSubjectType getSubjectType() {
        return subjectType;
    }

    public void setSubjectType(HandoffSubjectType subjectType) {
        this.subjectType = subjectType;
    }

    public UUID getSubjectUserId() {
        return subjectUserId;
    }

    public void setSubjectUserId(UUID subjectUserId) {
        this.subjectUserId = subjectUserId;
    }

    public UUID getGroupingId() {
        return groupingId;
    }

    public void setGroupingId(UUID groupingId) {
        this.groupingId = groupingId;
    }

    public UUID getRequestedBy() {
        return requestedBy;
    }

    public void setRequestedBy(UUID requestedBy) {
        this.requestedBy = requestedBy;
    }

    public HandoffReason getReason() {
        return reason;
    }

    public void setReason(HandoffReason reason) {
        this.reason = reason;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getContentJson() {
        return contentJson;
    }

    public void setContentJson(String contentJson) {
        this.contentJson = contentJson;
    }

    public UUID getDocumentTaskId() {
        return documentTaskId;
    }

    public void setDocumentTaskId(UUID documentTaskId) {
        this.documentTaskId = documentTaskId;
    }

    public UUID getTransitionProjectId() {
        return transitionProjectId;
    }

    public void setTransitionProjectId(UUID transitionProjectId) {
        this.transitionProjectId = transitionProjectId;
    }

    public UUID getSuccessorUserId() {
        return successorUserId;
    }

    public void setSuccessorUserId(UUID successorUserId) {
        this.successorUserId = successorUserId;
    }

    public Instant getSuccessorAcceptedAt() {
        return successorAcceptedAt;
    }

    public void setSuccessorAcceptedAt(Instant successorAcceptedAt) {
        this.successorAcceptedAt = successorAcceptedAt;
    }

    public HandoffStatus getStatus() {
        return status;
    }

    public void setStatus(HandoffStatus status) {
        this.status = status;
    }

    public boolean isConsentForPrivateItems() {
        return consentForPrivateItems;
    }

    public void setConsentForPrivateItems(boolean consentForPrivateItems) {
        this.consentForPrivateItems = consentForPrivateItems;
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
