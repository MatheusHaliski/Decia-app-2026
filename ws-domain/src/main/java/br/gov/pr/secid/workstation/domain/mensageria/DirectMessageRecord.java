package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.time.Instant;
import java.util.UUID;

/**
 * Mensagem direta guardada em MySQL (RF46; Onda 7, V59) — o equivalente relacional de {@link DirectMessage} enquanto o Cassandra fica
 * desligado ({@code ws.cassandra.enabled=false}). Texto puro (nunca HTML), cifrado em repouso; apagar ou anonimizar zera o texto e deixa a
 * marca {@code deletedAt} ("mensagem removida"). {@code sentAt} é estritamente crescente por conversa (reservado sob o lock da conversa) e
 * serve de cursor; {@code changedAt} muda a cada envio, edição ou remoção e alimenta a leitura incremental ({@code since}).
 */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "direct_messages", rfs = {"RF46"}, migration = 59, audit = Audit.NONE,
        doc = "Mensagens diretas em MySQL (fallback do Cassandra). Texto cifrado; apagar zera o texto e marca deleted_at. Some com a conversa.",
        indexes = {"conversation_id, sent_at", "conversation_id, changed_at", "author_id"})
public record DirectMessageRecord(
        @Attr("identificador") UUID id,
        @Attr(value = "conversa", ref = "direct_conversations", onDelete = OnDelete.CASCADE) UUID conversationId,
        @Attr(value = "autor", ref = "users", onDelete = OnDelete.CASCADE) UUID authorId,
        @Attr(value = "texto cifrado (nulo quando apagada)", opt = true, sql = "TEXT", encrypted = true) String body,
        @Attr("enviada em (cursor; crescente por conversa)") Instant sentAt,
        @Attr(value = "editada em", opt = true) Instant editedAt,
        @Attr(value = "apagada em (texto zerado)", opt = true) Instant deletedAt,
        @Attr("última mudança (envio, edição ou remoção)") Instant changedAt) {

    public boolean deleted() {
        return deletedAt != null;
    }
}
