package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/** Mensagem direta — Cassandra {@code messages_by_conversation} (partição conversationId, TTL) — TAXONOMIA §12b.3. Sem IA, sem pontos, sem Memória. */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "messages_by_conversation", rfs = {"RF46"}, store = Store.CASSANDRA, audit = Audit.NONE,
        doc = "Cassandra: partição conversation_id, clustering sent_at DESC, TTL da política da empresa.")
public record DirectMessage(
        @Attr("TIMEUUID") UUID id,
        @Attr("conversa (partição)") UUID conversationId,
        @Attr("autor") UUID authorId,
        @Attr(value = "corpo em Markdown", sql = "TEXT") String bodyMd,
        @Attr(value = "cartões TASK/PROJECT anexados", opt = true) String attachmentsJson,
        @Attr(value = "atribuição referida (mensagem de sistema)", opt = true) UUID assignmentId,
        @Attr("enviada em (clustering)") Instant sentAt) {
}
