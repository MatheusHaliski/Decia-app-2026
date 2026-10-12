package br.gov.pr.secid.workstation.domain.decia;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.Store;

import java.time.Instant;
import java.util.UUID;

/**
 * Mensagem da sessão — Cassandra {@code messages_by_session} (partição sessionId, cluster sentAt, TTL) — TAXONOMIA §5.3 (RF6, RF7, RF42).
 * O índice leve em MySQL é {@link SessionMessageIndex}. Dados pessoais da pessoa anonimizada são limpos pelo job (D-18).
 */
@DomainEntity(context = "5 DECIA sessão", table = "messages_by_session", rfs = {"RF6", "RF7", "RF8", "RF11", "RF29", "RF42"},
        store = Store.CASSANDRA, audit = Audit.NONE,
        doc = "Cassandra: partição session_id, clustering sent_at DESC, TTL = DeciaSession.messageTtlDays.")
public record SessionMessage(
        @Attr("TIMEUUID") UUID id,
        @Attr("sessão (partição)") UUID sessionId,
        @Attr("autor") UUID authorId,
        @Attr("humano, IA ou sistema") AuthorKind authorKind,
        @Attr(value = "corpo em Markdown", sql = "TEXT") String bodyMd,
        @Attr(value = "resposta a", opt = true) UUID replyToMessageId,
        @Attr("enviada em (clustering)") Instant sentAt,
        @Attr(value = "editada em", opt = true) Instant editedAt,
        @Attr("apagada (soft)") boolean deleted,
        @Attr(value = "ids dos anexos (MessageAttachment)", opt = true) String attachmentsJson,
        @Attr(value = "classificação (RF7)", opt = true) UUID classificationId,
        @Attr(value = "hash de similaridade anti-repetição (RF42)", opt = true, len = 64) String similarityHash,
        @Attr(value = "correlação", opt = true, len = 64) String correlationId) {
}
