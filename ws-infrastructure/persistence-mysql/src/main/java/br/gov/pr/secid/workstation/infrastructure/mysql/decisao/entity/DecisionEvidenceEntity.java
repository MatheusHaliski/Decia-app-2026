package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceKind;
import br.gov.pr.secid.workstation.domain.decisao.EvidenceNature;
import br.gov.pr.secid.workstation.domain.decisao.RelevanceLevel;
import br.gov.pr.secid.workstation.domain.decisao.SourceQuality;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_evidence} (DecisionEvidence — 5b DECIA decisão estruturada; RF29, RF33, RF41). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_evidence")
public class DecisionEvidenceEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "nature", nullable = false)
    private EvidenceNature nature;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private EvidenceKind kind;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "summary", nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "source_label", nullable = false)
    private String sourceLabel;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "media_id", columnDefinition = "BINARY(16)")
    private UUID mediaId;

    @Column(name = "task_id", columnDefinition = "BINARY(16)")
    private UUID taskId;

    @Column(name = "author_label")
    private String authorLabel;

    @Column(name = "observed_at")
    private Instant observedAt;

    @Column(name = "retrieved_at")
    private Instant retrievedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_quality", nullable = false)
    private SourceQuality sourceQuality;

    @Enumerated(EnumType.STRING)
    @Column(name = "relevance", nullable = false)
    private RelevanceLevel relevance;

    @Enumerated(EnumType.STRING)
    @Column(name = "reliability", nullable = false)
    private RelevanceLevel reliability;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private ContentOrigin origin;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "added_by_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID addedByUserId;

    @Column(name = "superseded_at")
    private Instant supersededAt;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public EvidenceNature getNature() {
        return nature;
    }

    public void setNature(EvidenceNature nature) {
        this.nature = nature;
    }

    public EvidenceKind getKind() {
        return kind;
    }

    public void setKind(EvidenceKind kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getSourceLabel() {
        return sourceLabel;
    }

    public void setSourceLabel(String sourceLabel) {
        this.sourceLabel = sourceLabel;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public UUID getMediaId() {
        return mediaId;
    }

    public void setMediaId(UUID mediaId) {
        this.mediaId = mediaId;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public void setTaskId(UUID taskId) {
        this.taskId = taskId;
    }

    public String getAuthorLabel() {
        return authorLabel;
    }

    public void setAuthorLabel(String authorLabel) {
        this.authorLabel = authorLabel;
    }

    public Instant getObservedAt() {
        return observedAt;
    }

    public void setObservedAt(Instant observedAt) {
        this.observedAt = observedAt;
    }

    public Instant getRetrievedAt() {
        return retrievedAt;
    }

    public void setRetrievedAt(Instant retrievedAt) {
        this.retrievedAt = retrievedAt;
    }

    public SourceQuality getSourceQuality() {
        return sourceQuality;
    }

    public void setSourceQuality(SourceQuality sourceQuality) {
        this.sourceQuality = sourceQuality;
    }

    public RelevanceLevel getRelevance() {
        return relevance;
    }

    public void setRelevance(RelevanceLevel relevance) {
        this.relevance = relevance;
    }

    public RelevanceLevel getReliability() {
        return reliability;
    }

    public void setReliability(RelevanceLevel reliability) {
        this.reliability = reliability;
    }

    public ContentOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(ContentOrigin origin) {
        this.origin = origin;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public UUID getAddedByUserId() {
        return addedByUserId;
    }

    public void setAddedByUserId(UUID addedByUserId) {
        this.addedByUserId = addedByUserId;
    }

    public Instant getSupersededAt() {
        return supersededAt;
    }

    public void setSupersededAt(Instant supersededAt) {
        this.supersededAt = supersededAt;
    }
}
