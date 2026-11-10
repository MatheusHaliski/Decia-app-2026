package br.gov.pr.secid.workstation.application.connectors;

import br.gov.pr.secid.workstation.domain.connectors.TaskExternalLink;

import java.util.Optional;
import java.util.UUID;

/** Origem externa das tarefas importadas por conector ({@code task_external_links}, V61). Adaptador JPA: {@code JpaConnectorAdapters}. */
public interface TaskExternalLinkRepositoryPort {

    TaskExternalLink insert(TaskExternalLink link);

    Optional<TaskExternalLink> findByTask(UUID taskId);
}
