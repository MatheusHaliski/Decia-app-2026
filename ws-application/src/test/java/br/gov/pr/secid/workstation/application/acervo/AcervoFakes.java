package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.Evidence;
import br.gov.pr.secid.workstation.domain.acervo.LegalDeadlineRule;
import br.gov.pr.secid.workstation.domain.acervo.TaskAttachment;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Acervo em memória para os testes dos serviços (tarefas com TODOS os campos, anexos, evidências e catálogo de prazos legais). */
final class AcervoFakes {
    static final Instant T0 = Instant.parse("2026-11-12T12:00:00Z");

    private AcervoFakes() {
    }

    static final class Tasks implements TaskRepositoryPort {
        final Map<UUID, StoredTask> rows = new LinkedHashMap<>();
        final List<TaskStateLog> logs = new ArrayList<>();
        long tick;

        /** Grava direto (testes de lista): id já definido, carimbos escolhidos. */
        StoredTask put(TaskItem t, Instant createdAt, Instant updatedAt) {
            StoredTask s = new StoredTask(t, TaskBrief.empty(t.id()), 0, createdAt, updatedAt);
            rows.put(t.id(), s);
            return s;
        }

        @Override
        public Optional<StoredTask> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public List<StoredTask> findByOwner(UUID ownerId, int limit) {
            return rows.values().stream().filter(s -> s.task().ownerId().equals(ownerId))
                    .sorted(Comparator.comparing(StoredTask::createdAt).reversed()).limit(limit).toList();
        }

        @Override
        public List<TaskIndexRow> indexByOwner(UUID ownerId, int cap) {
            return findByOwner(ownerId, cap).stream().map(s -> new TaskIndexRow(s.task().id(), s.task().title(), s.task().type(), s.task().category(),
                    s.task().priority(), s.task().state(), s.task().dueAt(), s.task().legalDueAt(), s.createdAt(), s.updatedAt())).toList();
        }

        @Override
        public List<StoredTask> findAllById(Collection<UUID> ids) {
            return ids.stream().map(rows::get).filter(Objects::nonNull).toList();
        }

        @Override
        public StoredTask insert(TaskItem task, TaskBrief brief) {
            throw new UnsupportedOperationException("use put");
        }

        @Override
        public StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion) {
            StoredTask current = rows.get(task.id());
            if (current.version() != expectedVersion) {
                throw new OptimisticLockingFailureException("versão " + expectedVersion + " ≠ " + current.version());
            }
            StoredTask s = new StoredTask(task, brief, current.version() + 1, current.createdAt(), T0.plusSeconds(++tick));
            rows.put(task.id(), s);
            return s;
        }

        @Override
        public void appendStateLog(TaskStateLog log) {
            logs.add(log);
        }
    }

    static final class Attachments implements TaskAttachmentRepositoryPort {
        final Map<UUID, StoredAttachment> rows = new LinkedHashMap<>();
        final Map<UUID, String> titles = new LinkedHashMap<>();
        final Map<UUID, UUID> owners = new LinkedHashMap<>();
        long tick;

        @Override
        public TaskAttachment insert(TaskAttachment a) {
            TaskAttachment saved = new TaskAttachment(UUID.randomUUID(), a.taskId(), a.mediaObjectId(), a.fileName(), a.mimeType(), a.sizeBytes(),
                    a.sha256(), a.antivirusStatus(), a.ocrStatus(), a.ocrTextRef(), a.isPrimary(), a.sortOrder());
            rows.put(saved.id(), new StoredAttachment(saved, T0.plusSeconds(++tick)));
            return saved;
        }

        @Override
        public List<TaskAttachment> findByTask(UUID taskId) {
            return listByTask(taskId).stream().map(StoredAttachment::attachment).toList();
        }

        @Override
        public List<StoredAttachment> listByTask(UUID taskId) {
            return rows.values().stream().filter(s -> s.attachment().taskId().equals(taskId))
                    .sorted(Comparator.comparingInt((StoredAttachment s) -> s.attachment().sortOrder())).toList();
        }

        @Override
        public Optional<StoredAttachment> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public List<TitledAttachment> listByTaskOwner(UUID ownerId, int limit) {
            return rows.values().stream().filter(s -> ownerId.equals(owners.get(s.attachment().taskId())))
                    .sorted(Comparator.comparing(StoredAttachment::createdAt).reversed()).limit(limit)
                    .map(s -> new TitledAttachment(s, titles.get(s.attachment().taskId()))).toList();
        }

        @Override
        public long countByMedia(UUID mediaObjectId) {
            return rows.values().stream().filter(s -> s.attachment().mediaObjectId().equals(mediaObjectId)).count();
        }

        @Override
        public void delete(UUID id) {
            rows.remove(id);
        }
    }

    static final class Evidences implements EvidenceRepositoryPort {
        final Map<UUID, StoredEvidence> rows = new LinkedHashMap<>();
        long tick;

        @Override
        public StoredEvidence insert(Evidence e) {
            Evidence saved = new Evidence(UUID.randomUUID(), e.ownerId(), e.mediaObjectId(), e.takenAt(), e.latitude(), e.longitude(), e.caption(),
                    e.linkedTaskId(), e.linkedProjectId(), e.studioStatus(), e.derivedTaskId());
            StoredEvidence s = new StoredEvidence(saved, T0.plusSeconds(++tick));
            rows.put(saved.id(), s);
            return s;
        }

        @Override
        public Optional<StoredEvidence> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }

        @Override
        public List<StoredEvidence> findByTask(UUID taskId) {
            return rows.values().stream().filter(s -> taskId.equals(s.evidence().linkedTaskId())).toList();
        }

        @Override
        public List<StoredEvidence> findByTasks(Collection<UUID> taskIds) {
            return rows.values().stream().filter(s -> taskIds.contains(s.evidence().linkedTaskId())).toList();
        }

        @Override
        public long countByMedia(UUID mediaObjectId) {
            return rows.values().stream().filter(s -> s.evidence().mediaObjectId().equals(mediaObjectId)).count();
        }

        @Override
        public void delete(UUID id) {
            rows.remove(id);
        }
    }

    static final class Rules implements LegalDeadlineRuleRepositoryPort {
        final Map<UUID, LegalDeadlineRule> rows = new LinkedHashMap<>();

        LegalDeadlineRule add(LegalDeadlineRule r) {
            rows.put(r.id(), r);
            return r;
        }

        @Override
        public List<LegalDeadlineRule> findActive(UUID companyId) {
            return rows.values().stream().filter(r -> r.active() && (r.companyId() == null || r.companyId().equals(companyId))).toList();
        }

        @Override
        public Optional<LegalDeadlineRule> findById(UUID id) {
            return Optional.ofNullable(rows.get(id));
        }
    }

    /** Tarefa pronta para os testes: id, estado e prazo legal escolhidos (o resto como o criador grava). */
    static TaskItem task(UUID owner, String title, TaskState state, Priority priority, TaskCategory category, LocalDate dueAt, LocalDate legalDueAt,
                         AccessClassification access, Visibility visibility, UUID responsible) {
        TaskItem t = TaskItem.create(owner, null, title, null, TaskType.DOCUMENTO, category, priority, dueAt, responsible, access, visibility);
        return shaped(t, UUID.randomUUID(), state, legalDueAt);
    }

    static TaskItem shaped(TaskItem t, UUID id, TaskState state, LocalDate legalDueAt) {
        return new TaskItem(id, t.ownerId(), t.departmentId(), t.title(), t.summary(), t.descriptionMd(), t.type(), t.category(), t.subcategory(),
                t.processTags(), t.natureTags(), t.accessClass(), t.format(), t.effortSize(), t.estimatedHours(), t.amountInvolved(), t.origin(),
                t.sourceKind(), t.sourceRef(), t.linkMode(), t.orgEntityId(), t.responsibleId(), t.dueAt(),
                legalDueAt == null ? null : UUID.randomUUID(), legalDueAt == null ? null : legalDueAt.minusDays(10), legalDueAt,
                t.legalOverrideReason(), t.priority(), state, t.blockedByTaskId(),
                t.blockedByUserId(), t.blockReason(), t.docSituation(), t.receivedAt(), t.senderOrigin(), t.protocolNumber(),
                t.retentionPolicyJson(), t.visibility(), t.favorite(), t.offeredInCounter(), t.aiGenerated(), t.aiInferenceId(),
                t.aiConfidenceJson(), t.thumbnailUrl(), t.coverUrl(), t.coverMode(), t.cardSkin(), t.tags(), t.notes(), t.originalTaskId(),
                t.sourceProjectId(), t.checklistItemId(), t.reuseCount(), t.projectUsageCount(), t.likesCount(), t.commentsCount(),
                t.savesCount(), t.sharesCount(), t.remixesCount(), t.viewsCount(), t.sealIdsJson());
    }

    /** O record não expõe "withId": reconstrói pelos acessores, como o adaptador faz a partir da entidade. */
    static TaskItem withId(TaskItem t, UUID id) {
        return new TaskItem(id, t.ownerId(), t.departmentId(), t.title(), t.summary(), t.descriptionMd(), t.type(), t.category(), t.subcategory(),
                t.processTags(), t.natureTags(), t.accessClass(), t.format(), t.effortSize(), t.estimatedHours(), t.amountInvolved(), t.origin(),
                t.sourceKind(), t.sourceRef(), t.linkMode(), t.orgEntityId(), t.responsibleId(), t.dueAt(), t.legalDeadlineRuleId(),
                t.legalDeadlineBaseDate(), t.legalDueAt(), t.legalOverrideReason(), t.priority(), t.state(), t.blockedByTaskId(),
                t.blockedByUserId(), t.blockReason(), t.docSituation(), t.receivedAt(), t.senderOrigin(), t.protocolNumber(),
                t.retentionPolicyJson(), t.visibility(), t.favorite(), t.offeredInCounter(), t.aiGenerated(), t.aiInferenceId(),
                t.aiConfidenceJson(), t.thumbnailUrl(), t.coverUrl(), t.coverMode(), t.cardSkin(), t.tags(), t.notes(), t.originalTaskId(),
                t.sourceProjectId(), t.checklistItemId(), t.reuseCount(), t.projectUsageCount(), t.likesCount(), t.commentsCount(),
                t.savesCount(), t.sharesCount(), t.remixesCount(), t.viewsCount(), t.sealIdsJson());
    }
}
