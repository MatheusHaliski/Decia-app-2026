package br.gov.pr.secid.workstation.application.messaging;

import br.gov.pr.secid.workstation.domain.mensageria.ConversationKind;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversation;
import br.gov.pr.secid.workstation.domain.mensageria.DirectConversationParticipant;
import br.gov.pr.secid.workstation.domain.mensageria.DirectMessageRecord;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Acesso às conversas diretas (RF46): {@code direct_conversations} e {@code direct_conversation_participants} (V20), {@code direct_messages}
 * e {@code direct_conversation_pairs} (V59). Adaptador JPA em persistence-mysql; fake em memória nos testes. Os carimbos chegam truncados
 * em microssegundos (precisão do TIMESTAMP(6)).
 */
public interface ConversationRepositoryPort {

    /** Conversa com o carimbo de criação do banco. */
    record StoredConversation(DirectConversation conversation, Instant createdAt) {
        /** Atividade: última mensagem, ou a criação quando ainda não há mensagem. */
        public Instant lastActivityAt() {
            return conversation.lastMessageAt() != null ? conversation.lastMessageAt() : createdAt;
        }
    }

    /** Totais de não lidas da pessoa: conversas com alguma não lida e mensagens não lidas. */
    record UnreadTotals(long conversations, long messages) {
    }

    // ------------------------------------------------------------------------------------------------ conversas

    /** Cria a conversa e um participante por pessoa (entrada em {@code at}); devolve com o id gerado. */
    StoredConversation create(UUID companyId, ConversationKind kind, String title, UUID createdBy, List<UUID> participantIds, Instant at);

    Optional<StoredConversation> findById(UUID id);

    /** Remove a conversa (participantes e mensagens vão junto) — só para desfazer a criação que perdeu a corrida do par. */
    void delete(UUID id);

    /**
     * Conversa DIRETA já registrada para o par. {@code latest} = leitura com trava (enxerga o que outra transação acabou de confirmar);
     * sem ela, a leitura consistente da transação.
     */
    Optional<UUID> pairConversation(String pairKey, boolean latest);

    /** Registra o par da conversa DIRETA; {@code false} se o par já tinha outra conversa (sem erro, sem sobrescrever). */
    boolean claimPair(String pairKey, UUID conversationId);

    /**
     * Reserva o carimbo da próxima mensagem sob a trava da linha da conversa: {@code max(now, última + 1 µs)}, gravado em
     * {@code last_message_at}. Assim {@code sentAt} é único e crescente por conversa e serve de cursor.
     */
    Instant reserveSentAt(UUID conversationId, Instant now);

    /** Conversas em que a pessoa está (não saiu), por atividade, mais recentes primeiro. */
    List<StoredConversation> activeOf(UUID userId, int limit);

    // ------------------------------------------------------------------------------------------------ participantes

    List<DirectConversationParticipant> participants(Collection<UUID> conversationIds);

    Optional<DirectConversationParticipant> participant(UUID conversationId, UUID userId);

    /** Atualiza leitura ({@code lastReadAt}) e saída ({@code leftAt}) de um participante existente. */
    void saveParticipant(DirectConversationParticipant participant);

    // ------------------------------------------------------------------------------------------------ mensagens

    void insertMessage(DirectMessageRecord message);

    Optional<DirectMessageRecord> findMessage(UUID id);

    /** Regrava texto e marcas (edição, remoção). */
    void updateMessage(DirectMessageRecord message);

    /** Página por cursor: {@code sentAt < before} (nulo = do fim), mais recentes primeiro. */
    List<DirectMessageRecord> page(UUID conversationId, Instant before, int limit);

    /** Mudanças (envio, edição, remoção) com {@code changedAt > since}, na ordem em que aconteceram. */
    List<DirectMessageRecord> changedSince(UUID conversationId, Instant since, int limit);

    /** A mensagem mais recente de cada conversa (apagada inclusive). */
    Map<UUID, DirectMessageRecord> lastMessages(Collection<UUID> conversationIds);

    /** Não lidas da pessoa por conversa: de outras pessoas, não apagadas, depois da última leitura (ou da entrada). Ausente = 0. */
    Map<UUID, Long> unreadCounts(UUID userId, Collection<UUID> conversationIds);

    UnreadTotals unreadTotals(UUID userId);

    // ------------------------------------------------------------------------------------------------ notificações agrupadas

    /** Há notificação MENSAGEM_DIRETA não lida para o destinatário, do mesmo remetente, com esta chave de grupo? */
    boolean hasUnreadMessageNotification(UUID recipientId, UUID actorId, String groupKey);

    /** Marca como lidas as notificações MENSAGEM_DIRETA do destinatário com esta chave de grupo; devolve quantas mudaram. */
    int markMessageNotificationsRead(UUID recipientId, String groupKey, Instant at);

    // ------------------------------------------------------------------------------------------------ anonimização

    /** Zera o texto de todas as mensagens da pessoa (marca apagada); devolve quantas mudaram. */
    int eraseMessagesOf(UUID authorId, Instant at);

    /** Tira a pessoa de todas as conversas em que ainda está; devolve quantas. */
    int leaveAll(UUID userId, Instant at);
}
