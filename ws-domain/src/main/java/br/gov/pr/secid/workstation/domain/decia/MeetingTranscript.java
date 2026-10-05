package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Transcrição da reunião (RF37) — TAXONOMIA §5.17; texto cifrado (AES-GCM). */
@DomainEntity(context = "5 DECIA sessão", table = "meeting_transcripts", rfs = {"RF37"}, migration = 14,
        doc = "Transcrição (uma por reunião, filho → CASCADE). Texto cifrado.",
        indexes = {})
public record MeetingTranscript(
        @Attr("identificador") UUID id,
        @Attr(value = "reunião", ref = "meetings", onDelete = OnDelete.CASCADE, unique = true) UUID meetingId,
        @Attr(value = "texto cifrado", sql = "LONGTEXT", encrypted = true) String text,
        @Attr(value = "trechos [{speaker, start, end, classLabel}]", opt = true) String segmentsJson,
        @Attr(value = "idioma", len = 10, def = "'pt-BR'") String language,
        @Attr(value = "provedor de transcrição", opt = true, len = 40) String provider) {
}
