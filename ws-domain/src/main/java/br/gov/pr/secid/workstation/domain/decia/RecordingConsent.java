package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Consentimento de gravação por reunião e participante (RF37.CA05) — TAXONOMIA §5.18. Prova: RESTRICT em users. */
@DomainEntity(context = "5 DECIA sessão", table = "recording_consents", rfs = {"RF37", "RF3"}, migration = 14, audit = Audit.NONE,
        doc = "Consentimento por reunião (filho → CASCADE); user_id RESTRICT (prova de consentimento, LGPD).",
        uniques = {"meeting_id, user_id"})
public record RecordingConsent(
        @Attr("identificador") UUID id,
        @Attr(value = "reunião", ref = "meetings", onDelete = OnDelete.CASCADE) UUID meetingId,
        @Attr(value = "participante", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr("consentiu") boolean consented,
        @Attr("momento") Instant at,
        @Attr(value = "IP", opt = true, len = 45) String ip) {
}
