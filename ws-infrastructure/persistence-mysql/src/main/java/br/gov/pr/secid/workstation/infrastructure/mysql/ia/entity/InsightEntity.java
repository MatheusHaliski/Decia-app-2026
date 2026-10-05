package br.gov.pr.secid.workstation.infrastructure.mysql.ia.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.ia.InsightScope;
import br.gov.pr.secid.workstation.domain.ia.InsightSeverity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code insights} (Insight — 10 IA do sistema; RF43, RF19, RF21). Gerada pelo SchemaGenerator a partir do
 * domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String;
 * JSON como String.
 */
@Entity
@Table(name = "insights")
public class InsightEntity extends AuditableEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private InsightScope scope;

    @Column(name = "scope_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID scopeId;

    @Column(name = "kind", nullable = false)
    private String kind;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "body_md", nullable = false, columnDefinition = "TEXT")
    private String bodyMd;

    @Column(name = "metric_refs_json", columnDefinition = "JSON")
    private String metricRefsJson;

    @Column(name = "actions_json", columnDefinition = "JSON")
    private String actionsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false)
    private InsightSeverity severity;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "dismissed_at")
    private Instant dismissedAt;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    public InsightScope getScope() {
        return scope;
    }

    public void setScope(InsightScope scope) {
        this.scope = scope;
    }

    public UUID getScopeId() {
        return scopeId;
    }

    public void setScopeId(UUID scopeId) {
        this.scopeId = scopeId;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBodyMd() {
        return bodyMd;
    }

    public void setBodyMd(String bodyMd) {
        this.bodyMd = bodyMd;
    }

    public String getMetricRefsJson() {
        return metricRefsJson;
    }

    public void setMetricRefsJson(String metricRefsJson) {
        this.metricRefsJson = metricRefsJson;
    }

    public String getActionsJson() {
        return actionsJson;
    }

    public void setActionsJson(String actionsJson) {
        this.actionsJson = actionsJson;
    }

    public InsightSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(InsightSeverity severity) {
        this.severity = severity;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
    }

    public Instant getDismissedAt() {
        return dismissedAt;
    }

    public void setDismissedAt(Instant dismissedAt) {
        this.dismissedAt = dismissedAt;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }
}
