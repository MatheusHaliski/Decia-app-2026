package br.gov.pr.secid.workstation.application.acervo;

import br.gov.pr.secid.workstation.domain.acervo.TaskItem;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Varredura do aviso diário de prazo (RF41.CA04, {@link DeadlineReminderJob}): tarefas ABERTAS (rascunho, disponível, em uso, bloqueada)
 * com prazo da tarefa ({@code due_at}) ou prazo legal ({@code legal_due_at}) entre {@code from} e {@code to}, inclusive, em ordem de id
 * (paginação por chave: {@code afterId} nulo = do começo). Adaptador JPA em persistence-mysql.
 */
public interface DeadlineScanPort {

    List<TaskItem> openWithDeadlineBetween(LocalDate from, LocalDate to, UUID afterId, int limit);
}
