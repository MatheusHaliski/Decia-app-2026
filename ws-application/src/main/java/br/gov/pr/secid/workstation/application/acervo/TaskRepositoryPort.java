package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskCategory;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskState;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;
import br.gov.pr.secid.workstation.domain.acervo.TaskType;
import br.gov.pr.secid.workstation.domain.common.Priority;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Acesso às tarefas ({@code tasks} + {@code task_briefs} + {@code task_state_log}); adaptador JPA em persistence-mysql. */
public interface TaskRepositoryPort {

    /** Tarefa persistida com a versão do lock otimista e os carimbos do banco. */
    record StoredTask(TaskItem task, TaskBrief brief, long version, Instant createdAt, Instant updatedAt) {
    }

    /**
     * Linha leve do índice do Acervo (RF41.CA01/CA09): só o que os sub-filtros, a ordenação, os contadores e os alertas de prazo legal
     * precisam. O resto (briefing, descrição) só é lido para as tarefas da página.
     */
    record TaskIndexRow(UUID id, String title, TaskType type, TaskCategory category, Priority priority, TaskState state, LocalDate dueAt,
                        LocalDate legalDueAt, Instant createdAt, Instant updatedAt) {
    }

    Optional<StoredTask> findById(UUID id);

    /** Tarefas do dono, mais recentes primeiro. */
    List<StoredTask> findByOwner(UUID ownerId, int limit);

    /** Índice leve das tarefas do dono, mais recentes primeiro, até {@code cap} linhas. */
    List<TaskIndexRow> indexByOwner(UUID ownerId, int cap);

    /** Tarefas completas (com briefing) pelos ids; ordem livre — quem chama reordena. Id inexistente é ignorado. */
    List<StoredTask> findAllById(Collection<UUID> ids);

    /** Insere tarefa (id gerado pelo banco) e briefing; devolve o estado persistido. */
    StoredTask insert(TaskItem task, TaskBrief brief);

    /**
     * Atualiza tarefa e briefing numa transação, exigindo {@code expectedVersion} igual à versão atual e incrementando-a mesmo
     * quando só o briefing muda. Versão diferente → {@code OptimisticLockingFailureException} (409 EDICAO_CONCORRENTE).
     */
    StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion);

    void appendStateLog(TaskStateLog log);
}
