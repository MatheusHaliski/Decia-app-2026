package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Reunião / Ata Viva (RF37) — TAXONOMIA §5.16; áudio apagado após transcrição (política da empresa); ratificação em 48 h. */
@DomainEntity(context = "5 DECIA sessão", table = "meetings", rfs = {"RF37", "RF29", "RF42"}, migration = 14, versioned = true,
        doc = "Reuniões gravadas/transcritas. Organizador RESTRICT; sessão/projeto/ata SET NULL.",
        indexes = {"organizer_id, started_at", "session_id", "project_id", "status"})
public record Meeting(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", opt = true, ref = "decia_sessions", onDelete = OnDelete.SET_NULL) UUID sessionId,
        @Attr(value = "projeto", opt = true, ref = "project_schemes", onDelete = OnDelete.SET_NULL) UUID projectId,
        @Attr(value = "organizador", ref = "users", onDelete = OnDelete.RESTRICT) UUID organizerId,
        @Attr(value = "título", len = 200) String title,
        @Attr("início") Instant startedAt,
        @Attr(value = "fim", opt = true) Instant endedAt,
        @Attr("origem") MeetingSource source,
        @Attr(value = "áudio temporário", opt = true, ref = "media_objects", onDelete = OnDelete.SET_NULL) UUID audioMediaId,
        @Attr(value = "estado", def = "'GRAVANDO'") MeetingStatus status,
        @Attr(value = "ATA_REGISTRO gerada", opt = true, ref = "tasks", onDelete = OnDelete.SET_NULL) UUID minutesTaskId,
        @Attr(value = "encaminhamentos (ids de tarefas)", opt = true) String followUpTaskIdsJson,
        @Attr(value = "prazo de ratificação (48 h)", opt = true) Instant ratificationDeadlineAt,
        @Attr(value = "inferência", opt = true, ref = "ai_inference_log", onDelete = OnDelete.SET_NULL) UUID aiInferenceId) {
}
