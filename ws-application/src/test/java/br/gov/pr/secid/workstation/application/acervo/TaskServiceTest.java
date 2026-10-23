package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Criterion;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Deliverable;
import br.gov.pr.secid.workstation.application.acervo.TaskBriefParts.Reference;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskInput;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TaskView;
import br.gov.pr.secid.workstation.application.acervo.TaskService.TransitionInput;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.notifications.MemoryNotifications;
import br.gov.pr.secid.workstation.application.notifications.NotificationService;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.acervo.WorkArea;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.common.Priority;
import br.gov.pr.secid.workstation.domain.common.Visibility;
import br.gov.pr.secid.workstation.domain.social.NotificationType;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Auditoria 17/10/2026 — criador/edição/estados de tarefa: 6 áreas, ACL (SIGILOSO), versão, briefing e transições. */
class TaskServiceTest {
    static final Instant NOW = Instant.parse("2026-10-17T12:00:00Z");
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final AuditLogPort audit = mock(AuditLogPort.class);
    final MemoryTasks repo = new MemoryTasks();
    final MemoryNotifications notes = new MemoryNotifications();
    final UUID company = UUID.randomUUID();
    final UUID otherCompany = UUID.randomUUID();
    final UUID dept = UUID.randomUUID();
    final TaskService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new TaskService(repo, users, authorizer, audit, new NotificationService(notes, users, authorizer, clock), clock);
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(UUID companyId, Role role) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setRole(role);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setCompanyId(companyId);
        u.setDepartmentId(dept);
        u.setStatus(AccountStatus.ACTIVE);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    static TaskInput input(String title, WorkArea area, Map<String, String> extensions) {
        return new TaskInput(title, "Contexto da tarefa.", TaskType.DOCUMENTO, null, Priority.ALTA, LocalDate.of(2026, 11, 1), null,
                AccessClassification.INTERNO, Visibility.EMPRESA, "Entregar o resultado combinado", area,
                List.of(new Deliverable("Documento final")), List.of(new Criterion("Revisado pela chefia", false)),
                List.of(new Reference("Norma", "https://www.w3.org/TR/WCAG22/")), extensions, false);
    }

    @Test
    void criaTarefasDeSeisAreasSemExigirCamposDeSoftware() {
        User me = person(company, Role.USER);
        Map<WorkArea, Map<String, String>> cases = new LinkedHashMap<>();
        cases.put(WorkArea.SOFTWARE, Map.of("repository", "https://example.org/repo", "environment", "homologação"));
        cases.put(WorkArea.ADMINISTRACAO, Map.of("process", "Compras"));
        cases.put(WorkArea.DESIGN, Map.of("format", "1080×1080"));
        cases.put(WorkArea.PESQUISA, Map.of("question", "Qual o impacto?", "method", "Revisão sistemática"));
        cases.put(WorkArea.MARKETING, Map.of("audience", "Servidores"));
        cases.put(WorkArea.PLANEJAMENTO, Map.of());
        for (Map.Entry<WorkArea, Map<String, String>> c : cases.entrySet()) {
            TaskView v = service.create(cu(me), input("Tarefa " + c.getKey(), c.getKey(), c.getValue()), CTX);
            assertThat(v.state()).isEqualTo(TaskState.DISPONIVEL);
            assertThat(v.area()).isEqualTo(c.getKey());
            assertThat(v.extensions()).isEqualTo(c.getValue());
            assertThat(v.objective()).isEqualTo("Entregar o resultado combinado");
            assertThat(v.deliverables()).containsExactly(new Deliverable("Documento final"));
            assertThat(v.acceptanceCriteria()).containsExactly(new Criterion("Revisado pela chefia", false));
            assertThat(v.editable()).isTrue();
        }
        assertThat(service.listMine(cu(me), 50)).hasSize(6);
        // criação = RASCUNHO + DISPONIVEL na trilha; auditoria por tarefa
        assertThat(repo.logs).hasSize(12);
        verify(audit, times(6)).record(any(AuditEvent.class));
    }

    @Test
    void rascunhoFicaEmRascunhoEValidacaoVoltaComTodosOsCampos() {
        User me = person(company, Role.USER);
        TaskInput draft = new TaskInput("Rascunho", null, TaskType.TEXTO_MANUAL, null, null, null, null, null, null, null, null, null, null,
                null, null, true);
        TaskView v = service.create(cu(me), draft, CTX);
        assertThat(v.state()).isEqualTo(TaskState.RASCUNHO);
        assertThat(v.visibility()).isEqualTo(Visibility.PRIVADA);
        assertThat(v.priority()).isEqualTo(Priority.MEDIA);

        TaskInput bad = new TaskInput(" ", null, null, null, null, null, null, null, null, null, null, null, null,
                List.of(new Reference("x", "javascript:alert(1)")), Map.of("Bad Key", "v"), false);
        assertThatThrownBy(() -> service.create(cu(me), bad, CTX)).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.status()).isEqualTo(422);
            @SuppressWarnings("unchecked")
            Map<String, Object> fields = (Map<String, Object>) e.details().get("fields");
            assertThat(fields).containsKeys("title", "type", "references", "extensions");
        });
    }

    @Test
    void responsavelPrecisaSerDaMesmaEmpresa() {
        User me = person(company, Role.USER);
        User outsider = person(otherCompany, Role.USER);
        TaskInput in = new TaskInput("Com responsável", null, TaskType.DOCUMENTO, null, null, null, outsider.getId(), null, null, null, null,
                null, null, null, null, false);
        assertThatThrownBy(() -> service.create(cu(me), in, CTX)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(422));
    }

    @Test
    void editarPreservaConteudoEExigeVersaoAtual() {
        User me = person(company, Role.USER);
        TaskView created = service.create(cu(me), input("Original", WorkArea.PESQUISA, Map.of("method", "Survey")), CTX);
        TaskInput changed = new TaskInput("Editada", "Nova descrição", TaskType.DOCUMENTO, null, Priority.BAIXA, null, null,
                AccessClassification.INTERNO, Visibility.EMPRESA, "Novo objetivo", WorkArea.PESQUISA,
                List.of(new Deliverable("Relatório"), new Deliverable("Planilha")), List.of(new Criterion("Revisado pela chefia", true)),
                List.of(), Map.of("method", "Survey"), null);
        TaskView edited = service.update(cu(me), created.id(), changed, created.version(), CTX);
        assertThat(edited.title()).isEqualTo("Editada");
        assertThat(edited.version()).isGreaterThan(created.version());
        assertThat(edited.deliverables()).hasSize(2);
        assertThat(edited.acceptanceCriteria().get(0).done()).isTrue();
        assertThat(edited.extensions()).containsEntry("method", "Survey");

        TaskView reopened = service.get(cu(me), created.id());
        assertThat(reopened).isEqualTo(edited);

        // cópia antiga (outra aba) não sobrescreve
        assertThatThrownBy(() -> service.update(cu(me), created.id(), changed, created.version(), CTX))
                .isInstanceOf(OptimisticLockingFailureException.class);
    }

    @Test
    void sigilosoNaoEhVistoPorColegaNemAdminSemVinculo() {
        User owner = person(company, Role.USER);
        User colleague = person(company, Role.USER);
        User admin = person(company, Role.ADMIN);
        TaskInput sig = new TaskInput("Parecer sigiloso", null, TaskType.DOCUMENTO, null, null, null, null, AccessClassification.SIGILOSO,
                Visibility.EMPRESA, null, null, null, null, null, null, false);
        TaskView v = service.create(cu(owner), sig, CTX);
        assertThatThrownBy(() -> service.get(cu(colleague), v.id())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(404));
        // D-139 (Q-166/Q-238): ADMIN sem vínculo explícito não lê SIGILOSO — mesma resposta de inexistente
        assertThatThrownBy(() -> service.get(cu(admin), v.id())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(404));
        assertThat(service.get(cu(owner), v.id()).title()).isEqualTo("Parecer sigiloso");
    }

    @Test
    void colegaDaEmpresaVeMasNaoEdita() {
        User owner = person(company, Role.USER);
        User colleague = person(company, Role.USER);
        TaskView v = service.create(cu(owner), input("Compartilhada", WorkArea.ADMINISTRACAO, Map.of()), CTX);
        TaskView seen = service.get(cu(colleague), v.id());
        assertThat(seen.editable()).isFalse();
        assertThatThrownBy(() -> service.update(cu(colleague), v.id(), input("x", null, null), v.version(), CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status()).isEqualTo(403));
        assertThatThrownBy(() -> service.get(cu(colleague), UUID.randomUUID())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.status()).isEqualTo(404));
    }

    @Test
    void transicoesSeguemATabelaEBloqueioExigeCausa() {
        User me = person(company, Role.USER);
        User other = person(company, Role.USER);
        TaskView v = service.create(cu(me), input("Fluxo", WorkArea.PLANEJAMENTO, Map.of()), CTX);
        TaskView started = service.transition(cu(me), v.id(), new TransitionInput(TaskState.EM_USO, null, null, null, v.version()), CTX);
        assertThat(started.state()).isEqualTo(TaskState.EM_USO);

        assertThatThrownBy(() -> service.transition(cu(me), v.id(), new TransitionInput(TaskState.BLOQUEADA, "sem causa", null, null,
                started.version()), CTX)).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("TAREFA_BLOQUEIO_SEM_CAUSA"));
        TaskView blocked = service.transition(cu(me), v.id(), new TransitionInput(TaskState.BLOQUEADA, "Aguardando parecer", null, other.getId(),
                started.version()), CTX);
        assertThat(blocked.blockReason()).isEqualTo("Aguardando parecer");

        assertThatThrownBy(() -> service.transition(cu(me), v.id(), new TransitionInput(TaskState.ARQUIVADA, null, null, null,
                blocked.version()), CTX)).isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.status()).isEqualTo(409);
                    assertThat(e.code()).isEqualTo("TAREFA_TRANSICAO_INVALIDA");
                });
        TaskView resumed = service.transition(cu(me), v.id(), new TransitionInput(TaskState.EM_USO, null, null, null, blocked.version()), CTX);
        TaskView done = service.transition(cu(me), v.id(), new TransitionInput(TaskState.CONCLUIDA, null, null, null, resumed.version()), CTX);
        assertThat(done.editable()).isFalse();
        assertThatThrownBy(() -> service.update(cu(me), v.id(), input("Depois de concluir", null, null), done.version(), CTX))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("TAREFA_BLOQUEADA"));
        assertThat(repo.logs.stream().filter(l -> l.taskId().equals(v.id())).map(TaskStateLog::toState))
                .containsExactly(TaskState.RASCUNHO, TaskState.DISPONIVEL, TaskState.EM_USO, TaskState.BLOQUEADA, TaskState.EM_USO, TaskState.CONCLUIDA);
    }

    @Test
    void causaDoBloqueioPrecisaExistirESerVisivel() {
        User me = person(company, Role.USER);
        TaskView v = service.create(cu(me), input("Fluxo", WorkArea.OUTRA, Map.of()), CTX);
        assertThatThrownBy(() -> service.transition(cu(me), v.id(), new TransitionInput(TaskState.BLOQUEADA, "x", UUID.randomUUID(), null,
                v.version()), CTX)).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.status()).isEqualTo(422));
        assertThatThrownBy(() -> service.transition(cu(me), v.id(), new TransitionInput(TaskState.BLOQUEADA, "x", v.id(), null,
                v.version()), CTX)).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.transition(cu(me), v.id(), new TransitionInput(null, null, null, null, v.version()), CTX))
                .isInstanceOf(ApiException.class);
    }


    @Test
    void responsavelETransicaoGeramNotificacaoParaQuemPodeVerMenosQuemAgiu() {
        User me = person(company, Role.USER);
        User colleague = person(company, Role.USER);
        TaskInput base = input("Parecer sobre o contrato", WorkArea.JURIDICO, Map.of());
        TaskInput withResp = new TaskInput(base.title(), base.descriptionMd(), base.type(), base.category(), base.priority(), base.dueAt(),
                colleague.getId(), base.accessClass(), Visibility.PRIVADA, base.objective(), base.area(), base.deliverables(),
                base.acceptanceCriteria(), base.references(), base.extensions(), false);
        TaskView created = service.create(cu(me), withResp, CTX);
        assertThat(notes.of(colleague.getId())).singleElement().satisfies(n -> {
            assertThat(n.type()).isEqualTo(NotificationType.ATRIBUICAO_PROPOSTA);
            assertThat(n.resourceId()).isEqualTo(created.id());
            assertThat(n.actorId()).isEqualTo(me.getId());
        });
        assertThat(notes.of(me.getId())).as("quem criou não é avisado").isEmpty();
        TaskView started = service.transition(cu(colleague), created.id(), new TransitionInput(TaskState.EM_USO, null, null, null,
                created.version()), CTX);
        assertThat(started.state()).isEqualTo(TaskState.EM_USO);
        assertThat(notes.of(me.getId())).singleElement().satisfies(n -> assertThat(n.type()).isEqualTo(NotificationType.TRANSICAO));
        assertThat(notes.of(colleague.getId())).as("quem mudou o estado não é avisado de novo").hasSize(1);
    }

    /** Repositório em memória com a mesma semântica de versão do adaptador JPA (incrementa em toda atualização). */
    static final class MemoryTasks implements TaskRepositoryPort {
        final Map<UUID, StoredTask> rows = new LinkedHashMap<>();
        final List<TaskStateLog> logs = new ArrayList<>();
        long clock;

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
        public StoredTask insert(TaskItem task, TaskBrief brief) {
            UUID id = UUID.randomUUID();
            TaskItem withId = TaskItem.create(task.ownerId(), task.departmentId(), task.title(), task.descriptionMd(), task.type(), task.category(),
                    task.priority(), task.dueAt(), task.responsibleId(), task.accessClass(), task.visibility());
            withId = new TaskItemIdSetter(withId).with(id);
            Instant at = NOW.plusSeconds(clock++);
            StoredTask s = new StoredTask(withId, brief == null ? TaskBrief.empty(id) : rebind(brief, id), 0, at, at);
            rows.put(id, s);
            return s;
        }

        @Override
        public StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion) {
            StoredTask current = rows.get(task.id());
            if (current.version() != expectedVersion) {
                throw new OptimisticLockingFailureException("versão " + expectedVersion + " ≠ " + current.version());
            }
            StoredTask s = new StoredTask(task, brief == null ? TaskBrief.empty(task.id()) : rebind(brief, task.id()), current.version() + 1,
                    current.createdAt(), NOW.plusSeconds(clock++));
            rows.put(task.id(), s);
            return s;
        }

        @Override
        public void appendStateLog(TaskStateLog log) {
            logs.add(log);
        }

        static TaskBrief rebind(TaskBrief b, UUID id) {
            return new TaskBrief(id, b.objective(), b.area(), b.deliverablesJson(), b.acceptanceCriteriaJson(), b.referencesJson(),
                    b.extensionsJson());
        }
    }

    /** O record não expõe "withId": reconstrói pelos acessores, como o adaptador faz a partir da entidade. */
    record TaskItemIdSetter(TaskItem t) {
        TaskItem with(UUID id) {
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
}
