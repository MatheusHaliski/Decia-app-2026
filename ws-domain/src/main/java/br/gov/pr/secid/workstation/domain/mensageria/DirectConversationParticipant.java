package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Participante da conversa direta (RF46.CA06: sair = leftAt) — TAXONOMIA §12b.2. */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "direct_conversation_participants", rfs = {"RF46"}, migration = 20, audit = Audit.NONE,
        doc = "Participantes (filho → CASCADE; pessoa → CASCADE).",
        uniques = {"conversation_id, user_id"}, indexes = {"user_id, left_at"})
public record DirectConversationParticipant(
        @Attr("identificador") UUID id,
        @Attr(value = "conversa", ref = "direct_conversations", onDelete = OnDelete.CASCADE) UUID conversationId,
        @Attr(value = "pessoa", ref = "users", onDelete = OnDelete.CASCADE) UUID userId,
        @Attr("entrou em") Instant joinedAt,
        @Attr(value = "saiu/arquivou em", opt = true) Instant leftAt,
        @Attr(value = "última leitura", opt = true) Instant lastReadAt) {
}
