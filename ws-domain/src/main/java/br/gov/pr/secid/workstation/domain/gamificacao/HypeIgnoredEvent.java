package br.gov.pr.secid.workstation.domain.gamificacao;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;
import br.gov.pr.secid.workstation.domain.social.IgnoredReason;

import java.time.Instant;
import java.util.UUID;

/** Evento desconsiderado no Hype (RF45.CA03: não verificado, auto-interação, antifraude) — TAXONOMIA §9.10. APPEND-ONLY. */
@DomainEntity(context = "8 Gamificação", table = "hype_ignored_events", rfs = {"RF45"}, migration = 17, audit = Audit.NONE,
        doc = "Trilha de eventos ignorados (append-only; user RESTRICT).",
        indexes = {"user_id, at"})
public record HypeIgnoredEvent(
        @Attr("identificador") UUID id,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "tipo do evento", len = 60) String eventType,
        @Attr("id do evento") UUID eventId,
        @Attr("motivo") IgnoredReason reason,
        @Attr("momento") Instant at) {
}
