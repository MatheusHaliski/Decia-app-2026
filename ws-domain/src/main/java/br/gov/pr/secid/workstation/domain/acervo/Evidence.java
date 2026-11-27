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
        @Attr(value = "tarefa derivada (OCR → documento)", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID derivedTaskId,
        @Attr(value = "família do formato, pelo tipo REAL detectado (V71)", opt = true) FormatFamily formatFamily,
        @Attr(value = "variante do formato, pelo tipo REAL detectado", opt = true, len = 10) String formatVariant,
        @Attr(value = "detalhes extraídos pelo servidor (páginas, dimensões, abas…)", opt = true) String formatDetailsJson,
        @Attr(value = "SHA-256 do arquivo como recebido, herdado do anexo (V73)", opt = true, sql = "CHAR(64)") String originalSha256,
        @Attr(value = "quem enviou o arquivo, herdado do anexo (V73)", opt = true, ref = "users", onDelete = OnDelete.SET_NULL) UUID uploadedBy,
        @Attr(value = "canal de entrada, herdado do anexo (V73)", opt = true) UploadChannel uploadedVia,
        @Attr(value = "metadados de captura do EXIF, JSON cifrado, herdados do anexo (V73)", opt = true, sql = "TEXT", encrypted = true)
        String captureMetadata) {

    /** Evidência sem proveniência (linhas anteriores à V73 e testes). */
    public Evidence(UUID id, UUID ownerId, UUID mediaObjectId, Instant takenAt, String latitude, String longitude, String caption,
                    UUID linkedTaskId, UUID linkedProjectId, StudioStatus studioStatus, UUID derivedTaskId, FormatFamily formatFamily,
                    String formatVariant, String formatDetailsJson) {
        this(id, ownerId, mediaObjectId, takenAt, latitude, longitude, caption, linkedTaskId, linkedProjectId, studioStatus, derivedTaskId,
                formatFamily, formatVariant, formatDetailsJson, null, null, null, null);
    }
}
