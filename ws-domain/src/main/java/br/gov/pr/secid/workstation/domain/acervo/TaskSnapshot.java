package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;

/** Cópia congelada da tarefa embutida em {@code project_tasks.snapshot_json} (RF23.CA03, Q-31): o projeto continua legível se a tarefa sumir. */
@DomainEntity(context = "2 Acervo de Tarefas", rfs = {"RF23", "RF21", "RF29"}, store = Store.CODE,
        doc = "Valor embutido (JSON) em ProjectTask.snapshotJson e MessageAttachment.snapshotJson.")
public record TaskSnapshot(
        @Attr(value = "título", len = 200) String title,
        @Attr("tipo") TaskType type,
        @Attr(value = "categoria", opt = true) TaskCategory category,
        @Attr(value = "miniatura", opt = true, len = 500) String thumbnailUrl,
        @Attr(value = "resumo", opt = true, sql = "TEXT") String summary,
        @Attr(value = "nome do dono no momento", len = 160) String ownerName,
        @Attr("quando foi capturado") Instant capturedAt) {

    public static TaskSnapshot of(TaskItem task, String ownerName, Instant at) {
        return new TaskSnapshot(task.title(), task.type(), task.category(), task.thumbnailUrl(), task.summary(), ownerName, at);
    }
}
