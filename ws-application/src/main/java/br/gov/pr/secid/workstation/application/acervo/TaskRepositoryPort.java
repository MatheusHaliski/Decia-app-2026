package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskBrief;
import br.gov.pr.secid.workstation.domain.acervo.TaskItem;
import br.gov.pr.secid.workstation.domain.acervo.TaskStateLog;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Acesso às tarefas ({@code tasks} + {@code task_briefs} + {@code task_state_log}); adaptador JPA em persistence-mysql. */
public interface TaskRepositoryPort {

    /** Tarefa persistida com a versão do lock otimista e os carimbos do banco. */
    record StoredTask(TaskItem task, TaskBrief brief, long version, Instant createdAt, Instant updatedAt) {
    }

    Optional<StoredTask> findById(UUID id);

    /** Tarefas do dono, mais recentes primeiro. */
    List<StoredTask> findByOwner(UUID ownerId, int limit);

    /** Insere tarefa (id gerado pelo banco) e briefing; devolve o estado persistido. */
    StoredTask insert(TaskItem task, TaskBrief brief);

    /**
     * Atualiza tarefa e briefing numa transação, exigindo {@code expectedVersion} igual à versão atual e incrementando-a mesmo
     * quando só o briefing muda. Versão diferente → {@code OptimisticLockingFailureException} (409 EDICAO_CONCORRENTE).
     */
    StoredTask update(TaskItem task, TaskBrief brief, long expectedVersion);

    void appendStateLog(TaskStateLog log);
}
