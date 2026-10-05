package br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity;

import br.gov.pr.secid.workstation.domain.acervo.CoverMode;
import br.gov.pr.secid.workstation.domain.acervo.DocSituation;
import br.gov.pr.secid.workstation.domain.acervo.EffortSize;
import br.gov.pr.secid.workstation.domain.acervo.LinkMode;
import br.gov.pr.secid.workstation.domain.acervo.SourceKind;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskOrigin;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.AuditableEntity;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entidade JPA de {@code tasks} (TaskItem — 2 Acervo de Tarefas; RF20, RF41, RF21, RF22, RF23, RF29, RF34, RF40, RF44).
 * Gerada pelo SchemaGenerator a partir do domínio: sem lógica de negócio; UUID ↔ BINARY(16) pelo mapeamento nativo do
 * Hibernate para MySQL; enums como String; JSON como String.
 */
@Entity
@Table(name = "tasks")
public class TaskItemEntity extends AuditableEntity {

    @Column(name = "owner_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID ownerId;

    @Column(name = "department_id", columnDefinition = "BINARY(16)")
    private UUID departmentId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "description_md", columnDefinition = "MEDIUMTEXT")
    private String descriptionMd;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TaskType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private TaskCategory category;

    @Column(name = "subcategory")
    private String subcategory;

    @Column(name = "process_tags_json", columnDefinition = "JSON")
    private String processTagsJson;

    @Column(name = "nature_tags_json", columnDefinition = "JSON")
    private String natureTagsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_class", nullable = false)
    private AccessClassification accessClass;

    @Column(name = "format")
    private String format;

    @Enumerated(EnumType.STRING)
    @Column(name = "effort_size")
    private EffortSize effortSize;

    @Column(name = "estimated_hours")
    private BigDecimal estimatedHours;

    @Column(name = "amount_involved", nullable = false)
    private BigDecimal amountInvolved;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false)
    private TaskOrigin origin;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_kind", nullable = false)
    private SourceKind sourceKind;

    @Column(name = "source_ref")
    private String sourceRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "link_mode")
    private LinkMode linkMode;

    @Column(name = "org_entity_id", columnDefinition = "BINARY(16)")
    private UUID orgEntityId;

    @Column(name = "responsible_id", columnDefinition = "BINARY(16)")
    private UUID responsibleId;

    @Column(name = "due_at")
    private LocalDate dueAt;

    @Column(name = "legal_deadline_rule_id", columnDefinition = "BINARY(16)")
    private UUID legalDeadlineRuleId;

    @Column(name = "legal_deadline_base_date")
    private LocalDate legalDeadlineBaseDate;

    @Column(name = "legal_due_at")
    private LocalDate legalDueAt;

    @Column(name = "legal_override_reason")
    private String legalOverrideReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false)
    private TaskState state;

    @Column(name = "blocked_by_task_id", columnDefinition = "BINARY(16)")
    private UUID blockedByTaskId;

    @Column(name = "blocked_by_user_id", columnDefinition = "BINARY(16)")
    private UUID blockedByUserId;

    @Column(name = "block_reason")
    private String blockReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_situation")
    private DocSituation docSituation;

    @Column(name = "received_at")
    private LocalDate receivedAt;

    @Column(name = "sender_origin")
    private String senderOrigin;

    @Column(name = "protocol_number")
    private String protocolNumber;

    @Column(name = "retention_policy_json", columnDefinition = "JSON")
    private String retentionPolicyJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Column(name = "favorite", nullable = false)
    private boolean favorite;

    @Column(name = "offered_in_counter", nullable = false)
    private boolean offeredInCounter;

    @Column(name = "ai_generated", nullable = false)
    private boolean aiGenerated;

    @Column(name = "ai_inference_id", columnDefinition = "BINARY(16)")
    private UUID aiInferenceId;

    @Column(name = "ai_confidence_json", columnDefinition = "JSON")
    private String aiConfidenceJson;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "cover_url")
    private String coverUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "cover_mode", nullable = false)
    private CoverMode coverMode;

    @Column(name = "card_skin")
    private String cardSkin;

    @Column(name = "tags_json", columnDefinition = "JSON")
    private String tagsJson;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "original_task_id", columnDefinition = "BINARY(16)")
    private UUID originalTaskId;

    @Column(name = "source_project_id", columnDefinition = "BINARY(16)")
    private UUID sourceProjectId;

    @Column(name = "checklist_item_id", columnDefinition = "BINARY(16)")
    private UUID checklistItemId;

    @Column(name = "reuse_count", nullable = false)
    private int reuseCount;

    @Column(name = "project_usage_count", nullable = false)
    private int projectUsageCount;

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

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
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

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getDescriptionMd() {
        return descriptionMd;
    }

    public void setDescriptionMd(String descriptionMd) {
        this.descriptionMd = descriptionMd;
    }

    public TaskType getType() {
        return type;
    }

    public void setType(TaskType type) {
        this.type = type;
    }

    public TaskCategory getCategory() {
        return category;
    }

    public void setCategory(TaskCategory category) {
        this.category = category;
    }

    public String getSubcategory() {
        return subcategory;
    }

    public void setSubcategory(String subcategory) {
        this.subcategory = subcategory;
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

    public AccessClassification getAccessClass() {
        return accessClass;
    }

    public void setAccessClass(AccessClassification accessClass) {
        this.accessClass = accessClass;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public EffortSize getEffortSize() {
        return effortSize;
    }

    public void setEffortSize(EffortSize effortSize) {
        this.effortSize = effortSize;
    }

    public BigDecimal getEstimatedHours() {
        return estimatedHours;
    }

    public void setEstimatedHours(BigDecimal estimatedHours) {
        this.estimatedHours = estimatedHours;
    }

    public BigDecimal getAmountInvolved() {
        return amountInvolved;
    }

    public void setAmountInvolved(BigDecimal amountInvolved) {
        this.amountInvolved = amountInvolved;
    }

    public TaskOrigin getOrigin() {
        return origin;
    }

    public void setOrigin(TaskOrigin origin) {
        this.origin = origin;
    }

    public SourceKind getSourceKind() {
        return sourceKind;
    }

    public void setSourceKind(SourceKind sourceKind) {
        this.sourceKind = sourceKind;
    }

    public String getSourceRef() {
        return sourceRef;
    }

    public void setSourceRef(String sourceRef) {
        this.sourceRef = sourceRef;
    }

    public LinkMode getLinkMode() {
        return linkMode;
    }

    public void setLinkMode(LinkMode linkMode) {
        this.linkMode = linkMode;
    }

    public UUID getOrgEntityId() {
        return orgEntityId;
    }

    public void setOrgEntityId(UUID orgEntityId) {
        this.orgEntityId = orgEntityId;
    }

    public UUID getResponsibleId() {
        return responsibleId;
    }

    public void setResponsibleId(UUID responsibleId) {
        this.responsibleId = responsibleId;
    }

    public LocalDate getDueAt() {
        return dueAt;
    }

    public void setDueAt(LocalDate dueAt) {
        this.dueAt = dueAt;
    }

    public UUID getLegalDeadlineRuleId() {
        return legalDeadlineRuleId;
    }

    public void setLegalDeadlineRuleId(UUID legalDeadlineRuleId) {
        this.legalDeadlineRuleId = legalDeadlineRuleId;
    }

    public LocalDate getLegalDeadlineBaseDate() {
        return legalDeadlineBaseDate;
    }

    public void setLegalDeadlineBaseDate(LocalDate legalDeadlineBaseDate) {
        this.legalDeadlineBaseDate = legalDeadlineBaseDate;
    }

    public LocalDate getLegalDueAt() {
        return legalDueAt;
    }

    public void setLegalDueAt(LocalDate legalDueAt) {
        this.legalDueAt = legalDueAt;
    }

    public String getLegalOverrideReason() {
        return legalOverrideReason;
    }

    public void setLegalOverrideReason(String legalOverrideReason) {
        this.legalOverrideReason = legalOverrideReason;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public TaskState getState() {
        return state;
    }

    public void setState(TaskState state) {
        this.state = state;
    }

    public UUID getBlockedByTaskId() {
        return blockedByTaskId;
    }

    public void setBlockedByTaskId(UUID blockedByTaskId) {
        this.blockedByTaskId = blockedByTaskId;
    }

    public UUID getBlockedByUserId() {
        return blockedByUserId;
    }

    public void setBlockedByUserId(UUID blockedByUserId) {
        this.blockedByUserId = blockedByUserId;
    }

    public String getBlockReason() {
        return blockReason;
    }

    public void setBlockReason(String blockReason) {
        this.blockReason = blockReason;
    }

    public DocSituation getDocSituation() {
        return docSituation;
    }

    public void setDocSituation(DocSituation docSituation) {
        this.docSituation = docSituation;
    }

    public LocalDate getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(LocalDate receivedAt) {
        this.receivedAt = receivedAt;
    }

    public String getSenderOrigin() {
        return senderOrigin;
    }

    public void setSenderOrigin(String senderOrigin) {
        this.senderOrigin = senderOrigin;
    }

    public String getProtocolNumber() {
        return protocolNumber;
    }

    public void setProtocolNumber(String protocolNumber) {
        this.protocolNumber = protocolNumber;
    }

    public String getRetentionPolicyJson() {
        return retentionPolicyJson;
    }

    public void setRetentionPolicyJson(String retentionPolicyJson) {
        this.retentionPolicyJson = retentionPolicyJson;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
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

    public String getAiConfidenceJson() {
        return aiConfidenceJson;
    }

    public void setAiConfidenceJson(String aiConfidenceJson) {
        this.aiConfidenceJson = aiConfidenceJson;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public CoverMode getCoverMode() {
        return coverMode;
    }

    public void setCoverMode(CoverMode coverMode) {
        this.coverMode = coverMode;
    }

    public String getCardSkin() {
        return cardSkin;
    }

    public void setCardSkin(String cardSkin) {
        this.cardSkin = cardSkin;
    }

    public String getTagsJson() {
        return tagsJson;
    }

    public void setTagsJson(String tagsJson) {
        this.tagsJson = tagsJson;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public UUID getOriginalTaskId() {
        return originalTaskId;
    }

    public void setOriginalTaskId(UUID originalTaskId) {
        this.originalTaskId = originalTaskId;
    }

    public UUID getSourceProjectId() {
        return sourceProjectId;
    }

    public void setSourceProjectId(UUID sourceProjectId) {
        this.sourceProjectId = sourceProjectId;
    }

    public UUID getChecklistItemId() {
        return checklistItemId;
    }

    public void setChecklistItemId(UUID checklistItemId) {
        this.checklistItemId = checklistItemId;
    }

    public int getReuseCount() {
        return reuseCount;
    }

    public void setReuseCount(int reuseCount) {
        this.reuseCount = reuseCount;
    }

    public int getProjectUsageCount() {
        return projectUsageCount;
    }

    public void setProjectUsageCount(int projectUsageCount) {
        this.projectUsageCount = projectUsageCount;
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

    public long getVersion() {
        return version;
    }
}
