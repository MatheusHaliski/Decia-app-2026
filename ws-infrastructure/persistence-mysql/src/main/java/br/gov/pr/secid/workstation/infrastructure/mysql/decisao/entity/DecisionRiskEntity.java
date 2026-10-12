package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.decisao.ContentOrigin;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.Likelihood;
import br.gov.pr.secid.workstation.domain.decisao.RiskSource;
import br.gov.pr.secid.workstation.domain.decisao.RiskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Entidade JPA de {@code decision_risks} (DecisionRisk — 5b DECIA decisão estruturada; RF29, RF43). Gerada pelo
 * SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para
 * MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decision_risks")
public class DecisionRiskEntity extends AuditableEntity {

    @Column(name = "decision_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID decisionId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "alternative_id", columnDefinition = "BINARY(16)")
    private UUID alternativeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "likelihood", nullable = false)
    private Likelihood likelihood;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact", nullable = false)
    private DecisionLevel impact;

    @Column(name = "mitigation", columnDefinition = "TEXT")
    private String mitigation;

    @Column(name = "owner_user_id", columnDefinition = "BINARY(16)")
    private UUID ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false)
    private RiskSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RiskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private ContentOrigin origin;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    public UUID getDecisionId() {
        return decisionId;
    }

    public void setDecisionId(UUID decisionId) {
        this.decisionId = decisionId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public UUID getAlternativeId() {
        return alternativeId;
    }

    public void setAlternativeId(UUID alternativeId) {
        this.alternativeId = alternativeId;
    }

    public Likelihood getLikelihood() {
        return likelihood;
    }

    public void setLikelihood(Likelihood likelihood) {
        this.likelihood = likelihood;
    }

    public DecisionLevel getImpact() {
        return impact;
    }

    public void setImpact(DecisionLevel impact) {
        this.impact = impact;
    }

    public String getMitigation() {
        return mitigation;
    }

    public void setMitigation(String mitigation) {
        this.mitigation = mitigation;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public RiskSource getSource() {
        return source;
    }

    public void setSource(RiskSource source) {
        this.source = source;
    }

    public RiskStatus getStatus() {
        return status;
    }

    public void setStatus(RiskStatus status) {
        this.status = status;
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
}
