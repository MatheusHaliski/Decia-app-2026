package br.gov.pr.secid.workstation.infrastructure.mysql.decia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decia.AiQuestionKind;
import br.gov.pr.secid.workstation.domain.decia.AiQuestionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code ai_questions} (AiQuestion — 5 DECIA sessão; RF8, RF16, RF33, RF42). Gerada pelo SchemaGenerator a
 * partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como
 * String; JSON como String.
 */
@Entity
@Table(name = "ai_questions")
public class AiQuestionEntity extends AuditableEntity {

    @Column(name = "session_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private AiQuestionKind kind;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "basis_message_ids_json")
    private String basisMessageIdsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AiQuestionStatus status;

    @Column(name = "answered_by_message_id", columnDefinition = "BINARY(16)")
    private UUID answeredByMessageId;

    @Column(name = "answered_with_evidence", nullable = false)
    private boolean answeredWithEvidence;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "citations_json", columnDefinition = "JSON")
    private String citationsJson;

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public AiQuestionKind getKind() {
        return kind;
    }

    public void setKind(AiQuestionKind kind) {
        this.kind = kind;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getBasisMessageIdsJson() {
        return basisMessageIdsJson;
    }

    public void setBasisMessageIdsJson(String basisMessageIdsJson) {
        this.basisMessageIdsJson = basisMessageIdsJson;
    }

    public AiQuestionStatus getStatus() {
        return status;
    }

    public void setStatus(AiQuestionStatus status) {
        this.status = status;
    }

    public UUID getAnsweredByMessageId() {
        return answeredByMessageId;
    }

    public void setAnsweredByMessageId(UUID answeredByMessageId) {
        this.answeredByMessageId = answeredByMessageId;
    }

    public boolean isAnsweredWithEvidence() {
        return answeredWithEvidence;
    }

    public void setAnsweredWithEvidence(boolean answeredWithEvidence) {
        this.answeredWithEvidence = answeredWithEvidence;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public String getCitationsJson() {
        return citationsJson;
    }

    public void setCitationsJson(String citationsJson) {
        this.citationsJson = citationsJson;
    }
}
