package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/** Item do acervo anexado à mensagem (RF29.CA03, ≤ 5) — TAXONOMIA §5.5; usado na decisão dá crédito +6 DP (RF42). */
@DomainEntity(context = "5 DECIA sessão", table = "message_attachments", rfs = {"RF29", "RF42", "RF6"}, migration = 14, audit = Audit.CREATED,
        doc = "Anexos do acervo nas mensagens (alvo polimórfico com snapshot). Filho da sessão → CASCADE.",
        indexes = {"message_id", "target_type, target_id"})
public record MessageAttachment(
        @Attr("identificador") UUID id,
        @Attr("mensagem (TIMEUUID)") UUID messageId,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr("tipo do alvo") AttachmentTargetType targetType,
        @Attr("id do alvo") UUID targetId,
        @Attr(value = "snapshot do alvo", opt = true) String snapshotJson,
        @Attr("usado na decisão (crédito +6 DP)") boolean usedInDecision) {

    public static final int MAX_PER_MESSAGE = 5;
}
