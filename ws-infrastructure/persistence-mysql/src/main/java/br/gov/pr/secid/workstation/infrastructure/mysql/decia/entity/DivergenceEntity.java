package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.DivergenceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code divergences} (Divergence — 5 DECIA sessão; RF8, RF10, RF11, RF42). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "divergences")
public class DivergenceEntity extends AuditableEntity {

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "origin_message_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID originMessageId;

    @Column(name = "detected_by_ai", nullable = false)
    private boolean detectedByAi;

    @Column(name = "summary", nullable = false)
    private String summary;

    @Column(name = "parties_json", columnDefinition = "JSON")
    private String partiesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DivergenceStatus status;

    @Column(name = "resolved_by_reply_id", columnDefinition = "BINARY(16)")
    private UUID resolvedByReplyId;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "notified_at")
    private Instant notifiedAt;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getOriginMessageId() {
        return originMessageId;
    }

    public void setOriginMessageId(UUID originMessageId) {
        this.originMessageId = originMessageId;
    }

    public boolean isDetectedByAi() {
        return detectedByAi;
    }

    public void setDetectedByAi(boolean detectedByAi) {
        this.detectedByAi = detectedByAi;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getPartiesJson() {
        return partiesJson;
    }

    public void setPartiesJson(String partiesJson) {
        this.partiesJson = partiesJson;
    }

    public DivergenceStatus getStatus() {
        return status;
    }

    public void setStatus(DivergenceStatus status) {
        this.status = status;
    }

    public UUID getResolvedByReplyId() {
        return resolvedByReplyId;
    }

    public void setResolvedByReplyId(UUID resolvedByReplyId) {
        this.resolvedByReplyId = resolvedByReplyId;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public Instant getNotifiedAt() {
        return notifiedAt;
    }

    public void setNotifiedAt(Instant notifiedAt) {
        this.notifiedAt = notifiedAt;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }
}
