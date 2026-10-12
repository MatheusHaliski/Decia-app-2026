package br.gov.pr.secid.workstation.infrastructure.mysql.decisao.entity;

import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.decisao.DecisionComplexity;
import br.gov.pr.secid.workstation.domain.decisao.DecisionKind;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLevel;
import br.gov.pr.secid.workstation.domain.decisao.DecisionLifecycle;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code decisions} (Decision — 5b DECIA decisão estruturada; RF29, RF12, RF15, RF31, RF33, RF43). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "decisions")
public class DecisionEntity extends AuditableEntity {

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "question", nullable = false)
    private String question;

    @Column(name = "context_md", columnDefinition = "TEXT")
    private String contextMd;

    @Column(name = "objective")
    private String objective;

    @Column(name = "constraints_md", columnDefinition = "TEXT")
    private String constraintsMd;

    @Column(name = "scope")
    private String scope;

    @Column(name = "stakeholders_json", columnDefinition = "JSON")
    private String stakeholdersJson;

    @Column(name = "resources_md", columnDefinition = "TEXT")
    private String resourcesMd;

    @Column(name = "dependencies_md", columnDefinition = "TEXT")
    private String dependenciesMd;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "owner_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerUserId;

    @Column(name = "created_by_user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID createdByUserId;

    @Column(name = "company_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "session_id", columnDefinition = "BINARY(16)")
    private UUID sessionId;

    @Column(name = "project_id", columnDefinition = "BINARY(16)")
    private UUID projectId;

    @Column(name = "final_decision_id", columnDefinition = "BINARY(16)")
    private UUID finalDecisionId;

    @Column(name = "supersedes_decision_id", columnDefinition = "BINARY(16)")
    private UUID supersedesDecisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DecisionLifecycle status;

    @Enumerated(EnumType.STRING)
    @Column(name = "complexity", nullable = false)
    private DecisionComplexity complexity;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private DecisionKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact", nullable = false)
    private DecisionLevel impact;

    @Enumerated(EnumType.STRING)
    @Column(name = "urgency", nullable = false)
    private DecisionLevel urgency;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_class", nullable = false)
    private AccessClassification accessClass;

    @Column(name = "weighting_enabled", nullable = false)
    private boolean weightingEnabled;

    @Column(name = "independent_scoring", nullable = false)
    private boolean independentScoring;

    @Column(name = "template_key")
    private String templateKey;

    @Column(name = "selected_alternative_id", columnDefinition = "BINARY(16)")
    private UUID selectedAlternativeId;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decision_confidence_pct")
    private Integer decisionConfidencePct;

    @Column(name = "rationale", columnDefinition = "TEXT")
    private String rationale;

    @Column(name = "review_every_days")
    private Integer reviewEveryDays;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getContextMd() {
        return contextMd;
    }

    public void setContextMd(String contextMd) {
        this.contextMd = contextMd;
    }

    public String getObjective() {
        return objective;
    }

    public void setObjective(String objective) {
        this.objective = objective;
    }

    public String getConstraintsMd() {
        return constraintsMd;
    }

    public void setConstraintsMd(String constraintsMd) {
        this.constraintsMd = constraintsMd;
    }

    public String getScope() {
        return scope;
    }

    public void setScope(String scope) {
        this.scope = scope;
    }

    public String getStakeholdersJson() {
        return stakeholdersJson;
    }

    public void setStakeholdersJson(String stakeholdersJson) {
        this.stakeholdersJson = stakeholdersJson;
    }

    public String getResourcesMd() {
        return resourcesMd;
    }

    public void setResourcesMd(String resourcesMd) {
        this.resourcesMd = resourcesMd;
    }

    public String getDependenciesMd() {
        return dependenciesMd;
    }

    public void setDependenciesMd(String dependenciesMd) {
        this.dependenciesMd = dependenciesMd;
    }

    public LocalDate getTargetDate() {
        return targetDate;
    }

    public void setTargetDate(LocalDate targetDate) {
        this.targetDate = targetDate;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
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

    public UUID getFinalDecisionId() {
        return finalDecisionId;
    }

    public void setFinalDecisionId(UUID finalDecisionId) {
        this.finalDecisionId = finalDecisionId;
    }

    public UUID getSupersedesDecisionId() {
        return supersedesDecisionId;
    }

    public void setSupersedesDecisionId(UUID supersedesDecisionId) {
        this.supersedesDecisionId = supersedesDecisionId;
    }

    public DecisionLifecycle getStatus() {
        return status;
    }

    public void setStatus(DecisionLifecycle status) {
        this.status = status;
    }

    public DecisionComplexity getComplexity() {
        return complexity;
    }

    public void setComplexity(DecisionComplexity complexity) {
        this.complexity = complexity;
    }

    public DecisionKind getKind() {
        return kind;
    }

    public void setKind(DecisionKind kind) {
        this.kind = kind;
    }

    public DecisionLevel getImpact() {
        return impact;
    }

    public void setImpact(DecisionLevel impact) {
        this.impact = impact;
    }

    public DecisionLevel getUrgency() {
        return urgency;
    }

    public void setUrgency(DecisionLevel urgency) {
        this.urgency = urgency;
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

    public boolean isWeightingEnabled() {
        return weightingEnabled;
    }

    public void setWeightingEnabled(boolean weightingEnabled) {
        this.weightingEnabled = weightingEnabled;
    }

    public boolean isIndependentScoring() {
        return independentScoring;
    }

    public void setIndependentScoring(boolean independentScoring) {
        this.independentScoring = independentScoring;
    }

    public String getTemplateKey() {
        return templateKey;
    }

    public void setTemplateKey(String templateKey) {
        this.templateKey = templateKey;
    }

    public UUID getSelectedAlternativeId() {
        return selectedAlternativeId;
    }

    public void setSelectedAlternativeId(UUID selectedAlternativeId) {
        this.selectedAlternativeId = selectedAlternativeId;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }

    public Integer getDecisionConfidencePct() {
        return decisionConfidencePct;
    }

    public void setDecisionConfidencePct(Integer decisionConfidencePct) {
        this.decisionConfidencePct = decisionConfidencePct;
    }

    public String getRationale() {
        return rationale;
    }

    public void setRationale(String rationale) {
        this.rationale = rationale;
    }

    public Integer getReviewEveryDays() {
        return reviewEveryDays;
    }

    public void setReviewEveryDays(Integer reviewEveryDays) {
        this.reviewEveryDays = reviewEveryDays;
    }

    public long getVersion() {
        return version;
    }
}
