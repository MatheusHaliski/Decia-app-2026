package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Dependência entre tarefas do projeto (CPM, RF21.CA08) — TAXONOMIA §3.3. Sem ciclos (422). */
@DomainEntity(context = "3 Criador de Projetos", table = "project_task_dependencies", rfs = {"RF21", "RF43"}, migration = 12, audit = Audit.CREATED,
        doc = "Arestas do grafo de precedência. Filho do projeto e das duas tarefas → CASCADE.",
        uniques = {"predecessor_project_task_id, successor_project_task_id"}, indexes = {"project_id"},
        checks = {"predecessor_project_task_id <> successor_project_task_id"})
public record ProjectTaskDependency(
        @Attr("identificador") UUID id,
        @Attr(value = "projeto", ref = "project_schemes", onDelete = OnDelete.CASCADE) UUID projectId,
        @Attr(value = "predecessora", ref = "project_tasks", onDelete = OnDelete.CASCADE) UUID predecessorProjectTaskId,
        @Attr(value = "sucessora", ref = "project_tasks", onDelete = OnDelete.CASCADE) UUID successorProjectTaskId,
        @Attr(value = "tipo", def = "'FS'") DependencyType type,
        @Attr("defasagem em dias") int lagDays) {

    public ProjectTaskDependency {
        if (predecessorProjectTaskId.equals(successorProjectTaskId)) {
            throw new IllegalArgumentException("VALIDACAO: tarefa não pode depender de si mesma");
        }
    }
}
