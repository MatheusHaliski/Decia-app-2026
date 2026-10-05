package br.gov.pr.secid.workstation.infrastructure.mysql.projetos.entity;

import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.CreationMode;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.projetos.ProjectCoverMode;
import br.gov.pr.secid.workstation.domain.projetos.ProjectPhase;
import br.gov.pr.secid.workstation.domain.projetos.ProjectStatus;
import br.gov.pr.secid.workstation.domain.projetos.SchemeOrigin;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code project_schemes} (ProjectScheme — 3 Criador de Projetos; RF21, RF22, RF23, RF24, RF25, RF29, RF30, RF31, RF32, RF43). Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio;
 * UUID ↔ BINARY(16) pelo mapeamento nativo do Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "project_schemes")
public class ProjectSchemeEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Column(name = "company_id", columnDefinition = "BINARY(16)")
    private UUID companyId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "emoji")
    private String emoji;

    @Column(name = "icon_id")
    private String iconId;

    @Column(name = "objective")
    private String objective;

    @Column(name = "description_md", columnDefinition = "MEDIUMTEXT")
    private String descriptionMd;

    @Column(name = "process_tags_json", columnDefinition = "JSON")
    private String processTagsJson;

    @Column(name = "nature_tags_json", columnDefinition = "JSON")
    private String natureTagsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "creation_mode", nullable = false)
    private CreationMode creationMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private SchemeOrigin origin;

    @Column(name = "original_project_id", columnDefinition = "BINARY(16)")
    private UUID originalProjectId;

    @Column(name = "source_session_id", columnDefinition = "BINARY(16)")
    private UUID sourceSessionId;

    @Column(name = "ai_orientation", columnDefinition = "TEXT")
    private String aiOrientation;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProjectStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_phase", nullable = false)
    private ProjectPhase currentPhase;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Column(name = "exercise_year")
    private Integer exerciseYear;

    @Column(name = "program_grouping_id", columnDefinition = "BINARY(16)")
    private UUID programGroupingId;

    @Column(name = "exercise_grouping_id", columnDefinition = "BINARY(16)")
    private UUID exerciseGroupingId;

    @Column(name = "management_grouping_id", columnDefinition = "BINARY(16)")
    private UUID managementGroupingId;

    @Column(name = "plan_axis_id", columnDefinition = "BINARY(16)")
    private UUID planAxisId;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_mode", nullable = false)
    private ProjectCoverMode coverMode;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "mosaic_json", columnDefinition = "JSON")
    private String mosaicJson;

    @Column(name = "desk_skin")
    private String deskSkin;

    @Column(name = "desk_background_json", columnDefinition = "JSON")
    private String deskBackgroundJson;

    @Column(name = "conformity_percent")
    private BigDecimal conformityPercent;

    @Column(name = "has_blocking_pending", nullable = false)
    private boolean hasBlockingPending;

    @Column(name = "critical_path_json", columnDefinition = "JSON")
    private String criticalPathJson;

    @Column(name = "evm_json", columnDefinition = "JSON")
    private String evmJson;

    @Column(name = "next_milestone_at")
    private LocalDate nextMilestoneAt;

    @Column(name = "last_decia_event_at")
    private Instant lastDeciaEventAt;

    @Column(name = "last_decia_event_label")
    private String lastDeciaEventLabel;

    @Column(name = "offered_in_counter", nullable = false)
    private boolean offeredInCounter;

    @Column(name = "ai_generated", nullable = false)
    private boolean aiGenerated;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "likes_count", nullable = false)
    private long likesCount;

    @Column(name = "comments_count", nullable = false)
    private long commentsCount;

    @Column(name = "saves_count", nullable = false)
    private long savesCount;

    @Column(name = "shares_count", nullable = false)
    private long sharesCount;

    @Column(name = "remixes_count", nullable = false)
    private long remixesCount;

    @Column(name = "views_count", nullable = false)
    private long viewsCount;

    @Column(name = "seal_ids_json", columnDefinition = "JSON")
    private String sealIdsJson;

    @Column(name = "autosave_draft_json", columnDefinition = "JSON")
    private String autosaveDraftJson;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public String getIconId() {
        return iconId;
    }

    public void setIconId(String iconId) {
        this.iconId = iconId;
    }

    public String getObjective() {
        return objective;
    }

    public void setObjective(String objective) {
        this.objective = objective;
    }

    public String getDescriptionMd() {
        return descriptionMd;
    }

    public void setDescriptionMd(String descriptionMd) {
        this.descriptionMd = descriptionMd;
    }

    public String getProcessTagsJson() {
        return processTagsJson;
    }

    public void setProcessTagsJson(String processTagsJson) {
        this.processTagsJson = processTagsJson;
    }

    public String getNatureTagsJson() {
        return natureTagsJson;
    }

    public void setNatureTagsJson(String natureTagsJson) {
        this.natureTagsJson = natureTagsJson;
    }

    public CreationMode getCreationMode() {
        return creationMode;
    }

    public void setCreationMode(CreationMode creationMode) {
        this.creationMode = creationMode;
    }

    public SchemeOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(SchemeOrigin origin) {
        this.origin = origin;
    }

    public UUID getOriginalProjectId() {
        return originalProjectId;
    }

    public void setOriginalProjectId(UUID originalProjectId) {
        this.originalProjectId = originalProjectId;
    }

    public UUID getSourceSessionId() {
        return sourceSessionId;
    }

    public void setSourceSessionId(UUID sourceSessionId) {
        this.sourceSessionId = sourceSessionId;
    }

    public String getAiOrientation() {
        return aiOrientation;
    }

    public void setAiOrientation(String aiOrientation) {
        this.aiOrientation = aiOrientation;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public ProjectPhase getCurrentPhase() {
        return currentPhase;
    }

    public void setCurrentPhase(ProjectPhase currentPhase) {
        this.currentPhase = currentPhase;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public Integer getExerciseYear() {
        return exerciseYear;
    }

    public void setExerciseYear(Integer exerciseYear) {
        this.exerciseYear = exerciseYear;
    }

    public UUID getProgramGroupingId() {
        return programGroupingId;
    }

    public void setProgramGroupingId(UUID programGroupingId) {
        this.programGroupingId = programGroupingId;
    }

    public UUID getExerciseGroupingId() {
        return exerciseGroupingId;
    }

    public void setExerciseGroupingId(UUID exerciseGroupingId) {
        this.exerciseGroupingId = exerciseGroupingId;
    }

    public UUID getManagementGroupingId() {
        return managementGroupingId;
    }

    public void setManagementGroupingId(UUID managementGroupingId) {
        this.managementGroupingId = managementGroupingId;
    }

    public UUID getPlanAxisId() {
        return planAxisId;
    }

    public void setPlanAxisId(UUID planAxisId) {
        this.planAxisId = planAxisId;
    }

    public ProjectCoverMode getCoverMode() {
        return coverMode;
    }

    public void setCoverMode(ProjectCoverMode coverMode) {
        this.coverMode = coverMode;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getMosaicJson() {
        return mosaicJson;
    }

    public void setMosaicJson(String mosaicJson) {
        this.mosaicJson = mosaicJson;
    }

    public String getDeskSkin() {
        return deskSkin;
    }

    public void setDeskSkin(String deskSkin) {
        this.deskSkin = deskSkin;
    }

    public String getDeskBackgroundJson() {
        return deskBackgroundJson;
    }

    public void setDeskBackgroundJson(String deskBackgroundJson) {
        this.deskBackgroundJson = deskBackgroundJson;
    }

    public BigDecimal getConformityPercent() {
        return conformityPercent;
    }

    public void setConformityPercent(BigDecimal conformityPercent) {
        this.conformityPercent = conformityPercent;
    }

    public boolean isHasBlockingPending() {
        return hasBlockingPending;
    }

    public void setHasBlockingPending(boolean hasBlockingPending) {
        this.hasBlockingPending = hasBlockingPending;
    }

    public String getCriticalPathJson() {
        return criticalPathJson;
    }

    public void setCriticalPathJson(String criticalPathJson) {
        this.criticalPathJson = criticalPathJson;
    }

    public String getEvmJson() {
        return evmJson;
    }

    public void setEvmJson(String evmJson) {
        this.evmJson = evmJson;
    }

    public LocalDate getNextMilestoneAt() {
        return nextMilestoneAt;
    }

    public void setNextMilestoneAt(LocalDate nextMilestoneAt) {
        this.nextMilestoneAt = nextMilestoneAt;
    }

    public Instant getLastDeciaEventAt() {
        return lastDeciaEventAt;
    }

    public void setLastDeciaEventAt(Instant lastDeciaEventAt) {
        this.lastDeciaEventAt = lastDeciaEventAt;
    }

    public String getLastDeciaEventLabel() {
        return lastDeciaEventLabel;
    }

    public void setLastDeciaEventLabel(String lastDeciaEventLabel) {
        this.lastDeciaEventLabel = lastDeciaEventLabel;
    }

    public boolean isOfferedInCounter() {
        return offeredInCounter;
    }

    public void setOfferedInCounter(boolean offeredInCounter) {
        this.offeredInCounter = offeredInCounter;
    }

    public boolean isAiGenerated() {
        return aiGenerated;
    }

    public void setAiGenerated(boolean aiGenerated) {
        this.aiGenerated = aiGenerated;
    }

    public UUID getAiInferenceId() {
        return aiInferenceId;
    }

    public void setAiInferenceId(UUID aiInferenceId) {
        this.aiInferenceId = aiInferenceId;
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

    public long getRemixesCount() {
        return remixesCount;
    }

    public void setRemixesCount(long remixesCount) {
        this.remixesCount = remixesCount;
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

    public String getAutosaveDraftJson() {
        return autosaveDraftJson;
    }

    public void setAutosaveDraftJson(String autosaveDraftJson) {
        this.autosaveDraftJson = autosaveDraftJson;
    }

    public long getVersion() {
        return version;
    }
}
