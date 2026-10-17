package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Criterion;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Deliverable;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference;
import br.gov.pr.secid.workstation.application.acervo.TaskRepositoryPort.StoredTask;
import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.DomainRuleException;
import br.gov.pr.secid.workstation.domain.common.InvalidTransitionException;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.security.AccessPolicy;
import br.gov.pr.secid.workstation.domain.security.ResourceAction;
import br.gov.pr.secid.workstation.domain.security.ScopedResource;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Criador e edição de tarefas (RF4, RF12, RF41; auditoria 17/10/2026). Primeiro chamador de produção do {@link ResourceAuthorizer}:
 * leitura por {@code VIEW}, edição e transição por {@code EDIT} — invisível responde 404 igual a inexistente (D-65/D-66). Campos
 * comuns a qualquer profissão e extensões opcionais por área ({@link WorkArea}); nada de software é obrigatório para as demais.
 * Concorrência por versão (409 EDICAO_CONCORRENTE); toda transição grava {@code task_state_log}; criação e edição vão ao audit_log.
 */
@Service
public class TaskService {
    static final int MAX_TITLE = 200;
    static final int MAX_DESCRIPTION = 20_000;
    static final int MAX_OBJECTIVE = 500;
    static final int MAX_REASON = 500;
    static final int MAX_LIST = 100;

    private final TaskRepositoryPort tasks;
    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final AuditLogPort audit;
    private final Clock clock;

    public TaskService(TaskRepositoryPort tasks, UserRepositoryPort users, ResourceAuthorizer authorizer, AuditLogPort audit, Clock clock) {
        this.tasks = tasks;
        this.users = users;
        this.authorizer = authorizer;
        this.audit = audit;
        this.clock = clock;
    }

    /** Entrada do criador/edição. {@code draft} só vale na criação: falso publica para o próprio acervo como DISPONIVEL (A realizar). */
    public record TaskInput(String title, String descriptionMd, TaskType type, TaskCategory category, Priority priority, LocalDate dueAt,
                            UUID responsibleId, AccessClassification accessClass, Visibility visibility, String objective, WorkArea area,
                            List<Deliverable> deliverables, List<Criterion> acceptanceCriteria, List<Reference> references,
                            Map<String, String> extensions, Boolean draft) {
    }

    /** Mudança de estado; BLOQUEADA exige motivo e causa (tarefa ou pessoa). */
    public record TransitionInput(TaskState to, String reason, UUID blockedByTaskId, UUID blockedByUserId, long version) {
    }

    /** Projeção da tarefa para a API; {@code editable} diz se o viewer pode editar agora (estado e permissão). */
    public record TaskView(UUID id, long version, UUID ownerId, UUID departmentId, String title, String descriptionMd, TaskType type,
                           TaskCategory category, Priority priority, TaskState state, LocalDate dueAt, UUID responsibleId,
                           AccessClassification accessClass, Visibility visibility, UUID blockedByTaskId, UUID blockedByUserId, String blockReason,
                           String objective, WorkArea area, List<Deliverable> deliverables, List<Criterion> acceptanceCriteria,
                           List<Reference> references, Map<String, String> extensions, boolean editable, Instant createdAt, Instant updatedAt) {
    }

    @Transactional
    public TaskView create(CurrentUser actor, TaskInput in, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        Validated v = validate(viewer, in);
        TaskItem draft = TaskItem.create(actor.id(), viewer.departmentId(), v.title, v.description, in.type(), in.category(), v.priority,
                in.dueAt(), in.responsibleId(), v.accessClass, v.visibility);
        StoredTask stored = tasks.insert(draft, v.brief(null));
        UUID id = stored.task().id();
        Instant now = clock.instant();
        tasks.appendStateLog(new TaskStateLog(UUID.randomUUID(), id, null, TaskState.RASCUNHO, actor.id(), "criada no criador", null, null, now));
        if (!Boolean.TRUE.equals(in.draft())) {
            TaskItem available = stored.task().transition(TaskState.DISPONIVEL);
            stored = tasks.update(available, stored.brief(), stored.version());
            tasks.appendStateLog(new TaskStateLog(UUID.randomUUID(), id, TaskState.RASCUNHO, TaskState.DISPONIVEL, actor.id(), null, null, null, now));
        }
        audit.record(AuditEvent.of(actor.id(), AuditActions.TASK_CREATED, "task", id.toString(), AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                Map.of("state", stored.task().state().name(), "area", in.area() == null ? "-" : in.area().name())));
        return view(viewer, stored);
    }

    public List<TaskView> listMine(CurrentUser actor, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        return tasks.findByOwner(actor.id(), Math.max(1, Math.min(limit, MAX_LIST))).stream().map(s -> view(viewer, s)).toList();
    }

    /** Tarefas de outra pessoa que o viewer pode ver (perfil de terceiros, RF16/RF17): filtro item a item pela AccessPolicy. */
    public List<TaskView> listOf(CurrentUser actor, UUID ownerId, int limit) {
        Viewer viewer = authorizer.viewer(actor);
        int size = Math.max(1, Math.min(limit, MAX_LIST));
        return tasks.findByOwner(ownerId, size).stream()
                .filter(s -> AccessPolicy.visible(viewer, scoped(s.task())))
                .map(s -> view(viewer, s)).toList();
    }

    public TaskView get(CurrentUser actor, UUID id) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = load(id);
        authorizer.require(viewer, scoped(stored.task()), ResourceAction.VIEW);
        return view(viewer, stored);
    }

    @Transactional
    public TaskView update(CurrentUser actor, UUID id, TaskInput in, long version, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = load(id);
        TaskItem current = stored.task();
        authorizer.require(viewer, scoped(current), ResourceAction.EDIT);
        if (current.state().isReadOnly()) {
            throw ApiException.conflict("TAREFA_BLOQUEADA", "Tarefa concluída ou arquivada: reabra para editar.");
        }
        Validated v = validate(viewer, in);
        if (current.state().locksVisibility() && (v.visibility != current.visibility() || v.accessClass != current.accessClass())) {
            throw ApiException.conflict("OFERTA_ATIVA", "Modelo público ou oferecido: visibilidade e classificação ficam travadas.");
        }
        TaskItem changed = current.withDetails(v.title, v.description, in.type(), in.category(), v.priority, in.dueAt(), in.responsibleId(),
                v.accessClass, v.visibility);
        StoredTask saved = tasks.update(changed, v.brief(id), version);
        audit.record(AuditEvent.of(actor.id(), AuditActions.TASK_UPDATED, "task", id.toString(), AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                Map.of("version", saved.version())));
        return view(viewer, saved);
    }

    @Transactional
    public TaskView transition(CurrentUser actor, UUID id, TransitionInput in, RequestContext ctx) {
        Viewer viewer = authorizer.viewer(actor);
        StoredTask stored = load(id);
        TaskItem current = stored.task();
        authorizer.require(viewer, scoped(current), ResourceAction.EDIT);
        if (in.to() == null) {
            throw TaskBriefJson.invalid(Map.of("to", "Informe o novo estado."));
        }
        String reason = in.reason() == null ? null : in.reason().strip();
        if (reason != null && reason.length() > MAX_REASON) {
            throw TaskBriefJson.invalid(Map.of("reason", "Motivo com até " + MAX_REASON + " caracteres."));
        }
        TaskItem next;
        try {
            if (in.to() == TaskState.BLOQUEADA) {
                boolean noCause = in.blockedByTaskId() == null && in.blockedByUserId() == null;
                if (noCause || reason == null || reason.isEmpty()) {
                    throw ApiException.unprocessable("TAREFA_BLOQUEIO_SEM_CAUSA", "Bloquear exige motivo e a causa (tarefa ou pessoa).", Map.of());
                }
                requireBlockCause(viewer, id, in);
                next = current.block(in.blockedByTaskId(), in.blockedByUserId(), reason);
            } else {
                next = current.transition(in.to());
            }
        } catch (InvalidTransitionException | DomainRuleException e) {
            throw new ApiException(code(e), 409, "Transição não permitida: " + current.state() + " → " + in.to() + ".");
        }
        StoredTask saved = tasks.update(next, stored.brief(), in.version());
        tasks.appendStateLog(new TaskStateLog(UUID.randomUUID(), id, current.state(), next.state(), actor.id(), reason, null, null, clock.instant()));
        audit.record(AuditEvent.of(actor.id(), AuditActions.TASK_STATE_CHANGED, "task", id.toString(), AuditEvent.OK, ctx.ip(), ctx.userAgent(),
                Map.of("from", current.state().name(), "to", next.state().name())));
        return view(viewer, saved);
    }

    /** Causa do bloqueio precisa existir e ser visível (tarefa) ou da mesma empresa (pessoa): evita FK violada e vazamento. */
    private void requireBlockCause(Viewer viewer, UUID taskId, TransitionInput in) {
        if (in.blockedByTaskId() != null) {
            StoredTask cause = in.blockedByTaskId().equals(taskId) ? null : tasks.findById(in.blockedByTaskId()).orElse(null);
            if (cause == null || !AccessPolicy.visible(viewer, scoped(cause.task()))) {
                throw TaskBriefJson.invalid(Map.of("blockedByTaskId", "Escolha outra tarefa que você possa ver."));
            }
        }
        if (in.blockedByUserId() != null) {
            User person = users.findById(in.blockedByUserId()).orElse(null);
            if (person == null || !Objects.equals(person.getCompanyId(), viewer.companyId())) {
                throw TaskBriefJson.invalid(Map.of("blockedByUserId", "Escolha uma pessoa da sua empresa."));
            }
        }
    }

    private static String code(RuntimeException e) {
        if (e instanceof InvalidTransitionException ite) {
            return ite.getCode();
        }
        return ((DomainRuleException) e).getCode();
    }

    private StoredTask load(UUID id) {
        return tasks.findById(id).orElseThrow(() -> ResourceAuthorizer.notFound(ScopedResource.Kind.TASK));
    }

    private ScopedResource scoped(TaskItem t) {
        UUID ownerCompany = users.findById(t.ownerId()).map(User::getCompanyId).orElse(null);
        return ScopedResource.of(t, ownerCompany);
    }

    private TaskView view(Viewer viewer, StoredTask s) {
        TaskItem t = s.task();
        TaskBrief b = s.brief() == null ? TaskBrief.empty(t.id()) : s.brief();
        boolean canEdit = !t.state().isReadOnly()
                && AccessPolicy.decide(viewer, scoped(t), ResourceAction.EDIT).allowed();
        return new TaskView(t.id(), s.version(), t.ownerId(), t.departmentId(), t.title(), t.descriptionMd(), t.type(), t.category(), t.priority(),
                t.state(), t.dueAt(), t.responsibleId(), t.accessClass(), t.visibility(), t.blockedByTaskId(), t.blockedByUserId(), t.blockReason(),
                b.objective(), b.area(), TaskBriefJson.readDeliverables(b.deliverablesJson()), TaskBriefJson.readCriteria(b.acceptanceCriteriaJson()),
                TaskBriefJson.readReferences(b.referencesJson()), TaskBriefJson.readExtensions(b.extensionsJson()), canEdit, s.createdAt(),
                s.updatedAt());
    }

    /** Valores normalizados e briefing serializado; erros de campo juntos num único 422 VALIDACAO. */
    private record Validated(String title, String description, Priority priority, AccessClassification accessClass, Visibility visibility,
                             String objective, WorkArea area, String deliverables, String criteria, String references, String extensions) {
        TaskBrief brief(UUID taskId) {
            return new TaskBrief(taskId, objective, area, deliverables, criteria, references, extensions);
        }
    }

    private Validated validate(Viewer viewer, TaskInput in) {
        Map<String, Object> errors = new LinkedHashMap<>();
        String title = in.title() == null ? "" : in.title().strip();
        if (title.isEmpty() || title.length() > MAX_TITLE) {
            errors.put("title", "Informe um título com até " + MAX_TITLE + " caracteres.");
        }
        String description = in.descriptionMd() == null || in.descriptionMd().isBlank() ? null : in.descriptionMd().strip();
        if (description != null && description.length() > MAX_DESCRIPTION) {
            errors.put("descriptionMd", "Descrição com até " + MAX_DESCRIPTION + " caracteres.");
        }
        if (in.type() == null) {
            errors.put("type", "Escolha o tipo de tarefa.");
        }
        String objective = in.objective() == null || in.objective().isBlank() ? null : in.objective().strip();
        if (objective != null && objective.length() > MAX_OBJECTIVE) {
            errors.put("objective", "Objetivo com até " + MAX_OBJECTIVE + " caracteres.");
        }
        if (in.responsibleId() != null && !in.responsibleId().equals(viewer.userId())) {
            User responsible = users.findById(in.responsibleId()).orElse(null);
            if (responsible == null || !Objects.equals(responsible.getCompanyId(), viewer.companyId())) {
                errors.put("responsibleId", "O responsável precisa ser uma pessoa da sua empresa.");
            }
        }
        if (in.dueAt() != null && in.dueAt().isBefore(LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC).minusYears(1))) {
            errors.put("dueAt", "Prazo muito antigo; confira a data.");
        }
        String deliverables = TaskBriefJson.deliverables(in.deliverables(), errors);
        String criteria = TaskBriefJson.criteria(in.acceptanceCriteria(), errors);
        String references = TaskBriefJson.references(in.references(), errors);
        String extensions = TaskBriefJson.extensions(in.extensions(), errors);
        if (!errors.isEmpty()) {
            throw TaskBriefJson.invalid(errors);
        }
        return new Validated(title, description, in.priority() == null ? Priority.MEDIA : in.priority(),
                in.accessClass() == null ? AccessClassification.INTERNO : in.accessClass(), in.visibility() == null ? Visibility.PRIVADA : in.visibility(),
                objective, in.area(), deliverables, criteria, references, extensions);
    }
}
