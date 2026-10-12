package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/** Conversa direta/grupo do Work Station (RF46.CA01) — TAXONOMIA §12b.1; participantes sempre da mesma empresa. */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "direct_conversations", rfs = {"RF46", "RF10"}, migration = 20,
        doc = "Conversas (sem IA, sem pontos, sem índice). Empresa e criador RESTRICT.",
        indexes = {"company_id, last_message_at"})
public record DirectConversation(
        @Attr("identificador") UUID id,
        @Attr(value = "empresa", ref = "companies", onDelete = OnDelete.RESTRICT) UUID companyId,
        @Attr(value = "tipo", def = "'DIRETA'") ConversationKind kind,
        @Attr(value = "título (grupo)", opt = true, len = 160) String title,
        @Attr(value = "criador", ref = "users", onDelete = OnDelete.RESTRICT) UUID createdBy,
        @Attr(value = "última mensagem em", opt = true) Instant lastMessageAt,
        @Attr(value = "TTL das mensagens (dias; de Company.messagingPolicyJson)", opt = true, col = "messaging_ttl_days") Integer messagingPolicy) {
}
