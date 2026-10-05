package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Versão sincronizada de item vinculado Google/Microsoft (RF20.CA07) — TAXONOMIA §2.3. */
@DomainEntity(context = "2 Acervo de Tarefas", table = "task_versions", rfs = {"RF20", "RF41"}, migration = 11, audit = Audit.CREATED,
        doc = "Versões externas de itens VINCULADO. Filho da tarefa → CASCADE.",
        uniques = {"task_id, version_number"})
public record TaskVersion(
        @Attr("identificador") UUID id,
        @Attr(value = "tarefa", ref = "tasks", onDelete = OnDelete.CASCADE) UUID taskId,
        @Attr("número sequencial") int versionNumber,
        @Attr(value = "revisão externa (Drive/Graph)", opt = true, len = 200) String externalRevisionId,
        @Attr("sincronizada em") Instant syncedAt,
        @Attr(value = "miniatura", opt = true, len = 500) String thumbnailUrl,
        @Attr(value = "resumo da mudança", opt = true, len = 500) String changeSummary,
        @Attr(value = "snapshot do arquivo", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID snapshotMediaId) {
}
