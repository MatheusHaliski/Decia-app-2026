package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.decia.MessageClass;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code message_classifications} (MessageClassification — 5 DECIA sessão; RF7, RF8, RF11, RF29, RF42).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "message_classifications")
public class MessageClassificationEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "message_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID messageId;

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "label", nullable = false)
    private MessageClass label;

    @Column(name = "confidence", nullable = false)
    private BigDecimal confidence;

    @Column(name = "has_evidence", nullable = false)
    private boolean hasEvidence;

    @Column(name = "evidence_refs_json", columnDefinition = "JSON")
    private String evidenceRefsJson;

    @Column(name = "linked_task_id", columnDefinition = "BINARY(16)")
    private UUID linkedTaskId;

    @Column(name = "linked_project_id", columnDefinition = "BINARY(16)")
    private UUID linkedProjectId;

    @Column(name = "rationale")
    private String rationale;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "confirmed_by_user_id", columnDefinition = "BINARY(16)")
    private UUID confirmedByUserId;

    @Column(name = "at", nullable = false)
    private Instant at;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getMessageId() {
        return messageId;
    }

    public void setMessageId(UUID messageId) {
        this.messageId = messageId;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public MessageClass getLabel() {
        return label;
    }

    public void setLabel(MessageClass label) {
        this.label = label;
    }

    public BigDecimal getConfidence() {
        return confidence;
    }

    public void setConfidence(BigDecimal confidence) {
        this.confidence = confidence;
    }

    public boolean isHasEvidence() {
        return hasEvidence;
    }

    public void setHasEvidence(boolean hasEvidence) {
        this.hasEvidence = hasEvidence;
    }

    public String getEvidenceRefsJson() {
        return evidenceRefsJson;
    }

    public void setEvidenceRefsJson(String evidenceRefsJson) {
        this.evidenceRefsJson = evidenceRefsJson;
    }

    public UUID getLinkedTaskId() {
        return linkedTaskId;
    }

    public void setLinkedTaskId(UUID linkedTaskId) {
        this.linkedTaskId = linkedTaskId;
    }

    public UUID getLinkedProjectId() {
        return linkedProjectId;
    }

    public void setLinkedProjectId(UUID linkedProjectId) {
        this.linkedProjectId = linkedProjectId;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public UUID getConfirmedByUserId() {
        return confirmedByUserId;
    }

    public void setConfirmedByUserId(UUID confirmedByUserId) {
        this.confirmedByUserId = confirmedByUserId;
    }

    public Instant getAt() {
        return at;
    }

    public void setAt(Instant at) {
        this.at = at;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
