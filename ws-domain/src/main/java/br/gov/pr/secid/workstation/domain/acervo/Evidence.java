package br.gov.pr.secid.workstation.domain.acervo;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Anexo/evidência fotográfica (= FAI Photo) — TAXONOMIA §2.7 (RF41.CA06 estúdio). Geolocalização cifrada. */
@DomainEntity(context = "2 Acervo de Tarefas", table = "evidences", rfs = {"RF41", "RF20", "RF29"}, migration = 11, store = Store.MYSQL_S3,
        doc = "Evidências (fotos) do dono → CASCADE; vínculos a tarefa/projeto sobrevivem como SET NULL.",
        indexes = {"owner_id, taken_at", "linked_task_id", "linked_project_id"})
public record Evidence(
        @Attr("identificador") UUID id,
        @Attr(value = "dono", ref = "users", onDelete = OnDelete.CASCADE) UUID ownerId,
        @Attr(value = "objeto de mídia", ref = "media_objects", onDelete = OnDelete.RESTRICT) UUID mediaObjectId,
        @Attr(value = "data da captura", opt = true) Instant takenAt,
        @Attr(value = "latitude cifrada", opt = true, len = 512, encrypted = true) String latitude,
        @Attr(value = "longitude cifrada", opt = true, len = 512, encrypted = true) String longitude,
        @Attr(value = "legenda", opt = true, len = 500) String caption,
        @Attr(value = "tarefa vinculada", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID linkedTaskId,
        @Attr(value = "projeto vinculado", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID linkedProjectId,
        @Attr(value = "tratamento no estúdio", def = "'ORIGINAL'") StudioStatus studioStatus,
        @Attr(value = "tarefa derivada (OCR → documento)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID derivedTaskId) {
}
