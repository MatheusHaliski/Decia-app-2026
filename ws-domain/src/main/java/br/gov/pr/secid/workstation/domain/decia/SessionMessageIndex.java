package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Índice MySQL das mensagens (D-05): integridade com sessão/autor/classificação e exportação (RF17, RF18). */
@DomainEntity(context = "5 DECIA sessão", table = "session_messages_idx", rfs = {"RF6", "RF7", "RF17", "RF18", "RF42"}, migration = 14, audit = Audit.NONE,
        doc = "Índice leve das mensagens do Cassandra (id = TIMEUUID). Filho da sessão → CASCADE; autor RESTRICT (trilha).",
        indexes = {"session_id, sent_at", "author_id, sent_at"})
public record SessionMessageIndex(
        @Attr("TIMEUUID da mensagem") UUID id,
        @Attr(value = "sessão", ref = "decia_sessions", onDelete = OnDelete.CASCADE) UUID sessionId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.RESTRICT) UUID authorId,
        @Attr("humano, IA ou sistema") AuthorKind authorKind,
        @Attr("enviada em") Instant sentAt,
        @Attr(value = "classificação", opt = true, ref = "message_classifications", onDelete = OnDelete.SET_NULL) UUID classificationId) {
}
