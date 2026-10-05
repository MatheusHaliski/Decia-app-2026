package br.gov.pr.secid.workstation.infrastructure.mysql.planejamento.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.planejamento.PlanScope;
import br.gov.pr.secid.workstation.domain.planejamento.PlanStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

/**
 * Entidade JPA de {@code annual_plans} (AnnualPlan — 4 Planejamento institucional; RF24, RF11, RF21, RF39, RF44). Gerada
 * pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate
 * para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "annual_plans")
public class AnnualPlanEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false)
    private PlanScope scope;

    @Column(name = "company_id", columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "exercise_year", nullable = false)
    private int exerciseYear;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "identity_phrase")
    private String identityPhrase;

    @Column(name = "derived_from_plan_id", columnDefinition = "BINARY(16)")
    private UUID derivedFromPlanId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PlanStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "background_json", columnDefinition = "JSON")
    private String backgroundJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "creation_mode", nullable = false)
    private CreationMode creationMode;

    @Column(name = "ai_explanation_json", columnDefinition = "JSON")
    private String aiExplanationJson;

    @Column(name = "likes_count", nullable = false)
    private long likesCount;

    @Column(name = "comments_count", nullable = false)
    private long commentsCount;

    @Column(name = "saves_count", nullable = false)
    private long savesCount;

    @Column(name = "shares_count", nullable = false)
    private long sharesCount;

    @Column(name = "views_count", nullable = false)
    private long viewsCount;

    @Column(name = "seal_ids_json", columnDefinition = "JSON")
    private String sealIdsJson;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public PlanScope getScope() {
        return scope;
    }

    public void setScope(PlanScope scope) {
        this.scope = scope;
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

    public int getExerciseYear() {
        return exerciseYear;
    }

    public void setExerciseYear(int exerciseYear) {
        this.exerciseYear = exerciseYear;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getIdentityPhrase() {
        return identityPhrase;
    }

    public void setIdentityPhrase(String identityPhrase) {
        this.identityPhrase = identityPhrase;
    }

    public UUID getDerivedFromPlanId() {
        return derivedFromPlanId;
    }

    public void setDerivedFromPlanId(UUID derivedFromPlanId) {
        this.derivedFromPlanId = derivedFromPlanId;
    }

    public PlanStatus getStatus() {
        return status;
    }

    public void setStatus(PlanStatus status) {
        this.status = status;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getBackgroundJson() {
        return backgroundJson;
    }

    public void setBackgroundJson(String backgroundJson) {
        this.backgroundJson = backgroundJson;
    }

    public CreationMode getCreationMode() {
        return creationMode;
    }

    public void setCreationMode(CreationMode creationMode) {
        this.creationMode = creationMode;
    }

    public String getAiExplanationJson() {
        return aiExplanationJson;
    }

    public void setAiExplanationJson(String aiExplanationJson) {
        this.aiExplanationJson = aiExplanationJson;
    }

    public long getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(long likesCount) {
        this.likesCount = likesCount;
    }

    public long getCommentsCount() {
        return commentsCount;
    }

    public void setCommentsCount(long commentsCount) {
        this.commentsCount = commentsCount;
    }

    public long getSavesCount() {
        return savesCount;
    }

    public void setSavesCount(long savesCount) {
        this.savesCount = savesCount;
    }

    public long getSharesCount() {
        return sharesCount;
    }

    public void setSharesCount(long sharesCount) {
        this.sharesCount = sharesCount;
    }

    public long getViewsCount() {
        return viewsCount;
    }

    public void setViewsCount(long viewsCount) {
        this.viewsCount = viewsCount;
    }

    public String getSealIdsJson() {
        return sealIdsJson;
    }

    public void setSealIdsJson(String sealIdsJson) {
        this.sealIdsJson = sealIdsJson;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public long getVersion() {
        return version;
    }
}
