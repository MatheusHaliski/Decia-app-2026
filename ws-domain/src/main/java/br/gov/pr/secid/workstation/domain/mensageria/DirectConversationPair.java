package br.gov.pr.secid.workstation.domain.mensageria;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.Audit;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/**
 * Uma só conversa 1:1 por par de pessoas (RF46; Onda 7, V59): a chave é {@code menorId:maiorId}. Iniciar uma conversa direta com quem já
 * tem uma reaproveita a existente, inclusive sob corrida (a chave primária decide quem fica).
 */
@DomainEntity(context = "12b Mensageria & Atribuição", table = "direct_conversation_pairs", rfs = {"RF46"}, migration = 59, audit = Audit.CREATED,
        pk = "pair_key", doc = "Uma conversa DIRETA por par de pessoas (chave menorId:maiorId). Some com a conversa.",
        uniques = {"conversation_id"})
public record DirectConversationPair(
        @Attr(value = "par (menorId:maiorId)", len = 80) String pairKey,
        @Attr(value = "conversa DIRETA", ref = "direct_conversations", onDelete = OnDelete.CASCADE) UUID conversationId) {
}
