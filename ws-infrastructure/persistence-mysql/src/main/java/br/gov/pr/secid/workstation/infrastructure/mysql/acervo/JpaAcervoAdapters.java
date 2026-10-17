package br.gov.pr.secid.workstation.infrastructure.mysql.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.domain.acervo.NatureTag;
import br.gov.pr.secid.workstation.domain.acervo.ProcessTag;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskBriefEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskItemEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.entity.TaskStateLogEntity;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository.TaskBriefRepository;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository.TaskItemRepository;
import br.gov.pr.secid.workstation.infrastructure.mysql.acervo.repository.TaskStateLogRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Adaptador JPA da {@link TaskRepositoryPort} (tasks + task_briefs + task_state_log). O id da tarefa é gerado pelo banco
 * ({@code AuditableEntity}); o briefing usa o mesmo id como PK. Toda atualização força o incremento imediato da versão da tarefa
 * ({@code PESSIMISTIC_FORCE_INCREMENT}: o OPTIMISTIC só sobe no commit e a versão devolvida ao cliente ficaria defasada), para que
 * editar só o briefing também invalide uma cópia antiga em outra aba (409 EDICAO_CONCORRENTE).
 */
@Configuration
public class JpaAcervoAdapters {
    private static final ObjectMapper JSON = JsonMapper.builder().build();

    @Bean
    TaskRepositoryPort taskRepositoryPort(TaskItemRepository items, TaskBriefRepository briefs, TaskStateLogRepository logs, EntityManager em,
                                          Clock clock) {
        return new TaskRepositoryPort() {
            @Override
            public Optional<StoredTask> findById(UUID id) {
                return items.findById(id).map(e -> stored(e, briefs.findById(id).orElse(null)));
            }

            @Override
            public List<StoredTask> findByOwner(UUID ownerId, int limit) {
                List<TaskItemEntity> found = em.createQuery(
                                "select t from TaskItemEntity t where t.ownerId = :owner order by t.createdAt desc", TaskItemEntity.class)
                        .setParameter("owner", ownerId).setMaxResults(limit).getResultList();
                Map<UUID, TaskBriefEntity> byTask = briefs.findAllById(found.stream().map(TaskItemEntity::getId).toList()).stream()
                        .collect(Collectors.toMap(TaskBriefEntity::getTaskId, Function.identity()));
                return found.stream().map(e -> stored(e, byTask.get(e.getId()))).toList();
            }

            @Override
            @Transactional
            public StoredTask insert(TaskItem task, TaskBrief brief) {
                TaskItemEntity entity = new TaskItemEntity();
                apply(entity, task);
                TaskItemEntity saved = items.saveAndFlush(entity);
                TaskBriefEntity b = new TaskBriefEntity();
                b.setTaskId(saved.getId());
                b.setCreatedAt(clock.instant());
                apply(b, brief);
                b.setUpdatedAt(clock.instant());
                return stored(saved, briefs.saveAndFlush(b));
            }

            @Override
            @Transactional
            public StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion) {
                TaskItemEntity entity = items.findById(task.id()).orElseThrow();
                if (entity.getVersion() != expectedVersion) {
                    throw new ObjectOptimisticLockingFailureException(TaskItemEntity.class, task.id());
                }
                apply(entity, task);
                em.lock(entity, LockModeType.PESSIMISTIC_FORCE_INCREMENT);
                TaskBriefEntity b = briefs.findById(task.id()).orElseGet(() -> {
                    TaskBriefEntity n = new TaskBriefEntity();
                    n.setTaskId(task.id());
                    n.setCreatedAt(clock.instant());
                    return n;
                });
                apply(b, brief);
                b.setUpdatedAt(clock.instant());
                TaskBriefEntity savedBrief = briefs.save(b);
                TaskItemEntity saved = items.saveAndFlush(entity);
                return stored(saved, savedBrief);
            }

            @Override
            @Transactional
            public void appendStateLog(TaskStateLog log) {
                TaskStateLogEntity e = new TaskStateLogEntity();
                e.setId(log.id());
                e.setTaskId(log.taskId());
                e.setFromState(log.fromState());
                e.setToState(log.toState());
                e.setActorId(log.actorId());
                e.setReason(log.reason());
                e.setProjectId(log.projectId());
                e.setCorrelationId(log.correlationId());
                e.setAt(log.at());
                logs.save(e);
            }
        };
    }

    private static StoredTask stored(TaskItemEntity e, TaskBriefEntity b) {
        return new StoredTask(toDomain(e), b == null ? null : toDomain(b), e.getVersion(), e.getCreatedAt(), e.getUpdatedAt());
    }

    private static void apply(TaskBriefEntity b, TaskBrief brief) {
        TaskBrief src = brief == null ? TaskBrief.empty(b.getTaskId()) : brief;
        b.setObjective(src.objective());
        b.setArea(src.area());
        b.setDeliverablesJson(src.deliverablesJson());
        b.setAcceptanceCriteriaJson(src.acceptanceCriteriaJson());
        b.setReferencesJson(src.referencesJson());
        b.setExtensionsJson(src.extensionsJson());
    }

    private static TaskBrief toDomain(TaskBriefEntity b) {
        return new TaskBrief(b.getTaskId(), b.getObjective(), b.getArea(), b.getDeliverablesJson(), b.getAcceptanceCriteriaJson(),
                b.getReferencesJson(), b.getExtensionsJson());
    }

    static void apply(TaskItemEntity e, TaskItem t) {
        e.setOwnerId(t.ownerId());
        e.setDepartmentId(t.departmentId());
        e.setTitle(t.title());
        e.setSummary(t.summary());
        e.setDescriptionMd(t.descriptionMd());
        e.setType(t.type());
        e.setCategory(t.category());
        e.setSubcategory(t.subcategory());
        e.setProcessTagsJson(writeSet(t.processTags()));
        e.setNatureTagsJson(writeSet(t.natureTags()));
        e.setAccessClass(t.accessClass());
        e.setFormat(t.format());
        e.setEffortSize(t.effortSize());
        e.setEstimatedHours(t.estimatedHours());
        e.setAmountInvolved(t.amountInvolved());
        e.setOrigin(t.origin());
        e.setSourceKind(t.sourceKind());
        e.setSourceRef(t.sourceRef());
        e.setLinkMode(t.linkMode());
        e.setOrgEntityId(t.orgEntityId());
        e.setResponsibleId(t.responsibleId());
        e.setDueAt(t.dueAt());
        e.setLegalDeadlineRuleId(t.legalDeadlineRuleId());
        e.setLegalDeadlineBaseDate(t.legalDeadlineBaseDate());
        e.setLegalDueAt(t.legalDueAt());
        e.setLegalOverrideReason(t.legalOverrideReason());
        e.setPriority(t.priority());
        e.setState(t.state());
        e.setBlockedByTaskId(t.blockedByTaskId());
        e.setBlockedByUserId(t.blockedByUserId());
        e.setBlockReason(t.blockReason());
        e.setDocSituation(t.docSituation());
        e.setReceivedAt(t.receivedAt());
        e.setSenderOrigin(t.senderOrigin());
        e.setProtocolNumber(t.protocolNumber());
        e.setRetentionPolicyJson(t.retentionPolicyJson());
        e.setVisibility(t.visibility());
        e.setFavorite(t.favorite());
        e.setOfferedInCounter(t.offeredInCounter());
        e.setAiGenerated(t.aiGenerated());
        e.setAiInferenceId(t.aiInferenceId());
        e.setAiConfidenceJson(t.aiConfidenceJson());
        e.setThumbnailUrl(t.thumbnailUrl());
        e.setCoverUrl(t.coverUrl());
        e.setCoverMode(t.coverMode());
        e.setCardSkin(t.cardSkin());
        e.setTagsJson(writeSet(t.tags()));
        e.setNotes(t.notes());
        e.setOriginalTaskId(t.originalTaskId());
        e.setSourceProjectId(t.sourceProjectId());
        e.setChecklistItemId(t.checklistItemId());
        e.setReuseCount(t.reuseCount());
        e.setProjectUsageCount(t.projectUsageCount());
        e.setLikesCount(t.likesCount());
        e.setCommentsCount(t.commentsCount());
        e.setSavesCount(t.savesCount());
        e.setSharesCount(t.sharesCount());
        e.setRemixesCount(t.remixesCount());
        e.setViewsCount(t.viewsCount());
        e.setSealIdsJson(t.sealIdsJson());
    }

    static TaskItem toDomain(TaskItemEntity e) {
        return new TaskItem(e.getId(), e.getOwnerId(), e.getDepartmentId(), e.getTitle(), e.getSummary(), e.getDescriptionMd(), e.getType(),
                e.getCategory(), e.getSubcategory(), readSet(e.getProcessTagsJson(), new TypeReference<Set<ProcessTag>>() { }),
                readSet(e.getNatureTagsJson(), new TypeReference<Set<NatureTag>>() { }), e.getAccessClass(), e.getFormat(), e.getEffortSize(),
                e.getEstimatedHours(), e.getAmountInvolved(), e.getOrigin(), e.getSourceKind(), e.getSourceRef(), e.getLinkMode(),
                e.getOrgEntityId(), e.getResponsibleId(), e.getDueAt(), e.getLegalDeadlineRuleId(), e.getLegalDeadlineBaseDate(),
                e.getLegalDueAt(), e.getLegalOverrideReason(), e.getPriority(), e.getState(), e.getBlockedByTaskId(), e.getBlockedByUserId(),
                e.getBlockReason(), e.getDocSituation(), e.getReceivedAt(), e.getSenderOrigin(), e.getProtocolNumber(), e.getRetentionPolicyJson(),
                e.getVisibility(), e.isFavorite(), e.isOfferedInCounter(), e.isAiGenerated(), e.getAiInferenceId(), e.getAiConfidenceJson(),
                e.getThumbnailUrl(), e.getCoverUrl(), e.getCoverMode(), e.getCardSkin(), readSet(e.getTagsJson(), new TypeReference<Set<String>>() { }),
                e.getNotes(), e.getOriginalTaskId(), e.getSourceProjectId(), e.getChecklistItemId(), e.getReuseCount(), e.getProjectUsageCount(),
                e.getLikesCount(), e.getCommentsCount(), e.getSavesCount(), e.getSharesCount(), e.getRemixesCount(), e.getViewsCount(),
                e.getSealIdsJson());
    }

    private static String writeSet(Set<?> set) {
        return set == null || set.isEmpty() ? null : JSON.writeValueAsString(set);
    }

    private static <T> Set<T> readSet(String json, TypeReference<Set<T>> type) {
        return json == null || json.isBlank() ? Set.of() : JSON.readValue(json, type);
    }
}
