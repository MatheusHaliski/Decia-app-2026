package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Participante da sessão (grupo da conversa, HU5) — TAXONOMIA §5.2 (RF5, RF9, RF10 canReplyDivergence). */
@DomainEntity(context = "5 DECIA sessão", table = "session_participants", rfs = {"RF5", "RF9", "RF10", "RF42"}, migration = 14, audit = Audit.CREATED,
        doc = "Participantes por sessão (filho → CASCADE). user_id RESTRICT: presença é trilha deliberativa (pontos RF42).",
        uniques = {"session_id, user_id"}, indexes = {"user_id, left_at"})
public record SessionParticipant(
        @Attr("identificador") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr(value = "participante", ref = "users", onDelete = OnDelete.RESTRICT) UUID userId,
        @Attr(value = "papel", def = "'MEMBRO'") ParticipantRole role,
        @Attr("entrou em") Instant joinedAt,
        @Attr(value = "saiu em", opt = true) Instant leftAt,
        @Attr(value = "adicionado por", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID addedBy,
        @Attr(value = "removido por", opt = true, ref = "users", onDelete = OnDelete.RESTRICT) UUID removedBy,
        @Attr(value = "motivo da remoção", opt = true, len = 300) String removeReason,
        @Attr("pode responder divergências (RF10)") boolean canReplyDivergence,
        @Attr(value = "última leitura", opt = true) Instant lastReadAt) {

    public boolean isActive() {
        return leftAt == null;
    }
}
