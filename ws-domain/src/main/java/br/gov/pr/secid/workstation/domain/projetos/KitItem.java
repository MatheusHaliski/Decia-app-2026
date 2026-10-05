package br.gov.pr.secid.workstation.domain.projetos;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Item do Kit de Processo — TAXONOMIA §3.11. */
@DomainEntity(context = "3 Criador de Projetos", table = "kit_items", rfs = {"RF21", "RF40"}, migration = 12, audit = Audit.CREATED,
        doc = "Tarefas que compõem o kit. Filho do kit e da tarefa → CASCADE.",
        uniques = {"kit_id, task_id"})
public record KitItem(
        @Attr("identificador") UUID id,
        @Attr(value = "kit", ref = "process_kits", onDelete = OnDelete.CASCADE) UUID kitId,
        @Attr(value = "tarefa", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr(value = "fase sugerida", opt = true) ProjectPhase phase,
        @Attr("ordem") int sortOrder,
        @Attr("opcional") boolean optional) {
}
